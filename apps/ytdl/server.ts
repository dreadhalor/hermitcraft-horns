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

const app = express();

// Enable CORS
app.use(
  cors({
    origin: 'http://localhost:3000',
  })
);

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
  // redis: {
  //   host: process.env.REDIS_HOST || 'localhost',
  //   port: parseInt(process.env.REDIS_PORT || '6379'),
  // },
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
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

async function downloadAudioSlice(
  videoUrl: string,
  start: number,
  end: number
): Promise<string> {
  try {
    // Create the media-output folder if it doesn't exist
    const dir = 'media-output';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const outputFilename = `${dir}/audio_slice_${Date.now()}.mp3`;
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    console.log(`Downloading audio slice from ${startTime} to ${endTime}`);

    const command = `yt-dlp --download-sections "*${startTime}-${endTime}" --force-keyframes-at-cuts -f bestaudio -x --audio-format mp3 --no-cache-dir -o "${outputFilename}" "${videoUrl}"`;

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
  try {
    const outputFilename = await downloadAudioSlice(videoUrl, start, end);
    // Perform any additional processing or cleanup if needed
    return outputFilename;
  } catch (error) {
    console.error('Error processing video:', error);
    throw error;
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
