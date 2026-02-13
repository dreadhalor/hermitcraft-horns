import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/trpc';

const handler = async (req: Request) => {
  try {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => ({}),
      onError({ error, path }) {
        console.error('❌ tRPC Error:', { path, error: error.message, stack: error.stack });
      },
    });
  } catch (error) {
    console.error('❌ Handler Error:', error);
    throw error;
  }
};

export { handler as GET, handler as POST };
