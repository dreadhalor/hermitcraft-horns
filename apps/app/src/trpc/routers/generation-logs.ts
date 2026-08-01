import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { db } from '@drizzle/db';
import * as schema from '../../../drizzle/schema';
import { and, eq, isNull } from 'drizzle-orm';

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
      .set({ status, completedAt: new Date() })
      .where(eq(schema.generationLogs.taskId, taskId));

    // The ytdl service sees the real failure (which worker, which yt-dlp
    // error) and writes it first. The browser only knows "it didn't work", so
    // its message is a fallback -- never allow it to overwrite a server one.
    if (errorMessage) {
      await db
        .update(schema.generationLogs)
        .set({ errorMessage })
        .where(
          and(
            eq(schema.generationLogs.taskId, taskId),
            isNull(schema.generationLogs.errorMessage),
          ),
        );
    }

    return { success: true };
  });
