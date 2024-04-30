import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const { createCallerFactory, router } = t;
export const publicProcedure = t.procedure;
