# Admin Panel Setup

The admin panel lets you monitor clip generation requests in real-time, track usage patterns, and identify potential abuse before it becomes a problem.

## Features

- **Real-time monitoring** of all clip generation requests
- **User activity tracking** - see who's making requests and how often
- **Success/failure metrics** - monitor YouTube download service health
- **Time-based filtering** - view stats for last 24h, 7 days, 30 days, or all time
- **Request history** - detailed log of every generation attempt with timestamps, status, and error messages

## Setup Instructions

### 1. Get Your Admin User ID

Visit the `/whoami` page while signed in to get your Clerk user ID:

```bash
# Start dev server if not already running
cd apps/app
pnpm dev
```

Navigate to `http://localhost:3000/whoami` and copy your User ID.

### 2. Add Admin User ID to Environment

Add your user ID to `apps/app/.env.local`:

```bash
# Admin Panel
ADMIN_USER_ID=user_your_user_id_here
```

**Important:** Also add this to your production environment variables in Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `ADMIN_USER_ID` with your user ID
3. Redeploy the app

### 3. Create Database Migration

Generate a new migration for the `generationLogs` table:

```bash
cd apps/app
pnpm exec drizzle-kit generate:pg
```

This will create a migration file in `drizzle/migrations/`.

### 4. Run the Migration

**Locally:**
```bash
pnpm migrate
```

**Production:**
The migration will run automatically on your next Vercel deployment, or you can trigger it manually by running the migrate script with production database credentials.

### 5. Access the Admin Panel

Visit `http://localhost:3000/admin` (or `/admin` in production)

Only users with the `ADMIN_USER_ID` can access this page - others will be redirected to the home page.

## What Gets Logged

Every clip generation request logs:
- **User ID & username** - who made the request
- **Video URL** - which YouTube video
- **Timestamps** - start and end times for the clip
- **Status** - initiated, completed, or failed
- **Task ID** - for cross-referencing with ytdl service
- **Error messages** - if the request failed
- **Timestamps** - when initiated and when completed
- **Duration** - how long the generation took

## Admin Panel Features

### Overview Cards
- Total requests in selected time range
- Successful requests count
- Failed requests count  
- Success rate percentage

### Top Users Table
Shows the 10 users with the most generation requests in the selected time range. Helps identify:
- Power users who love the service
- Potential abuse (excessive requests from one user)

### Recent Activity Chart
Visual bar chart showing requests per day for the last 7 days (or selected time range). Helps spot:
- Usage trends
- Traffic spikes
- Quiet periods

### Request Log Table
Detailed table of the 50 most recent generation requests showing:
- Timestamp of request
- Username
- YouTube video link (clickable)
- Clip duration (start/end times)
- Status (completed, failed, or initiated)
- Error messages (for failed requests)
- Processing time (for completed requests)

## Monitoring for Abuse

Watch for these patterns in the admin panel:

**Red Flags:**
- One user making 50+ requests per day
- Same video being requested repeatedly (potential bot)
- High failure rate from one user (possible attack attempts)
- Unusual traffic spikes (could indicate someone scripting requests)

**When to Act:**
If you see abuse patterns, you can:
1. Implement rate limiting (X requests per user per hour)
2. Block specific users or IP addresses
3. Add CAPTCHA for generation requests
4. Contact the user to understand their use case

## Future Enhancements

Ideas for when/if you need them:
- Rate limit configuration UI (set limits without code changes)
- User blocking/throttling controls
- Export logs to CSV for deeper analysis
- Real-time alerts (email/Slack when failure rate spikes)
- Integration with YouTube API quota monitoring
- Automatic VPN rotation based on request volume

## Troubleshooting

**"Unauthorized: Admin access required"**
- Your `ADMIN_USER_ID` in `.env.local` doesn't match your Clerk user ID
- Check `/whoami` to confirm your user ID
- Restart dev server after updating `.env.local`

**"No generation requests yet"**
- The `generationLogs` table is empty (no requests logged yet)
- Try generating a clip to create the first log entry
- Check that the migration ran successfully

**Stats not updating**
- Logs are cached by tRPC/React Query
- Refresh the page to see latest data
- Consider adding auto-refresh if needed

## Security Notes

- Only one admin user is currently supported (defined by `ADMIN_USER_ID`)
- Admin check happens on both frontend and backend
- Non-admin users are redirected immediately and cannot access the endpoints
- Logs contain user IDs but no sensitive data (passwords, emails, etc.)

## Related Files

- `apps/app/src/app/admin/page.tsx` - Admin panel UI
- `apps/app/src/trpc/routers/admin.ts` - Admin endpoints (logs & stats)
- `apps/app/src/trpc/routers/generation-logs.ts` - Log update endpoint
- `apps/app/drizzle/schema.ts` - Database schema for `generationLogs` table
- `apps/app/src/hooks/use-task.tsx` - Logging integration in task hook

---

Need help? Hit up @dreadhalor on Reddit or check the main README.
