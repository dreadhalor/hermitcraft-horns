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
import { spawn } from 'child_process';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import Queue from 'bull';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

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
  },
  (logs) => ({
    userIdIndex: index('generation_logs_userId_idx').on(logs.userId),
    createdAtIndex: index('generation_logs_createdAt_idx').on(logs.createdAt),
    statusIndex: index('generation_logs_status_idx').on(logs.status),
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
  })
);

// CRITICAL: Log EVERY request FIRST, before auth, before anything
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
      const [log] = await db.insert(generationLogs).values({
        userId,
        source,
        videoUrl,
        start: start.toString(),
        end: end.toString(),
        status: 'received', // New status to indicate we received the request
      }).returning();

      // Store log ID in request object for later updates
      (req as any).logId = log?.id;
      
      console.log(`✅ Logged request to database (logId: ${log?.id}, source: ${source})`);
    } catch (error) {
      console.error('❌ Error logging request to database:', error);
      console.error('   Error details:', error);
      console.error('   Request body:', JSON.stringify(req.body).substring(0, 500));
      // Don't fail the request if logging fails - continue anyway
    }
  }

  next();
});

// API Key authentication middleware
const authenticateApiKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const rawApiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const apiKey = typeof rawApiKey === 'string' 
    ? (rawApiKey.startsWith('Bearer ') ? rawApiKey.replace('Bearer ', '') : rawApiKey)
    : undefined;
  const validApiKey = process.env.YTDL_INTERNAL_API_KEY;

  // Log ALL incoming requests for debugging
  console.log('🔐 Authentication Check:');
  console.log('   Path:', req.path);
  console.log('   Method:', req.method);
  console.log('   API Key Provided:', !!apiKey);
  console.log('   API Key Length:', apiKey?.length || 0);
  console.log('   API Key Preview:', apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'NONE');
  console.log('   Valid Key Expected:', validApiKey ? `${validApiKey.substring(0, 8)}...${validApiKey.substring(validApiKey.length - 4)}` : 'NOT SET');
  console.log('   Keys Match:', apiKey === validApiKey);
  
  const origin = Array.isArray(req.headers['origin']) ? req.headers['origin'][0] : req.headers['origin'];
  const userAgent = Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'];
  
  console.log('   Headers:', JSON.stringify({
    'content-type': req.headers['content-type'],
    'x-api-key': apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
    'authorization': req.headers['authorization'] ? 'PROVIDED' : 'MISSING',
    'origin': origin,
    'user-agent': userAgent,
  }));

  if (!validApiKey) {
    console.warn('⚠️  YTDL_INTERNAL_API_KEY not set - running without authentication!');
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    console.error('❌ Authentication FAILED - Invalid or missing API key');
    
    // Build detailed error message with full diagnostics
    const providedKeyPreview = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'NONE';
    const expectedKeyPreview = validApiKey ? `${validApiKey.substring(0, 8)}...${validApiKey.substring(validApiKey.length - 4)}` : 'NOT SET';
    const origin = Array.isArray(req.headers['origin']) ? req.headers['origin'][0] : req.headers['origin'];
    
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
          await db.update(generationLogs)
            .set({
              status: 'failed',
              errorMessage: detailedError,
              completedAt: new Date(),
            })
            .where(eq(generationLogs.id, logId));
          console.log(`📝 Updated existing log with auth failure (logId: ${logId})`);
        } else {
          // Fallback: create new log entry
          let requestInfo: any = {};
          if (req.body) {
            requestInfo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
    
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
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
const videoProcessingQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Output a success or failure message on connecting to Redis
videoProcessingQueue.on('error', (error) => {
  console.error('Error connecting to Redis:', error);
});

videoProcessingQueue.on('ready', () => {
  console.log('Connected to Redis');
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
      })
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
              await db.update(generationLogs)
                .set({ status: 'initiated' })
                .where(eq(generationLogs.id, logId));
              console.log(`📝 Updated log to 'initiated' (logId: ${logId})`);
            } else {
              // Fallback: create new log if somehow we don't have logId
              const [log] = await db.insert(generationLogs).values({
                userId: userId || null,
                source,
                videoUrl,
                start: start.toString(),
                end: end.toString(),
                status: 'initiated',
              }).returning();
              logId = log?.id;
              console.log(`📝 Created new log (logId: ${logId})`);
            }
          } catch (error) {
            console.error('Error updating/creating log:', error);
            // Don't fail the request if logging fails
          }
        }

        console.log('Enqueueing task...');
        const taskId = await videoProcessingQueue.add({ videoUrl, start, end });
        console.log('Task enqueued with taskId:', taskId);

        // Update log with taskId
        if (db && logId) {
          try {
            await db.update(generationLogs)
              .set({ taskId: String(taskId.id) })
              .where(eq(generationLogs.id, logId));
          } catch (error) {
            console.error('Error updating log with taskId:', error);
          }
        }

        return { taskId: taskId.id };
      } catch (error) {
        console.error('Error enqueuing task:', error);
        
        // Update log with failure
        if (db && logId) {
          try {
            await db.update(generationLogs)
              .set({ 
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : String(error),
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
  })
);

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
  job?: any // Bull job for progress updates
): Promise<string> {
  try {
    // Create the media-output folder if it doesn't exist
    const dir = 'media-output';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const outputFilename = `${dir}/audio_slice_${Date.now()}.mp3`;
    const startTime = formatTime(startMilliseconds);
    const endTime = formatTime(endMilliseconds);
    console.log(`Downloading audio slice from ${startTime} to ${endTime}`);

    // Convert milliseconds to ffmpeg time format
    const startSeconds = (startMilliseconds / 1000).toFixed(3);
    const duration = ((endMilliseconds - startMilliseconds) / 1000).toFixed(3);
    
    const args = [
      '-f', 'bestaudio',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      // Trim and normalize in post-processing (avoids YouTube IP blocking with --download-sections)
      '--postprocessor-args', `ffmpeg:-ss ${startSeconds} -t ${duration} -af loudnorm=I=-16:LRA=11:TP=-1.5`,
      '--no-cache-dir',
      '--newline', // Force newline after each output line for easier parsing
      '-o', outputFilename,
      videoUrl,
    ];

    console.log(`Executing: yt-dlp ${args.join(' ')}`);

    await new Promise<void>((resolve, reject) => {
      const process = spawn('yt-dlp', args);
      
      let lastProgress = 0;
      
      // Helper to update progress with stage-based fallback
      const updateProgress = (newProgress: number, stage: string) => {
        if (newProgress !== lastProgress) {
          lastProgress = newProgress;
          if (job) {
            job.progress(newProgress);
          }
          console.log(`📊 Progress: ${newProgress}% - ${stage}`);
        }
      };
      
      // Parse progress from stdout
      process.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output.trim());
        
        // Parse download progress: [download] 42.5% of 2.45MiB at 1.23MiB/s ETA 00:15
        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = Math.min(parseFloat(progressMatch[1]), 50); // Cap download at 50%
          updateProgress(progress, 'Downloading');
        }
        
        // Detect post-processing stages (remaining 50% of progress)
        if (output.includes('[download] 100%') || output.includes('has already been downloaded')) {
          updateProgress(50, 'Download complete');
        }
        if (output.includes('[ExtractAudio]')) {
          updateProgress(60, 'Extracting audio');
        }
        if (output.includes('[FixupM4a]') || output.includes('[FixupM3u8]')) {
          updateProgress(70, 'Processing format');
        }
        if (output.includes('Destination:')) {
          updateProgress(75, 'Preparing output');
        }
        if (output.includes('[Metadata]')) {
          updateProgress(80, 'Adding metadata');
        }
        if (output.includes('Deleting original file')) {
          updateProgress(90, 'Finalizing');
        }
        // ffmpeg progress patterns
        if (output.includes('frame=') || output.includes('size=')) {
          updateProgress(85, 'Encoding audio');
        }
      });
      
      // Log errors but don't necessarily fail
      process.stderr.on('data', (data) => {
        const output = data.toString();
        // yt-dlp outputs progress to stderr too sometimes
        console.log(output.trim());
        
        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = Math.min(parseFloat(progressMatch[1]), 50); // Cap download at 50%
          updateProgress(progress, 'Downloading');
        }
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          console.error(`yt-dlp exited with code ${code}`);
          reject(new Error(`yt-dlp exited with code ${code}`));
          return;
        }
        
        // Set to 100% when complete
        if (job) {
          job.progress(100);
        }
        
        console.log('✅ Download complete');
        resolve();
      });
      
      process.on('error', (error) => {
        console.error('Error spawning yt-dlp:', error);
        reject(error);
      });
    });

    console.log(`Audio slice saved to ${outputFilename}`);
    return outputFilename;
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw error;
  }
}

