import { getClips } from '@/../drizzle/db';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  getTodos: publicProcedure.query(async () => {
    return [10, 20, 30];
  }),
  getClips: publicProcedure.query(async () => {
    const result = await getClips();
    return result;
  }),
});

export type AppRouter = typeof appRouter;
