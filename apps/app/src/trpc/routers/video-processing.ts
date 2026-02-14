import { z } from 'zod';
import { publicProcedure } from '../trpc';
// All logging is now handled by ytdl service

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

    try {
      // Prepare request details for logging
      const ytdlUrl = process.env.NEXT_PUBLIC_YTDL_URL;
      const apiKey = process.env.YTDL_INTERNAL_API_KEY;
      const fullUrl = `${ytdlUrl}trpc/enqueueTask`;
      const requestBody = { 
        videoUrl, 
        start, 
        end,
        userId,
        source: 'web' as const,
      };
      
      // Log the full outgoing request for debugging
      console.log('🚀 Outgoing Request to YTDL:');
      console.log('   URL:', fullUrl);
      console.log('   API Key Present:', !!apiKey);
      console.log('   API Key Length:', apiKey?.length || 0);
      console.log('   API Key Preview:', apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING');
      console.log('   Request Body:', JSON.stringify(requestBody));
      console.log('   Full Headers:', {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
      });

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey || '',
        },
        body: JSON.stringify(requestBody),
      });

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
        throw new Error(errorDetails);
      }

      const responseData = await response.json();
      console.log('✅ Success! Response data:', responseData);
      const { result } = responseData;

      return result.data as { taskId: string };
    } catch (error) {
      console.error('💥 EXCEPTION in enqueueTask:');
      console.error('   Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('   Message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('   Stack:', error.stack);
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
      progress: z.number().optional(),
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
    const { status, audioBuffer, progress } = result.data as {
      status: string;
      audioBuffer?: Buffer;
      progress?: number;
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

    return { status, audioBuffer, progress } as {
      status: 'not_found' | 'completed' | 'waiting' | 'active' | 'failed';
      audioBuffer?: Buffer;
      progress?: number;
    };
  });
