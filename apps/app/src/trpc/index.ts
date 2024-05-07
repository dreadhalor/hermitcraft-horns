import {
  getAllClips,
  saveClip as drizzleSaveClip,
  getUser,
  getAllUsers,
  likeClip,
  unlikeClip,
  incrementClipDownloads,
  editClip as drizzleEditClip,
} from '@drizzle/db';
import { publicProcedure, router } from './trpc';
import { z } from 'zod';
import { type VideoProcessingRouterOutput } from '@repo/ytdl';
import {
  getHermitChannels,
  getHermitcraftVideos,
} from './routers/hermitcraft-wrapper';
import { getHermitsLocal } from './routers/hermitcraft-local';
import { inferRouterOutputs } from '@trpc/server';
import { editClipSchema, saveClipSchema } from '@/schemas';

export const appRouter = router({
  getHermitChannels,
  getHermitsLocal,
  getHermitcraftVideos,
  getUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const result = await getUser(input.userId);
      return result || null;
    }),
  getAllUsers: publicProcedure.query(async () => {
    return await getAllUsers();
  }),
  getClips: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        filterUserId: z.string().optional(),
        hermitId: z.string().optional(),
        sort: z.string().optional(),
      }),
    )
    .query(async ({ input: { userId, filterUserId, hermitId, sort } }) => {
      const result = await getAllClips({
        userId,
        filterUserId,
        hermitId,
        sort,
      });
      return result;
    }),
  saveClip: publicProcedure
    .input(saveClipSchema)
    .mutation(async ({ input }) => {
      console.log('Saving clip:', input);
      await drizzleSaveClip(input);
      return true;
    }),
  editClip: publicProcedure
    .input(editClipSchema)
    .mutation(async ({ input }) => {
      console.log('Editing clip:', input);
      await drizzleEditClip(input);
      return true;
    }),
  likeClip: publicProcedure
    .input(z.object({ userId: z.string(), clipId: z.number() }))
    .mutation(async ({ input: { userId, clipId } }) => {
      likeClip({ user: userId, clip: clipId });
      return true;
    }),
  unlikeClip: publicProcedure
    .input(z.object({ userId: z.string(), clipId: z.number() }))
    .mutation(async ({ input: { userId, clipId } }) => {
      unlikeClip({ user: userId, clip: clipId });
      return true;
    }),

  incrementClipDownloads: publicProcedure
    .input(z.object({ clipId: z.number() }))
    .mutation(async ({ input: { clipId } }) => {
      await incrementClipDownloads(clipId);
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
      const response = await fetch(
        // 'http://localhost:3001/trpc/extractAudio',
        'https://ytdl.hermitcraft-horns.com/trpc/extractAudio',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoUrl, start, end }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to extract audio');
      }

      const { result } = await response.json();
      return result.data as VideoProcessingRouterOutput['extractAudio'];
    }),
});

export type AppRouter = typeof appRouter;
type Outputs = inferRouterOutputs<AppRouter>;
export type HHUser = Outputs['getUser'];
