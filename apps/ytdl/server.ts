import { randomUUID } from 'crypto';
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import {
  inferAsyncReturnType,
  inferProcedureInput,
  inferProcedureOutput,
  inferRouterOutputs,
  initTRPC,
} from '@trpc/server';
import { z } from 'zod';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import Queue from 'bull';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { eq, desc } from 'drizzle-orm';
import { VpnDownloadManager, DownloadResult } from './vpn-download-manager';
import { extractVpnLogData, formatVpnSummary } from './vpn-logger';
import { metricsTracker } from './metrics-tracker';

// Database schema for generationLogs table
const generationLogs = pgTable(
  'generationLogs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId'),
    source: text('source').notNull().default('web'),
    videoUrl: text('videoUrl').notNull(),
    start: numeric('start').notNull(),
    end: numeric('end').notNull(),
    status: text('status').notNull(),
    errorMessage: text('errorMessage'),
    taskId: text('taskId'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    completedAt: timestamp('completedAt'),
    // VPN tracking fields
    vpnAttempts: numeric('vpnAttempts').default('0'),
    vpnProxiesTried: text('vpnProxiesTried').array(),
    vpnProxiesFailed: text('vpnProxiesFailed').array(),
    vpnProxySuccess: text('vpnProxySuccess'),
    vpnIpAddress: text('vpnIpAddress'),
    vpnLocation: text('vpnLocation'),
  },
  (logs) => ({
    userIdIndex: index('generation_logs_userId_idx').on(logs.userId),
    createdAtIndex: index('generation_logs_createdAt_idx').on(logs.createdAt),
    statusIndex: index('generation_logs_status_idx').on(logs.status),
    vpnSuccessIndex: index('generation_logs_vpn_success_idx').on(
      logs.vpnProxySuccess,
    ),
  }),
);

// Initialize database connection (DATABASE_URL comes from environment)
let db: ReturnType<typeof drizzle> | null = null;
if (process.env.DATABASE_URL) {
  const queryClient = postgres(process.env.DATABASE_URL);
  db = drizzle(queryClient);
  console.log('✅ Connected to database for logging');
} else {
  console.warn('⚠️  DATABASE_URL not set - running without database logging');
}

// Initialize VPN Download Manager -- dispatches to remote workers
const WORKER_ENDPOINTS = (process.env.WORKER_ENDPOINTS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);
const downloadManager = new VpnDownloadManager([], 'media-output');

/**
 * Check VPN connection status by querying all worker /health endpoints.
 * Workers run behind gluetun and report their VPN IP via gluetun's control server.
 */
async function checkVpnConnectionStatus(): Promise<
  Array<{
    proxy: string;
    connected: boolean;
    ip: string | null;
    location: string | null;
    responseTimeMs: number | null;
    error?: string;
  }>
