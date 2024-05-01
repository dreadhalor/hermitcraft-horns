import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import {
  inferAsyncReturnType,
  inferRouterOutputs,
  initTRPC,
} from '@trpc/server';
import { z } from 'zod';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();

// Enable CORS
app.use(
  cors({
    origin: 'http://localhost:3000', // Replace with the URL of your Next.js app
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

async function downloadAudioSlice(
  videoUrl: string,
  start: number,
  end: number
): Promise<string> {
  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(videoInfo.formats, {
      quality: 'highestaudio',
    });
    const audioStream = ytdl(videoUrl, { format });

    const outputFilename = `media-output/audio_slice_${Date.now()}.mp3`;
    const duration = end - start;
    const timeStart = `${start}s`;
    const timeDuration = `${duration}s`;

    return new Promise((resolve, reject) => {
      ffmpeg(audioStream)
        .setStartTime(timeStart)
        .setDuration(timeDuration)
        .outputOptions('-acodec', 'libmp3lame')
        .output(outputFilename)
        .on('end', () => {
          console.log(`Audio slice saved to ${outputFilename}`);
          resolve(outputFilename);
        })
        .on('error', (err: Error) => {
          console.error('Error processing audio:', err);
          reject(err);
        })
        .run();
    });
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw error;
  }
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
