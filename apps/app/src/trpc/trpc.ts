import { initTRPC } from '@trpc/server';

type Context = {};

const t = initTRPC.context<Context>().create();

export const { createCallerFactory, router } = t;
export const publicProcedure = t.procedure;
