import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!.+.[w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)',
    // Exclude admin API routes (they use API key auth instead)
    '/((?!api/admin).*)',
  ],
};
