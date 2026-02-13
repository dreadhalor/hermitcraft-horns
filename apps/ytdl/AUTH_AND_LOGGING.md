# YTDL Service Authentication & Logging

The ytdl service now has API key authentication and comprehensive database logging to track all YouTube download requests and prevent abuse.

## What Changed

### 1. API Key Authentication
- All requests to ytdl endpoints require an `X-API-Key` header
- Protects against unauthorized direct access to the service
- If `YTDL_INTERNAL_API_KEY` is not set, runs without auth (with warning)

### 2. Database Logging
- Every download request is logged to the `generationLogs` table
- Logs when processing starts, completes, or fails
- Captures video URL, timestamps, task ID, and error messages
- If `DATABASE_URL` is not set, runs without logging (with warning)

## Setup

### 1. Generate API Key

```bash
# Generate a secure random API key
openssl rand -hex 32
```

### 2. Add to Environment Variables

**For local development** (`apps/ytdl/.env`):
```bash
# Internal API Key (our proprietary key, must match the app)
YTDL_INTERNAL_API_KEY=your_generated_key_here

# Database URL (from Vercel Postgres)
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

**For the Next.js app** (`apps/app/.env.local`):
```bash
# Must match ytdl service (this is OUR key, not an external service)
YTDL_INTERNAL_API_KEY=your_generated_key_here
```

**For production** (Docker/EC2):
- Add `YTDL_INTERNAL_API_KEY` to your `.env` file or Docker environment
- Add `DATABASE_URL` to your `.env` file or Docker environment
- Redeploy the ytdl service

**For Vercel** (Next.js app):
- Add `YTDL_INTERNAL_API_KEY` to Vercel Environment Variables
- Redeploy the app

### 3. Update docker-compose.yml (if using Docker)

```yaml
ytdl:
  environment:
    - YTDL_INTERNAL_API_KEY=${YTDL_INTERNAL_API_KEY}
    - DATABASE_URL=${DATABASE_URL}
```

## Testing from Command Line

### Using the test script (recommended):

```bash
cd apps/ytdl

# Set your internal API key
export YTDL_INTERNAL_API_KEY=your_api_key_here

# Test local
./test-ytdl.sh local

# Test production
./test-ytdl.sh prod
```

### Using curl directly:

```bash
# Enqueue a task
curl -X POST http://localhost:3001/trpc/enqueueTask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{"videoUrl":"https://www.youtube.com/watch?v=VIDEO_ID","start":0,"end":5000}'

# Check task status
curl -G http://localhost:3001/trpc/checkTaskStatus \
  -H "X-API-Key: your_api_key_here" \
  --data-urlencode 'input={"taskId":"1"}'
```

## What Gets Logged

Every request to the ytdl service logs:
- **Video URL** - which YouTube video
- **Timestamps** - start/end times for the clip
- **Task ID** - Bull queue job ID
- **Status** - active, completed, or failed
- **Error messages** - if the download fails
- **Created/Completed timestamps** - when the request started and finished

**Note:** The ytdl service logs `userId: null` because it doesn't have user context. User association happens on the app side (in the Next.js tRPC endpoint).

## Security

### Current Protection:
- ✅ API key required for all requests
- ✅ All requests logged to database
- ✅ Can monitor usage in admin panel

### Future Enhancements (if needed):
- IP-based rate limiting
- Request origin validation
- Automatic blocking of suspicious patterns
- VPN rotation based on load

## Troubleshooting

### "Unauthorized: Invalid or missing API key"
- Your API key is wrong or missing
- Check that `YTDL_INTERNAL_API_KEY` matches in both ytdl and app `.env` files
- Restart both services after updating environment variables

### "⚠️ YTDL_INTERNAL_API_KEY not set - running without authentication!"
- The ytdl service is running without auth (unsafe in production)
- Add `YTDL_INTERNAL_API_KEY` to your ytdl `.env` file
- Restart the service

### "⚠️ DATABASE_URL not set - running without database logging"
- The ytdl service can't log to the database
- Add `DATABASE_URL` to your ytdl `.env` file
- Make sure the database is accessible from ytdl service

### Logs not appearing in admin panel
- Check that `DATABASE_URL` is set in ytdl service
- Verify the database connection is working (check ytdl logs)
- Make sure the `generationLogs` table exists (run migrations)
- The ytdl service logs with `userId: null` - filter by that in queries if needed

### Testing fails with API key set
- Double-check the API key matches in both services
- Make sure you're using the right header: `X-API-Key`
- Try regenerating the API key if it has special characters causing issues

## Production Deployment Checklist

When deploying to production:

1. ✅ Generate secure API key (`openssl rand -hex 32`)
2. ✅ Add `YTDL_INTERNAL_API_KEY` to ytdl service environment
3. ✅ Add `YTDL_INTERNAL_API_KEY` to Next.js app environment (Vercel)
4. ✅ Add `DATABASE_URL` to ytdl service environment
5. ✅ Verify ytdl service can connect to database
6. ✅ Test with `./test-ytdl.sh prod`
7. ✅ Check admin panel shows logged requests
8. ✅ Monitor for unauthorized requests (should see 401 errors in logs)

## Monitoring

### Check ytdl service logs:
```bash
# Local
cd apps/ytdl
pnpm start

# Docker
docker logs ytdl-container-name

# EC2
ssh to your instance and check logs
```

Look for:
- `✅ Connected to database for logging` - database connection successful
- `📝 Logged generation request to database` - requests being logged
- `❌ Invalid or missing API key` - unauthorized access attempts

### Check admin panel:
- Visit `/admin` in your Next.js app
- Look for requests with `userId: null` (from ytdl direct logs)
- Monitor for suspicious patterns

## Related Files

- `apps/ytdl/server.ts` - Authentication middleware and logging logic
- `apps/ytdl/test-ytdl.sh` - Test script for command-line testing
- `apps/ytdl/.env.example` - Environment variable template
- `apps/app/src/trpc/routers/video-processing.ts` - App-side API key usage
- `apps/app/ADMIN_PANEL_SETUP.md` - Admin panel documentation

---

Need help? Check the main README or hit up @dreadhalor.
