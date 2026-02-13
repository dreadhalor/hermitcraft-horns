import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment based on NODE_ENV or Vercel environment
  environment: process.env.NODE_ENV === 'production' 
    ? (process.env.VERCEL_ENV || 'production')
    : 'development',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1,

  // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/hermitcraft-horns.*\.vercel\.app/],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
  
  beforeSend(event, hint) {
    // Always send errors from both dev and prod
    console.log('[Sentry] Sending error to Sentry:', event.message || event.exception?.values?.[0]?.value);
    
    // Add custom context for ytdl errors
    if (event.tags?.['error.type'] === 'ytdl_failure') {
      event.level = 'error';
      event.fingerprint = ['ytdl-service-failure'];
    }
    return event;
  },
});
