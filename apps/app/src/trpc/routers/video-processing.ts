import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { db } from '@drizzle/db';
import * as schema from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
// import { VideoProcessingRouterOutput } from '@repo/ytdl';

export const enqueueTask = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      videoUrl: z.string(),
      start: z.number(),
      end: z.number(),
    }),
  )
  .output(z.object({ taskId: z.string() }))
  .mutation(async ({ input }) => {
    const { userId, videoUrl, start, end } = input;
    console.log('Calling enqueueTask with input:', input);

    let logId: string | undefined;

    try {
      // Log the generation request
      const [log] = await db
        .insert(schema.generationLogs)
        .values({
          userId,
          source: 'web',
          videoUrl,
          start: start.toString(),
          end: end.toString(),
          status: 'initiated',
        })
        .returning();
      
      logId = log!.id;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_YTDL_URL}trpc/enqueueTask`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.YTDL_INTERNAL_API_KEY || '',
          },
          body: JSON.stringify({ videoUrl, start, end }),
        },
      );

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status} ${response.statusText}`;
        let responseText = '';
        
        try {
          responseText = await response.text();
          console.error('❌ Response body:', responseText);
          errorDetails += ` | Body: ${responseText}`;
        } catch (e) {
          console.error('❌ Could not read response body:', e);
          errorDetails += ' | Could not read response body';
        }
        
        console.error('❌ Failed to enqueue task - Full error:', errorDetails);
        
        // Update log with detailed failure
        if (logId) {
          await db
            .update(schema.generationLogs)
            .set({
              status: 'failed',
              errorMessage: errorDetails.substring(0, 500), // Limit to 500 chars
              completedAt: new Date(),
            })
            .where(eq(schema.generationLogs.id, logId));
        }
        
        throw new Error(errorDetails);
      }

      const responseData = await response.json();
      console.log('✅ Success! Response data:', responseData);
      const { result } = responseData;

      // Update log with taskId
      if (logId) {
        await db
          .update(schema.generationLogs)
          .set({
            taskId: result.data.taskId,
          })
          .where(eq(schema.generationLogs.id, logId));
      }

      return result.data as { taskId: string };
    } catch (error) {
      console.error('💥 EXCEPTION in enqueueTask:');
      console.error('   Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('   Message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('   Stack:', error.stack);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update log with failure if we have a logId
      if (logId) {
        await db
          .update(schema.generationLogs)
          .set({
            status: 'failed',
            errorMessage: errorMessage.substring(0, 500),
            completedAt: new Date(),
          })
          .where(eq(schema.generationLogs.id, logId));
      }
      
      throw error;
    }
  });

export const checkTaskStatus = publicProcedure
  .input(z.object({ taskId: z.string() }))
  .output(
    z.object({
      status: z.union([
        z.literal('not_found'),
        z.literal('waiting'),
        z.literal('active'),
        z.literal('completed'),
        z.literal('failed'),
      ]),
      audioBuffer: z.custom<Buffer>().optional(),
    }),
  )
  .query(async ({ input }) => {
    const { taskId } = input;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_YTDL_URL}trpc/checkTaskStatus?input=${JSON.stringify({ taskId })}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.YTDL_INTERNAL_API_KEY || '',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to check task status');
    }

    const { result } = await response.json();
    const { status, audioBuffer } = result.data as {
      status: string;
      audioBuffer?: Buffer;
    };

    // Validate the status value
    const validStatuses = [
      'not_found',
      'waiting',
      'active',
      'completed',
      'failed',
    ];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid task status');
    }

    return { status, audioBuffer } as {
      status: 'not_found' | 'completed' | 'waiting' | 'active' | 'failed';
      audioBuffer?: Buffer;
    };
  });
