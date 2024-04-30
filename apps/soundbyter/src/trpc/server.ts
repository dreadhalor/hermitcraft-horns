import { createCallerFactory } from './trpc';
import { appRouter } from './index';

export const trpcServer = createCallerFactory(appRouter)({});
