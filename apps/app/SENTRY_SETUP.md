# Sentry Error Tracking Setup

Sentry is configured to automatically track errors and notify you when the ytdl service fails.

## Setup Instructions

### 1. Create a Sentry Account
1. Go to https://sentry.io/signup/
2. Sign up (free for up to 5,000 errors/month)
3. Create a new project and select "Next.js"

### 2. Get Your DSN
After creating your project, you'll see your DSN (Data Source Name). It looks like:
```
https://examplePublicKey@o0.ingest.sentry.io/0
```

### 3. Add Environment Variables

Add these to your `.env.local` (for local development):
```bash
NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
SENTRY_ORG=your_organization_slug
SENTRY_PROJECT=your_project_name
```

Add the same to your **Vercel environment variables** for production:
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`

### 4. Set Up Alerts

In your Sentry project:

1. **Go to Alerts** → **Create Alert Rule**
2. **Set conditions**:
   - When: `An issue is first seen`
   - If: `The issue's tags match ALL of these filters`
   - Filter: `error.type` `equals` `ytdl_failure`
3. **Then perform these actions**:
   - Send a notification via **Email** (your email)
   - Optional: Add Slack/Discord webhook for instant notifications

This will notify you immediately when the YouTube download service fails.

## What Gets Tracked

### Automatic Tracking
- All unhandled errors in your Next.js app
- Performance issues (with 10% sampling)
- User session replays when errors occur

### Custom YTDL Error Tracking

The app automatically captures these specific ytdl failures:

1. **Task Failed** (`task.status: failed`)
   - The ytdl service reported a processing failure
   - Includes: taskId, duration

2. **Network Error** (`task.status: network_error`)
   - Unable to connect to ytdl service
   - Includes: taskId, duration, error details

3. **Timeout** (`task.status: timeout`)
   - Task took longer than 3 minutes
   - Includes: taskId, timeout duration

4. **Enqueue Failed** (`task.status: enqueue_failed`)
   - Failed to start the download task
   - Includes: videoUrl, start time, end time

### Error Context

Each error includes:
- **User context**: If logged in via Clerk
- **Video URL**: What video was being processed
- **Timestamp**: When the error occurred
- **Duration**: How long the task ran before failing
- **Browser/Device**: User's browser and device info
- **Breadcrumbs**: User actions leading up to the error

## Viewing Errors

### Sentry Dashboard
1. Go to https://sentry.io
2. Select your project
3. View all errors, grouped by type
4. Click on an error to see full context

### Filtering YTDL Errors
In the Sentry search bar:
```
error.type:ytdl_failure
```

This shows only YouTube download service failures.

## Alert Options

### Email Notifications (Recommended)
- Free tier includes email alerts
- Get notified immediately when ytdl fails
- No additional setup required

### Slack Integration
1. Sentry Dashboard → Settings → Integrations
2. Add Slack integration
3. Configure alert rule to send to Slack channel

### Discord Webhook
1. Create a Discord webhook in your server
2. Sentry → Settings → Integrations → Webhooks
3. Add your Discord webhook URL
4. Configure alert rule to use webhook

### SMS (Paid Feature)
- Available on paid Sentry plans
- Get text messages for critical errors

## Testing

To test that Sentry is working:

1. **Trigger a test error** in development:
```javascript
// Add this temporarily to any component
throw new Error('Test Sentry error');
```

2. **Check Sentry dashboard** - you should see the error appear within seconds

3. **Test ytdl error** by stopping your local ytdl service and trying to generate a clip

## Troubleshooting

### No errors appearing in Sentry

1. **Check DSN is set**:
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```

2. **Check Sentry is initialized**:
   - Look for Sentry in browser console (Network tab)
   - Should see requests to `o0.ingest.sentry.io`

3. **Verify environment variables** in Vercel:
   - Go to Vercel → Project → Settings → Environment Variables
   - Make sure DSN is set for Production

### Alerts not triggering

1. **Check alert rules** in Sentry dashboard
2. **Verify email** in Sentry account settings
3. **Check spam folder** for Sentry emails
4. **Test alert** using "Send Test Notification" in alert settings

## Cost & Limits

### Free Tier
- 5,000 errors/month
- 10,000 replay sessions/month
- 14-day event retention
- Unlimited team members

### If you exceed limits
- Sentry won't stop working
- Older errors get deleted first
- Consider upgrading or adjusting sample rates

### Reducing error volume
In `sentry.client.config.ts`, adjust:
```typescript
tracesSampleRate: 0.1,  // Lower to 0.05 or 0.01
replaysSessionSampleRate: 0.1,  // Lower if needed
```

## Security Notes

- ✅ Source maps are uploaded but hidden from public
- ✅ Sensitive data is automatically scrubbed
- ✅ User IPs are anonymized by default
- ✅ PII (email, passwords) is filtered out

## Support

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Discord**: https://discord.gg/sentry
- **Email**: support@sentry.io (for paid plans)
