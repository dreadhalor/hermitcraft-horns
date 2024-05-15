import {
  getAllClips,
  saveClip as drizzleSaveClip,
  likeClip,
  unlikeClip,
  incrementClipDownloads,
  editClip as drizzleEditClip,
  deleteClip as drizzleDeleteClip,
  getPaginatedClips as drizzleGetPaginatedClips,
} from '@drizzle/db';
import { publicProcedure, router } from './trpc';
import { z } from 'zod';
import {
  getHermitChannels,
  getHermitcraftVideos,
} from './routers/hermitcraft-wrapper';
import { getHermitsLocal } from './routers/hermitcraft-local';
import { inferRouterOutputs } from '@trpc/server';
import { editClipSchema, saveClipSchema } from '@/schemas';
import { checkTaskStatus, enqueueTask } from './routers/video-processing';
import { TimeRange } from '@/lib/utils';
import * as UserRouterEndpoints from './routers/user';

export const appRouter = router({
  getHermitChannels,
  getHermitsLocal,
  getHermitcraftVideos,
  enqueueTask,
  checkTaskStatus,
  ...UserRouterEndpoints,
  getClips: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        filterUserId: z.string().optional(),
        hermitId: z.string().optional(),
        sort: z.string().optional(),
        timeFilter: z.custom<TimeRange>().optional(),
      }),
    )
    .query(
      async ({
        input: { userId, filterUserId, hermitId, sort, timeFilter },
      }) => {
        const result = await getAllClips({
          userId,
          filterUserId,
          hermitId,
          sort,
          timeFilter,
        });
        return result;
      },
    ),
  getPaginatedClips: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        filterUserId: z.string().optional(),
        hermitId: z.string().optional(),
        sort: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        timeFilter: z.custom<TimeRange>().optional(),
      }),
    )
    .query(
      async ({
        input: {
          userId,
          filterUserId,
          hermitId,
          sort,
          page,
          limit,
          timeFilter,
        },
      }) => {
        const result = await drizzleGetPaginatedClips({
          userId,
          filterUserId,
          hermitId,
          sort,
          page,
          limit,
          timeFilter,
        });
        return result;
      },
    ),

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
  deleteClip: publicProcedure
    .input(z.object({ clipId: z.number() }))
    .mutation(async ({ input }) => {
      console.log('Deleting clip:', input);
      await drizzleDeleteClip(input.clipId);
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
});

export type AppRouter = typeof appRouter;
type Outputs = inferRouterOutputs<AppRouter>;
export type HHUser = Outputs['getUser'];
