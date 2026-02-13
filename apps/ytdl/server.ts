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
import { exec } from 'child_process';
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

// Initialize database connection (only if DATABASE_URL is set)
let db: ReturnType<typeof drizzle> | null = null;
if (process.env.DATABASE_URL) {
  const queryClient = postgres(process.env.DATABASE_URL);
  db = drizzle(queryClient);
  console.log('✅ Connected to database for logging');
} else {
  console.warn('⚠️  DATABASE_URL not set - running without database logging');
}

const app = express();

// Enable CORS
app.use(
  cors({
    origin: 'http://localhost:3000',
  })
);

// API Key authentication middleware
const authenticateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const validApiKey = process.env.YTDL_INTERNAL_API_KEY;

  if (!validApiKey) {
    console.warn('⚠️  YTDL_INTERNAL_API_KEY not set - running without authentication!');
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    console.error('❌ Invalid or missing API key');
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

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
      })
    )
    .mutation(async ({ input }) => {
      const { videoUrl, start, end } = input;
      console.log('Received enqueueTask request with input:', input);

      try {
        console.log('Enqueueing task...');
        const taskId = await videoProcessingQueue.add({ videoUrl, start, end });
        console.log('Task enqueued with taskId:', taskId);
        return { taskId: taskId.id };
      } catch (error) {
        console.error('Error enqueuing task:', error);
        throw new Error('Failed to enqueue task');
      }
    }),

  checkTaskStatus: t.procedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const { taskId } = input;
      const job = await videoProcessingQueue.getJob(taskId);
      if (!job) {
        return { status: 'not_found' };
      }

      const status = await job.getState();
      console.log('Task status:', status);

      if (status === 'completed') {
        const outputFilename = job.returnvalue;
        const audioPath = path.join(__dirname, outputFilename);
        const audioBuffer = await fs.promises.readFile(audioPath);

        // Delete the temporary audio file
        await fs.promises.unlink(audioPath);

        return { status, audioBuffer };
      }

      return { status };
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
  endMilliseconds: number
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

    const command = `yt-dlp --download-sections "*${startTime}-${endTime}" --force-keyframes-at-cuts -f bestaudio -x --audio-format mp3 --audio-quality 0 --postprocessor-args "-af loudnorm=I=-16:LRA=11:TP=-1.5" --no-cache-dir -o "${outputFilename}" "${videoUrl}"`;

    console.log(`Executing command: ${command}`);

    await new Promise<void>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${error.message}`);
          reject(error);
          return;
        }
        console.log(`Command output: ${stdout}`);
        resolve();
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
  
  // Log to database when processing starts
  if (db) {
    try {
      await db.insert(generationLogs).values({
        userId: null, // ytdl doesn't have user context
        source: 'cli', // Mark as CLI request
        videoUrl,
        start: start.toString(),
        end: end.toString(),
        status: 'active',
        taskId,
      });
      console.log(`📝 Logged CLI generation request to database (taskId: ${taskId})`);
    } catch (error) {
      console.error('Error logging to database:', error);
      // Don't fail the job if logging fails
    }
  }
  
  try {
    const outputFilename = await downloadAudioSlice(videoUrl, start, end);
    
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

const port = Number.parseInt(process.env.PORT || '3001');
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
