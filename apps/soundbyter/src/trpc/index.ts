import { getClips, saveClip } from '@/../drizzle/db';
import { publicProcedure, router } from './trpc';
import { z } from 'zod';

export const appRouter = router({
  getClips: publicProcedure.query(async () => {
    const result = await getClips();
    return result;
  }),
  // saveClip: publicProcedure.mutation(async (clip) => {
  //   console.log('clip', clip);
  //   const result = await saveClip(clip);
  //   console.log('result', result);
  //   return result;
  // }

  // export type Clip = {
  //   start: number;
  //   end: number;
  //   user: string;
  //   video: string;
  // };

  // Clip = {
  //   start: `${startTime}`,
  //   end: `${endTime}`,
  //   video: videoUrl,
  //   user: 0,
  // };

  saveClip: publicProcedure
    .input(
      z.object({
        start: z.string(),
        end: z.string(),
        video: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await saveClip(input);
      return true;
    }),
});

export type AppRouter = typeof appRouter;
