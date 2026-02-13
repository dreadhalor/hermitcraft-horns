import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that should bypass Clerk auth (use API key auth instead)
const isPublicRoute = createRouteMatcher([
  '/api/admin/(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    // Apply Clerk auth to all routes except public ones
  }
});

export const config = {
  matcher: ['/((?!.+.[w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
