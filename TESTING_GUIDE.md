# End-to-End Testing Guide

Complete guide for testing the ytdl service with authentication and logging from command line.

## Prerequisites

1. ✅ Redis running
2. ✅ Database URL configured in ytdl `.env`
3. ✅ API key configured in both app and ytdl
4. ✅ Admin user ID configured

## Full Test Procedure

### Step 1: Start Redis

```bash
# Check if Redis is already running
docker ps | grep redis

# If not running, start it
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Step 2: Start ytdl Service

```bash
cd apps/ytdl
pnpm start:dev
```

**Expected output:**
```
✅ Connected to database for logging
Connected to Redis
Server is running on port 3001
```

If you see warnings about missing `YTDL_INTERNAL_API_KEY` or `DATABASE_URL`, stop and fix those first.

### Step 3: Run Command-Line Test

Open a new terminal:

```bash
cd apps/ytdl
./test-ytdl.sh local
```

**Expected output:**
```
💻 Testing local ytdl service...
📹 Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
⏱️  Clip: 0ms to 5000ms

1️⃣  Enqueuing task...
✅ Task enqueued with ID: 1

2️⃣  Waiting for task to complete...
   Attempt 1: Status = waiting
   Attempt 2: Status = active
   Attempt 3: Status = active
   Attempt 4: Status = completed
✅ Task completed successfully!
```

### Step 4: Verify ytdl Service Logs

In the terminal where ytdl is running, you should see:

```
Received enqueueTask request with input: {...}
Enqueueing task...
Task enqueued with taskId: 1
📝 Logged generation request to database (taskId: 1)
Downloading audio slice from 00:00:00.000 to 00:00:05.000
Executing command: yt-dlp ...
Audio slice saved to media-output/audio_slice_...mp3
✅ Updated log to completed (taskId: 1)
Task status: completed
```

### Step 5: Check Admin Panel for Logged Request

1. Start the Next.js app:
   ```bash
   cd apps/app
   pnpm dev
   ```

2. Visit `http://localhost:3000/whoami` to get your admin user ID (if not set yet)

3. Add `ADMIN_USER_ID` to `apps/app/.env.local` if needed

4. Visit `http://localhost:3000/admin`

5. **Look for the logged request in "Recent Generation Requests" table:**
   - ✅ Should show the test video URL
   - ✅ Should show timestamps (0ms to 5000ms)
   - ✅ Should show status: "completed"
   - ✅ Should show username: `null` (since it came from ytdl directly, not through the app)
   - ✅ Should show processing time

### Step 6: Test Authentication

Try calling the API without the key to verify auth works:

```bash
# This should FAIL with 401 Unauthorized
curl -X POST http://localhost:3001/trpc/enqueueTask \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","start":0,"end":5000}'
```

**Expected response:**
```json
{"error":"Unauthorized: Invalid or missing API key"}
```

### Step 7: Test via Next.js App (Full User Flow)

1. Visit `http://localhost:3000`
2. Sign in with Clerk
3. Click "Create Horn"
4. Paste a YouTube video URL
5. Select a time range (5 seconds)
6. Generate the clip
7. Check admin panel - should now see TWO logs:
   - One with `userId: null` (from command line test)
   - One with your actual user ID (from app)

## Troubleshooting

### "❌ Invalid or missing API key"
- Check that `YTDL_INTERNAL_API_KEY` matches in both `apps/ytdl/.env` and `apps/app/.env.local`
- Restart both services after updating

### "⚠️ DATABASE_URL not set"
- Add your Vercel Postgres connection string to `apps/ytdl/.env`
- Check `apps/app/.env.local` for the `POSTGRES_URL` value

### "Error connecting to Redis"
- Make sure Redis is running: `docker ps | grep redis`
- Try restarting Redis: `docker restart redis`

### "No generation requests yet" in admin panel
- Check that `DATABASE_URL` is set in ytdl `.env`
- Check ytdl service logs for "📝 Logged generation request to database"
- Make sure the `generationLogs` table exists (run migrations)

### Cannot access admin panel
- Visit `/whoami` to get your user ID
- Add `ADMIN_USER_ID=your_user_id` to `apps/app/.env.local`
- Restart the Next.js dev server

## Success Criteria ✅

If everything is working correctly, you should have:

1. ✅ ytdl service started with database connection
2. ✅ Command-line test completed successfully
3. ✅ Audio file downloaded (check `apps/ytdl/media-output/`)
4. ✅ ytdl logs show "📝 Logged generation request"
5. ✅ ytdl logs show "✅ Updated log to completed"
6. ✅ Admin panel shows the logged request
7. ✅ Request without API key returns 401 error
8. ✅ App-generated clips also appear in admin panel

## Production Testing

Once local testing passes, test production:

```bash
cd apps/ytdl

# Make sure you have prod API key
export YTDL_INTERNAL_API_KEY=your_prod_key

./test-ytdl.sh prod
```

Then check the admin panel on production: `https://hermitcrafthorns.com/admin`

---

If all tests pass, you're ready to deploy! 🚀
