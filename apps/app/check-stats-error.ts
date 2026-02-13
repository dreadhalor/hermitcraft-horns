// Quick test to see if stats query works
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'https://www.hermitcraft-horns.com/api/trpc',
    }),
  ],
});

async function testStats() {
  try {
    console.log('Testing stats query...');
    const result = await (client as any).getGenerationStats.query({
      adminUserId: 'user_2gbjlQQWoLD5IM34f4fuugMdOk6',
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    console.log('✅ Stats loaded:', result);
  } catch (error) {
    console.error('❌ Stats error:', error);
  }
}

testStats();