videoProcessingQueue.process(async (job) => {
  const { videoUrl, start, end } = job.data;
  const taskId = String(job.id);
  
  // Update log status to 'active' when processing starts
  if (db) {
    try {
      await db
        .update(generationLogs)
        .set({ status: 'active' })
        .where(eq(generationLogs.taskId, taskId));
      console.log(`📝 Updated log to active (taskId: ${taskId})`);
    } catch (error) {
      console.error('Error updating log to active:', error);
      // Don't fail the job if logging fails
    }
  }
  
  try {
    // Pass job for progress updates
    const outputFilename = await downloadAudioSlice(videoUrl, start, end, job);
    
    // Update log to completed
    if (db) {
      try {
        await db
          .update(generationLogs)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(generationLogs.taskId, taskId));
        console.log(`✅ Updated log to completed (taskId: ${taskId})`);
      } catch (error) {
        console.error('Error updating log:', error);
      }
    }
    
    return outputFilename;
  } catch (error) {
    console.error('Error processing video:', error);
    
    // Update log to failed
    if (db) {
      try {
        await db
          .update(generationLogs)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(generationLogs.taskId, taskId));
        console.log(`❌ Updated log to failed (taskId: ${taskId})`);
      } catch (logError) {
        console.error('Error updating log:', logError);
      }
    }
    
    throw error;
  }
});

// Start server (all secrets come from environment variables now)
const port = Number.parseInt(process.env.PORT || '3001');
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  if (process.env.YTDL_INTERNAL_API_KEY) {
    console.log(`✅ API Key configured: ${process.env.YTDL_INTERNAL_API_KEY.substring(0, 8)}***`);
  } else {
    console.warn('⚠️  YTDL_INTERNAL_API_KEY not set - running without authentication!');
  }
  if (db) {
    console.log('✅ Database logging enabled');
  }
});
