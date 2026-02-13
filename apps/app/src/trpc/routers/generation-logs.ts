import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { db } from '@drizzle/db';
import * as schema from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const updateGenerationLogStatus = publicProcedure
  .input(
    z.object({
      taskId: z.string(),
      status: z.enum(['completed', 'failed']),
      errorMessage: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { taskId, status, errorMessage } }) => {
    await db
      .update(schema.generationLogs)
      .set({
        status,
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(schema.generationLogs.taskId, taskId));

    return { success: true };
  });
