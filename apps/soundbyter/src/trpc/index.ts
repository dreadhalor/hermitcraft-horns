import { getClips, saveClip as drizzleSaveClip } from '@/../drizzle/db';
import { publicProcedure, router } from './trpc';
import { z } from 'zod';
import { type VideoProcessingRouterOutput } from '@/../../../random_code/ytdl-test/server';

export const appRouter = router({
  getClips: publicProcedure.query(async () => {
    const result = await getClips();
    return result;
  }),
  saveClip: publicProcedure
    .input(
      z.object({
        start: z.string(),
        end: z.string(),
        video: z.string(),
        clipUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log('Saving clip:', input);
      await drizzleSaveClip(input);
      return true;
    }),

  // screw you trpc for not supporting a service-oriented architecture, guess we'll just use a fetch request instead
  // but I'm still using types from the other router & just casting them
  extractAudio: publicProcedure
    .input(
      z.object({
        videoUrl: z.string(),
        start: z.number(),
        end: z.number(),
      }),
    )
    .output(z.custom<VideoProcessingRouterOutput['extractAudio']>())
    .mutation(async ({ input }) => {
      const { videoUrl, start, end } = input;
      const response = await fetch('http://localhost:3001/trpc/extractAudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl, start, end }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract audio');
      }

      const { result } = await response.json();
      return result.data as VideoProcessingRouterOutput['extractAudio'];
    }),
});

export type AppRouter = typeof appRouter;
