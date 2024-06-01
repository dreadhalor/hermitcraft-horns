import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

type Context = {};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const { createCallerFactory, router } = t;
export const publicProcedure = t.procedure;
