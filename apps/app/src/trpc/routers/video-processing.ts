import { z } from 'zod';
import { publicProcedure } from '../trpc';
// import { VideoProcessingRouterOutput } from '@repo/ytdl';

export const enqueueTask = publicProcedure
  .input(
    z.object({
      videoUrl: z.string(),
      start: z.number(),
      end: z.number(),
    }),
  )
  .output(z.object({ taskId: z.string() }))
  .mutation(async ({ input }) => {
    const { videoUrl, start, end } = input;
    console.log('Calling enqueueTask with input:', input);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_YTDL_URL}trpc/enqueueTask`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoUrl, start, end }),
        },
      );

      console.log('enqueueTask response:', response);

      if (!response.ok) {
        console.error(
          'Failed to enqueue task, response status:',
          response.status,
        );
        throw new Error('Failed to enqueue task');
      }

      const { result } = await response.json();
      console.log('enqueueTask result:', result);

      return result.data as { taskId: string };
    } catch (error) {
      console.error('Error calling enqueueTask:', error);
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