> {
  if (WORKER_ENDPOINTS.length === 0) {
    return [{ proxy: 'no workers configured', connected: false, ip: null, location: null, responseTimeMs: null }];
  }

  const results = await Promise.all(
    WORKER_ENDPOINTS.map(async (endpoint, idx) => {
      const startTime = Date.now();
      const workerId = `worker-${idx + 1}`;
      try {
        const response = await fetch(`http://${endpoint}/health`, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          const vpn = data.vpn || {};
          const ip = vpn.public_ip || null;
          const location = vpn.country
            ? `${vpn.country}, ${vpn.region || ''}, ${vpn.city || ''}`
                .replace(/, ,/g, ',')
                .replace(/,$/, '')
            : null;
          const vpnStatus = data.vpnStatus?.status || 'unknown';
          return {
            proxy: `${workerId} (${endpoint})`,
            connected: !!ip && vpnStatus === 'running',
            ip,
            location,
            responseTimeMs: Date.now() - startTime,
          };
        }

        return {
          proxy: `${workerId} (${endpoint})`,
          connected: false,
          ip: null,
          location: null,
          responseTimeMs: Date.now() - startTime,
          error: `Worker returned ${response.status}`,
        };
      } catch (error) {
        return {
          proxy: `${workerId} (${endpoint})`,
          connected: false,
          ip: null,
          location: null,
          responseTimeMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
  );

  return results;
}

const app = express();

// Parse JSON bodies before authentication middleware
app.use(express.json());

// Enable CORS for both local and production
const allowedOrigins = [
  'http://localhost:3000',
  'https://www.hermitcraft-horns.com',
  'https://hermitcraft-horns.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

// CRITICAL: Log EVERY request FIRST, before auth, before anything
app.use(
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Only log tRPC requests (skip health checks, static files, etc.)
    if (!req.path.startsWith('/trpc/')) {
      return next();
    }

    console.log('📨 INCOMING REQUEST:');
    console.log('   Path:', req.path);
    console.log('   Method:', req.method);
    console.log('   Origin:', req.headers['origin'] || 'none');
    console.log('   User-Agent:', req.headers['user-agent'] || 'none');
    console.log('   Body:', JSON.stringify(req.body).substring(0, 500)); // Limit body log length

    // Try to extract tRPC input and log to database immediately
    if (db && req.path.includes('/enqueueTask')) {
      try {
        let requestData: any = {};

        // The Next.js app sends a raw JSON body (not standard tRPC format)
        // Handle both direct JSON and tRPC formatted bodies
        if (req.body) {
          // Check if it's tRPC format with "json" wrapper
          if (req.body.json) {
            requestData = req.body.json;
          }
          // Check if it's tRPC batch format
          else if (req.body['0']?.json) {
            requestData = req.body['0'].json;
          }
          // Otherwise it's direct JSON
          else {
            requestData = req.body;
          }
        }

        // Extract fields - they should be at the top level since Next.js sends raw JSON
        const videoUrl = requestData.videoUrl || 'N/A';
        const start = requestData.start || requestData.startTime || 0;
        const end = requestData.end || requestData.endTime || 0;
        const userId = requestData.userId || null;
        const source = requestData.source || 'unknown';

        // Log to database IMMEDIATELY with 'received' status
        const [log] = await db
          .insert(generationLogs)
          .values({
            userId,
            source,
            videoUrl,
            start: start.toString(),
            end: end.toString(),
            status: 'received', // New status to indicate we received the request
          })
          .returning();

        // Store log ID in request object for later updates
        (req as any).logId = log?.id;

        console.log(
          `✅ Logged request to database (logId: ${log?.id}, source: ${source})`,
        );
      } catch (error) {
        console.error('❌ Error logging request to database:', error);
        console.error('   Error details:', error);
        console.error(
          '   Request body:',
          JSON.stringify(req.body).substring(0, 500),
        );
        // Don't fail the request if logging fails - continue anyway
      }
    }

    next();
  },
);

// API Key authentication middleware
const authenticateApiKey = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const rawApiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const apiKey =
    typeof rawApiKey === 'string'
      ? rawApiKey.startsWith('Bearer ')
        ? rawApiKey.replace('Bearer ', '')
        : rawApiKey
      : undefined;
  const validApiKey = process.env.YTDL_INTERNAL_API_KEY;

  // Log ALL incoming requests for debugging
  console.log('🔐 Authentication Check:');
  console.log('   Path:', req.path);
  console.log('   Method:', req.method);
  console.log('   API Key Provided:', !!apiKey);
  console.log('   API Key Length:', apiKey?.length || 0);
  console.log(
    '   API Key Preview:',
    apiKey
      ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
      : 'NONE',
  );
  console.log(
    '   Valid Key Expected:',
    validApiKey
      ? `${validApiKey.substring(0, 8)}...${validApiKey.substring(validApiKey.length - 4)}`
      : 'NOT SET',
  );
  console.log('   Keys Match:', apiKey === validApiKey);

  const origin = Array.isArray(req.headers['origin'])
    ? req.headers['origin'][0]
    : req.headers['origin'];
  const userAgent = Array.isArray(req.headers['user-agent'])
    ? req.headers['user-agent'][0]
    : req.headers['user-agent'];

  console.log(
    '   Headers:',
    JSON.stringify({
      'content-type': req.headers['content-type'],
      'x-api-key': apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
      authorization: req.headers['authorization'] ? 'PROVIDED' : 'MISSING',
      origin: origin,
      'user-agent': userAgent,
    }),
  );

  if (!validApiKey) {
    console.warn(
      '⚠️  YTDL_INTERNAL_API_KEY not set - running without authentication!',
    );
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    console.error('❌ Authentication FAILED - Invalid or missing API key');

    // Build detailed error message with full diagnostics
    const providedKeyPreview = apiKey
      ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
      : 'NONE';
    const expectedKeyPreview = validApiKey
      ? `${validApiKey.substring(0, 8)}...${validApiKey.substring(validApiKey.length - 4)}`
      : 'NOT SET';
    const origin = Array.isArray(req.headers['origin'])
      ? req.headers['origin'][0]
      : req.headers['origin'];

    const detailedError = [
      apiKey ? 'Auth failed: Invalid API key' : 'Auth failed: Missing API key',
      `Provided: ${providedKeyPreview} (len: ${apiKey?.length || 0})`,
      `Expected: ${expectedKeyPreview} (len: ${validApiKey?.length || 0})`,
      `Origin: ${origin || 'none'}`,
      `Path: ${req.path}`,
      `Method: ${req.method}`,
    ].join(' | ');

    // Update existing log entry if available, otherwise create new one
    if (db) {
      try {
        const logId = (req as any).logId;

        if (logId) {
          // Update existing log entry
          await db
            .update(generationLogs)
            .set({
              status: 'failed',
              errorMessage: detailedError,
              completedAt: new Date(),
            })
            .where(eq(generationLogs.id, logId));
          console.log(
            `📝 Updated existing log with auth failure (logId: ${logId})`,
          );
        } else {
          // Fallback: create new log entry
          let requestInfo: any = {};
          if (req.body) {
            requestInfo =
              typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          }

          await db.insert(generationLogs).values({
            userId: requestInfo.userId || null,
            source: requestInfo.source || 'unknown',
            videoUrl: requestInfo.videoUrl || 'N/A',
            start: requestInfo.start?.toString() || '0',
            end: requestInfo.end?.toString() || '0',
            status: 'failed',
            errorMessage: detailedError,
            completedAt: new Date(),
          });
          console.log('📝 Created new log for auth failure (no logId found)');
        }
      } catch (error) {
        console.error('Error logging rejected request:', error);
      }
    }

    return res
      .status(401)
      .json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  console.log('✅ Authentication PASSED');
  next();
};

const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({
  req,
  res,
});

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

// Create a queue for video processing tasks
console.log('🔧 Creating Bull queue...');
const videoProcessingQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    removeOnComplete: false, // Keep completed jobs so frontend can retrieve results
    removeOnFail: false, // Keep failed jobs for debugging
    attempts: 1, // Don't retry failed jobs (VPN retry logic is inside the job)
  },
});
console.log('✅ Bull queue created');

// Output a success or failure message on connecting to Redis
videoProcessingQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

videoProcessingQueue.on('ready', () => {
  console.log('✅ Queue connected to Redis');
});

videoProcessingQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} became active`);
});

videoProcessingQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

videoProcessingQueue.on('failed', (job, err) => {
  console.log(`❌ Job ${job?.id} failed:`, err?.message);
});

const appRouter = t.router({
  enqueueTask: t.procedure
    .input(
      z.object({
        videoUrl: z.string(),
        start: z.number(),
        end: z.number(),
        userId: z.string().optional(),
        source: z.enum(['web', 'cli']).default('cli'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { videoUrl, start, end, userId, source } = input;
      console.log('Received enqueueTask request with input:', input);

      // Get existing logId from request (set by logging middleware)
      let logId: string | undefined = (ctx.req as any).logId;

      try {
        // Update existing log to 'initiated' status, or create new one if not found
        if (db) {
          try {
            if (logId) {
              // Update existing log
              await db
                .update(generationLogs)
                .set({ status: 'initiated' })
                .where(eq(generationLogs.id, logId));
              console.log(`📝 Updated log to 'initiated' (logId: ${logId})`);
            } else {
              // Fallback: create new log if somehow we don't have logId
              const [log] = await db
                .insert(generationLogs)
                .values({
                  userId: userId || null,
                  source,
                  videoUrl,
                  start: start.toString(),
                  end: end.toString(),
                  status: 'initiated',
                })
                .returning();
              logId = log?.id;
              console.log(`📝 Created new log (logId: ${logId})`);
            }
          } catch (error) {
            console.error('Error updating/creating log:', error);
            // Don't fail the request if logging fails
          }
        }

        console.log('Enqueueing task...');
        const jobId = randomUUID();
        const task = await videoProcessingQueue.add(
          {
            videoUrl,
            start,
            end,
            userId: userId || null,
            source,
          },
          { jobId },
        );
        console.log('Task enqueued with jobId:', task.id);

        // Update log with taskId
        if (db && logId) {
          try {
            await db
              .update(generationLogs)
              .set({ taskId: String(task.id) })
              .where(eq(generationLogs.id, logId));
          } catch (error) {
            console.error('Error updating log with taskId:', error);
          }
        }

        return { taskId: task.id };
      } catch (error) {
        console.error('Error enqueuing task:', error);

        // Update log with failure
        if (db && logId) {
          try {
            await db
              .update(generationLogs)
              .set({
                status: 'failed',
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                completedAt: new Date(),
              })
              .where(eq(generationLogs.id, logId));
          } catch (logError) {
            console.error('Error updating log with failure:', logError);
          }
        }

        throw new Error('Failed to enqueue task');
      }
    }),

  checkTaskStatus: t.procedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const { taskId } = input;
      const job = await videoProcessingQueue.getJob(taskId);
      if (!job) {
        return { status: 'not_found', progress: 0 };
      }

      const status = await job.getState();
      const progressValue = await job.progress();
      const progress = typeof progressValue === 'number' ? progressValue : 0;

      console.log('Task status:', status, 'Progress:', progress);

      if (status === 'completed') {
        const outputFilename = job.returnvalue;
        const audioPath = path.join(__dirname, outputFilename);
        const audioBuffer = await fs.promises.readFile(audioPath);

        // Delete the temporary audio file
        await fs.promises.unlink(audioPath);

        return { status, audioBuffer, progress: 100 };
      }

      return { status, progress };
    }),

  vpnStatus: t.procedure.query(() => {
    const stats = downloadManager.getStats();
    return {
      enabled: stats.length > 0,
      mode: stats.length > 0 ? 'multi-vpn' : 'single-vpn',
      vpns: stats.map((stat) => ({
        proxy: stat.proxy,
        successRate: Math.round(stat.successRate * 100),
        totalAttempts: stat.total,
      })),
    };
    }),
});

export type AppRouter = typeof appRouter;
export type VideoProcessingRouterOutput = inferRouterOutputs<AppRouter>;
export type EnqueueTaskInput = inferProcedureInput<AppRouter['enqueueTask']>;
export type CheckTaskStatusInput = inferProcedureInput<
  AppRouter['checkTaskStatus']
>;
export type CheckTaskStatusOutput = inferProcedureOutput<
  AppRouter['checkTaskStatus']
>;

app.use(
  '/trpc',
  authenticateApiKey, // Apply auth middleware to all tRPC endpoints
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// ============================================================================
// COMPREHENSIVE METRICS ENDPOINT
// ============================================================================
// Clear queue endpoint for testing
app.post('/admin/clear-queue', async (req, res) => {
  try {
    console.log('🗑️  Clearing all jobs from queue...');

    // Clear all job states
    await videoProcessingQueue.empty(); // Remove waiting jobs
    await videoProcessingQueue.clean(0, 'completed'); // Remove completed jobs
    await videoProcessingQueue.clean(0, 'failed'); // Remove failed jobs
    await videoProcessingQueue.clean(0, 'delayed'); // Remove delayed jobs

    console.log('✅ Queue cleared successfully');

    res.json({
      success: true,
      message: 'Queue cleared successfully',
    });
  } catch (error) {
    console.error('❌ Error clearing queue:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// VPN restart/logs endpoints are now handled by the manager service.
// These stubs remain for backwards compatibility.
app.post('/admin/vpn/restart', async (_req, res) => {
  res.status(410).json({
    error: 'VPN management has moved to the manager service.',
    hint: 'Use /manager/gluetun/restart instead.',
  });
});

app.get('/admin/vpn/logs', async (_req, res) => {
  res.status(410).json({
    error: 'VPN log fetching has moved to the manager service.',
    hint: 'Use /manager/gluetun/logs?container=<name> instead.',
  });
});

// Docker socket operations (logs, restart, status) are now handled by the manager.
app.get('/admin/docker/status', async (_req, res) => {
  res.status(410).json({
    error: 'Docker status has moved to the manager service.',
    hint: 'Use /manager/gluetun/status or /manager/workers/status instead.',
  });
});

// VPN verify endpoint -- ytdl primary no longer runs behind gluetun.
// Workers handle VPN traffic; check their status via /manager/workers/status.
app.get('/admin/vpn/verify', async (_req, res) => {
  res.status(410).json({
    error: 'ytdl primary no longer runs behind VPN. Downloads are handled by workers.',
    hint: 'Use /manager/workers/status to check worker VPN status.',
  });
});

// Simple REST endpoint for testing (bypasses tRPC complexity)
app.post('/test/enqueue', async (req, res) => {
  try {
    const { videoUrl, start, end, userId, source } = req.body;
    if (!videoUrl || start == null || end == null) {
      return res.status(400).json({ error: 'Missing videoUrl, start, or end' });
    }

    // Create initial DB log (matching tRPC enqueueTask behavior)
    let logId: string | undefined;
    if (db) {
      try {
        const [log] = await db
          .insert(generationLogs)
          .values({
            userId: userId || null,
            source: source || 'cli',
            videoUrl,
            start: String(start),
            end: String(end),
            status: 'initiated',
          })
          .returning();
        logId = log?.id;
        console.log(`📝 [/test/enqueue] Created DB log (logId: ${logId})`);
      } catch (dbError) {
        console.error(`⚠️  [/test/enqueue] Failed to create DB log:`, dbError);
      }
    }

    const jobId = randomUUID();
    const job = await videoProcessingQueue.add(
      {
        videoUrl,
        start,
        end,
        userId: userId || null,
        source: source || 'cli',
      },
      { jobId },
    );

    // Update log with taskId
    if (db && logId) {
      try {
        await db
          .update(generationLogs)
          .set({ taskId: String(job.id) })
          .where(eq(generationLogs.id, logId));
      } catch (dbError) {
        console.error(
          `⚠️  [/test/enqueue] Failed to update DB log with taskId:`,
          dbError,
        );
      }
    }

    res.json({ success: true, taskId: String(job.id) });
  } catch (error) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
  }
});

app.get('/metrics', async (req, res) => {
  try {
    // VPN Metrics
    const vpnMetrics = metricsTracker.getAllVpnMetrics();
    const vpnSummary = metricsTracker.getSummary();
    const recentIpChanges = metricsTracker.getRecentIpChanges(20);

    // Live VPN connection status
    const vpnConnectionStatus = await checkVpnConnectionStatus();

    // Redis/Queue Metrics
    const queueStats = {
      waiting: await videoProcessingQueue.getWaitingCount(),
      active: await videoProcessingQueue.getActiveCount(),
      completed: await videoProcessingQueue.getCompletedCount(),
      failed: await videoProcessingQueue.getFailedCount(),
      delayed: await videoProcessingQueue.getDelayedCount(),
      paused: await videoProcessingQueue.getPausedCount(),
    };

    // Get active jobs (currently processing)
    const activeJobs = await videoProcessingQueue.getActive();
    const activeJobsDetails = await Promise.all(
      activeJobs.map(async (job) => ({
        id: job.id,
        taskId: String(job.id),
        data: job.data,
        progress: await job.progress(),
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
      })),
    );

    // Get waiting jobs (in queue)
    const waitingJobs = await videoProcessingQueue.getWaiting();
    const waitingJobsDetails = waitingJobs.slice(0, 50).map((job) => ({
      id: job.id,
      taskId: String(job.id),
      data: job.data,
      timestamp: job.timestamp,
    }));

    // Get recent completed jobs
    const completedJobs = await videoProcessingQueue.getCompleted(0, 49);
    const completedJobsDetails = completedJobs.map((job) => ({
      id: job.id,
      taskId: String(job.id),
      data: job.data,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      returnvalue: job.returnvalue,
    }));

    // Get recent failed jobs
    const failedJobs = await videoProcessingQueue.getFailed(0, 49);
    const failedJobsDetails = failedJobs.map((job) => ({
      id: job.id,
      taskId: String(job.id),
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
    }));

    // Database Metrics - Recent Generation Logs
    let recentLogs: any[] = [];
    if (db) {
      try {
        recentLogs = await db
          .select()
          .from(generationLogs)
          .orderBy(desc(generationLogs.createdAt))
          .limit(50);
      } catch (dbError) {
        console.error('Failed to fetch recent logs from DB:', dbError);
      }
    }

    // Combined Jobs List - All jobs with VPN attempts chronologically
    const allJobs = [
      ...activeJobsDetails.map((job) => ({
        ...job,
        status: 'active' as const,
      })),
      ...waitingJobsDetails.map((job) => ({
        ...job,
        status: 'waiting' as const,
      })),
      ...completedJobsDetails.map((job) => ({
        ...job,
        status: 'completed' as const,
      })),
      ...failedJobsDetails.map((job) => ({
        ...job,
        status: 'failed' as const,
      })),
    ];

    // Enrich jobs with VPN attempt data
    const enrichedJobs = allJobs.map((job) => {
      const taskId = String(job.id);
      let vpnAttempts = metricsTracker.getVpnAttemptsForTask(taskId);

      // Fall back to persisted VPN attempts on the job (survives container restarts)
      if (vpnAttempts.length === 0 && job.data?.vpnAttemptsLog) {
        vpnAttempts = (job.data.vpnAttemptsLog as any[]).map((a) => ({
          proxy: a.proxy,
          ip: a.ip,
          location: a.location,
          timestamp: new Date(a.timestamp),
          success: a.success,
          error: a.error,
          videoUrl: job.data?.videoUrl || 'unknown',
        }));
      }

      const jobAny = job as any;

      // Derive rolled-up VPN summary fields
      const vpnProxiesTried = [...new Set(vpnAttempts.map((a) => a.proxy))];
      const vpnProxiesFailed = [
        ...new Set(vpnAttempts.filter((a) => !a.success).map((a) => a.proxy)),
      ];
      const successfulAttempt = vpnAttempts.find((a) => a.success);

      return {
        id: job.id,
        taskId,
        userId: job.data?.userId || null,
        source: job.data?.source || 'web',
        videoUrl: job.data?.videoUrl || 'unknown',
        startMs: job.data?.start || 0,
        endMs: job.data?.end || 0,
        status: job.status,
        errorMessage: jobAny.failedReason || null,
        timestamp:
          jobAny.timestamp ||
          jobAny.processedOn ||
          jobAny.finishedOn ||
          Date.now(),
        processedOn: jobAny.processedOn || null,
        finishedOn: jobAny.finishedOn || null,
        progress: jobAny.progress || 0,
        attemptsMade: jobAny.attemptsMade || 0,
        failedReason: jobAny.failedReason,
        // Detailed VPN attempt log
        vpnAttempts: vpnAttempts.map((attempt) => ({
          proxy: attempt.proxy,
          ip: attempt.ip || 'unknown',
          location: attempt.location || 'unknown',
          timestamp: attempt.timestamp,
          success: attempt.success,
          error: attempt.error,
        })),
        // Rolled-up VPN summary fields (mirrors DB schema shape)
        vpnAttemptsCount: vpnAttempts.length,
        vpnProxiesTried,
        vpnProxiesFailed,
        vpnProxySuccess: successfulAttempt?.proxy || null,
        vpnIpAddress: successfulAttempt?.ip || null,
        vpnLocation: successfulAttempt?.location || null,
        vpnSuccessful: vpnAttempts.some((a) => a.success),
      };
    });

    // Sort by timestamp (most recent first)
    const sortedJobs = enrichedJobs.sort(
      (a, b) => (b.timestamp as number) - (a.timestamp as number),
    );

    // System Metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    };

    // Per-worker download stats from the download manager
    const workerDownloadStats = downloadManager.getStats();

    res.json({
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      jobs: sortedJobs,
      vpnConnectionStatus,
      workerDownloadStats,

      vpn: {
        summary: vpnSummary,
        proxies: vpnMetrics.map((m) => ({
          proxy: m.proxy,
          currentIp: m.currentIp,
          currentLocation: m.currentLocation,
          ipLastChecked: m.ipLastChecked,
          stats: {
            total: {
              requests: m.totalRequests,
              success: m.totalSuccess,
              failures: m.totalFailures,
              successRate:
                m.totalRequests > 0
                  ? ((m.totalSuccess / m.totalRequests) * 100).toFixed(2) + '%'
                  : 'N/A',
            },
            currentIp: {
              requests: m.currentIpRequests,
              success: m.currentIpSuccess,
              failures: m.currentIpFailures,
              successRate:
                m.currentIpRequests > 0
                  ? ((m.currentIpSuccess / m.currentIpRequests) * 100).toFixed(
                      2,
                    ) + '%'
                  : 'N/A',
            },
          },
          lastIpChange: m.lastIpChange,
          ipChangeCount: m.ipChanges.length,
          ipChanges: m.ipChanges,
          ipHistory: m.ipHistory.map((h) => ({
            ip: h.ip,
            location: h.location,
            firstSeen: h.firstSeen,
            lastSeen: h.lastSeen,
            requests: h.requestCount,
            success: h.successCount,
            failures: h.failureCount,
            successRate:
              h.requestCount > 0
                ? ((h.successCount / h.requestCount) * 100).toFixed(2) + '%'
                : 'N/A',
            recentRequests: h.requests.slice(-10), // Last 10 requests for this IP
          })),
        })),
        recentIpChanges,
      },

      queue: {
        stats: queueStats,
        activeJobs: activeJobsDetails,
        waitingJobs: waitingJobsDetails,
        recentCompleted: completedJobsDetails,
        recentFailed: failedJobsDetails,
      },

      database: {
        connected: db !== null,
        recentLogs: recentLogs.slice(0, 50).map((log) => ({
          id: log.id,
          userId: log.userId,
          source: log.source,
          videoUrl: log.videoUrl,
          status: log.status,
          errorMessage: log.errorMessage,
          taskId: log.taskId,
          createdAt: log.createdAt,
          completedAt: log.completedAt,
          vpnAttempts: log.vpnAttempts,
          vpnProxiesTried: log.vpnProxiesTried,
          vpnProxiesFailed: log.vpnProxiesFailed,
          vpnProxySuccess: log.vpnProxySuccess,
          vpnIpAddress: log.vpnIpAddress,
          vpnLocation: log.vpnLocation,
        })),
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const remainingMilliseconds = milliseconds % 1000;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  const formattedMilliseconds = String(remainingMilliseconds).padStart(3, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
}

async function downloadAudioSlice(
  videoUrl: string,
  startMilliseconds: number,
  endMilliseconds: number,
  taskId?: string,
  job?: any, // Bull job for progress updates
): Promise<DownloadResult> {
  process.stdout.write(`[downloadAudioSlice] Called for taskId ${taskId}\n`);
  return await downloadManager.downloadAudio({
    videoUrl,
    startMs: startMilliseconds,
    endMs: endMilliseconds,
    taskId,
    onProgress: (progress) => {
      if (job) {
        job.progress(progress.percent);
      }
    },
  });
}

// Job data validation
interface ValidJobData {
  videoUrl: string;
  start: number;
  end: number;
}

function validateJobData(data: any, jobId: string | number): ValidJobData {
  process.stdout.write(
    `[VALIDATE] Job ${jobId} data: ${JSON.stringify(data)}\n`,
  );

  if (!data) {
    throw new Error(`Job ${jobId}: data is null or undefined`);
  }

  if (!data.videoUrl || typeof data.videoUrl !== 'string') {
    throw new Error(
      `Job ${jobId}: Missing or invalid videoUrl (got: ${typeof data.videoUrl})`,
    );
  }

  if (typeof data.start !== 'number' || data.start < 0) {
    throw new Error(`Job ${jobId}: Invalid start time (got: ${data.start})`);
  }

  if (typeof data.end !== 'number' || data.end <= data.start) {
    throw new Error(
      `Job ${jobId}: Invalid end time (got: ${data.end}, start: ${data.start})`,
    );
  }

  process.stdout.write(`[VALIDATE] ✅ Job ${jobId} data is valid\n`);
  return { videoUrl: data.videoUrl, start: data.start, end: data.end };
}

console.log('🔧 Registering queue processor...');
const processor = videoProcessingQueue.process(async (job) => {
  // Force immediate log flushing
  process.stdout.write(
    `\n🎬 [START] Processing job ${job.id} at ${new Date().toISOString()}\n`,
  );

  let validData: ValidJobData;
  let taskId: string;

  // Stage 1: Validate job data
  try {
    validData = validateJobData(job.data, job.id);
    taskId = String(job.id);

    process.stdout.write(`   Video: ${validData.videoUrl}\n`);
    process.stdout.write(
      `   Range: ${validData.start}ms - ${validData.end}ms\n`,
    );
  } catch (validationError) {
    process.stdout.write(
      `❌ [VALIDATION ERROR] Job ${job.id}: ${validationError}\n`,
    );
    throw validationError;
  }

  const { videoUrl, start, end } = validData;

  // Stage 2: Update database status
  if (db) {
    try {
      await db
        .update(generationLogs)
        .set({ status: 'active' })
        .where(eq(generationLogs.taskId, taskId));
      process.stdout.write(
        `📝 [DB] Updated log to active (taskId: ${taskId})\n`,
      );
    } catch (dbError) {
      process.stdout.write(`⚠️  [DB ERROR] Failed to update log: ${dbError}\n`);
      // Don't fail the job if logging fails
    }
  }

  // Stage 3: Download with VPN retry
  let downloadResult: DownloadResult;
  try {
    process.stdout.write(`   [CALLING] downloadAudioSlice...\n`);
    downloadResult = await downloadAudioSlice(
      videoUrl,
      start,
      end,
      taskId,
      job,
    );
    process.stdout.write(
      `   [RETURNED] downloadAudioSlice completed successfully\n`,
    );
  } catch (downloadError) {
    process.stdout.write(
      `❌ [DOWNLOAD ERROR] Job ${job.id}: ${downloadError}\n`,
    );
    if (downloadError instanceof Error) {
      process.stdout.write(`   Stack: ${downloadError.stack}\n`);
    }
    throw downloadError;
  }

  // Persist VPN attempts on the Bull job (survives ytdl container restarts)
  try {
    await job.update({
      ...job.data,
      vpnAttemptsLog: downloadResult.vpnAttempts.map((a) => ({
        proxy: a.proxy,
        ip: a.ip || 'unknown',
        location: a.location || 'unknown',
        success: a.success,
        error: a.error,
        timestamp: new Date().toISOString(),
      })),
    });
  } catch (persistErr) {
    process.stdout.write(`⚠️  [PERSIST] Failed to save VPN attempts to job: ${persistErr}\n`);
  }

  // Stage 4: Log results
  try {
    console.log(formatVpnSummary(downloadResult));
    const vpnData = extractVpnLogData(downloadResult);

    // Stage 5: Update database with completion
    if (db) {
      try {
        await db
          .update(generationLogs)
          .set({
            status: 'completed',
            completedAt: new Date(),
            vpnAttempts: vpnData.vpnAttempts.toString(),
            vpnProxiesTried: vpnData.vpnProxiesTried,
            vpnProxiesFailed: vpnData.vpnProxiesFailed,
            vpnProxySuccess: vpnData.vpnProxySuccess,
            vpnIpAddress: vpnData.vpnIpAddress,
            vpnLocation: vpnData.vpnLocation,
          })
          .where(eq(generationLogs.taskId, taskId));
        process.stdout.write(
          `✅ [DB] Updated log to completed (taskId: ${taskId})\n`,
        );
        process.stdout.write(
          `   VPN: ${vpnData.vpnProxySuccess || 'none'} (${vpnData.vpnLocation || vpnData.vpnIpAddress || 'unknown'})\n`,
        );
        process.stdout.write(
          `   Attempts: ${vpnData.vpnAttempts} (${vpnData.vpnProxiesFailed.length} failed)\n`,
        );
      } catch (dbError) {
        process.stdout.write(
          `⚠️  [DB ERROR] Failed to update completion log: ${dbError}\n`,
        );
      }
    }

    return downloadResult.filename;
  } catch (loggingError) {
    process.stdout.write(
      `⚠️  [LOGGING ERROR] Job ${job.id}: ${loggingError}\n`,
    );
    // Still return the result even if logging fails
    return downloadResult.filename;
  }
});

// Global error handler for uncaught errors in processor
processor.catch((error: Error) => {
  process.stdout.write(`❌ [PROCESSOR UNCAUGHT ERROR]: ${error}\n`);
  process.stdout.write(`   Stack: ${error.stack}\n`);
});

// Separate catch block for the entire processor moved above
videoProcessingQueue.on('failed', async (job, err) => {
  const taskId = job ? String(job.id) : 'unknown';
  process.stdout.write(`❌ [FAILED EVENT] Job ${taskId}: ${err.message}\n`);

  // Update log to failed
  if (db && job) {
    try {
      await db
        .update(generationLogs)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          completedAt: new Date(),
        })
        .where(eq(generationLogs.taskId, taskId));
      process.stdout.write(
        `❌ [DB] Updated log to failed (taskId: ${taskId})\n`,
      );
    } catch (logError) {
      process.stdout.write(
        `⚠️  [DB ERROR] Failed to update failure log: ${logError}\n`,
      );
    }
  }
});
console.log('✅ Queue processor registered');

// Start server (all secrets come from environment variables now)
const port = Number.parseInt(process.env.PORT || '3001');
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  if (process.env.YTDL_INTERNAL_API_KEY) {
    console.log(
      `✅ API Key configured: ${process.env.YTDL_INTERNAL_API_KEY.substring(0, 8)}***`,
    );
  } else {
    console.warn(
      '⚠️  YTDL_INTERNAL_API_KEY not set - running without authentication!',
    );
  }
  if (db) {
    console.log('✅ Database logging enabled');
  }
});
