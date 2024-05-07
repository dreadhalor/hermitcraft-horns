import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import {
  inferAsyncReturnType,
  inferRouterOutputs,
  initTRPC,
} from '@trpc/server';
import { z } from 'zod';
import { execSync } from 'child_process';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

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

const appRouter = t.router({
  extractAudio: t.procedure
    .input(
      z.object({
        videoUrl: z.string(),
        start: z.number(),
        end: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { videoUrl, start, end } = input;
      const outputFilename = await downloadAudioSlice(videoUrl, start, end);

      // Read the processed audio file
      const audioPath = path.join(__dirname, outputFilename);
      const audioBuffer = await fs.promises.readFile(audioPath);

      // Delete the temporary audio file
      await fs.promises.unlink(audioPath);

      return audioBuffer;
    }),
});

export type AppRouter = typeof appRouter;
export type VideoProcessingRouterOutput = inferRouterOutputs<AppRouter>;

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

    execSync(command, { stdio: 'inherit' });

    console.log(`Audio slice saved to ${outputFilename}`);
    return outputFilename;
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw error;
  }
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
