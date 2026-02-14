# Local Multi-VPN Testing Guide

Complete guide for testing the multi-VPN download manager locally with real gluetun containers.

## Prerequisites

- Docker Desktop installed and running
- NordVPN credentials in `.env` file
- `jq` installed (`brew install jq` on macOS)

## Setup

Your `.env` file should contain:

```env
NORDVPN_USERNAME=your_username
NORDVPN_PASSWORD=your_password
YTDL_INTERNAL_API_KEY=your_api_key
DATABASE_URL=postgres://...
```

## Quick Start

### 1. Build and Start the Stack

```bash
./test-local.sh
```

This will:
- Build the ytdl Docker image locally
- Start 3 gluetun containers (New York, Los Angeles, Miami)
- Start ytdl server with VPN_PROXIES configured
- Start Redis for job queue

### 2. Verify VPN Connections

```bash
./check-vpn-ips.sh
```

This shows the public IP for each VPN container to verify they're using different servers.

### 3. Test a Download

```bash
./test-download.sh
```

This will:
- Enqueue a download task (Rick Astley - 10 seconds)
- Poll for completion
- Show the VPN journey in the logs

## Manual Testing

### Check Logs

```bash
# All logs
docker-compose -f docker-compose.local.yml logs -f

# Just ytdl logs
docker-compose -f docker-compose.local.yml logs -f ytdl

# Just one gluetun
docker logs gluetun-local-1 -f
```

### Test VPN Status Endpoint

```bash
curl http://localhost:3001/trpc/vpnStatus \
  -H "x-api-key: $YTDL_INTERNAL_API_KEY"
```

### Restart a VPN Container

To test failover, restart one of the gluetun containers:

```bash
docker restart gluetun-local-2
```

Then run another download to see if it automatically uses the other VPNs.

### Check Database Logs

Query your database to see the VPN attempt data:

```sql
SELECT 
  "videoUrl",
  "status",
  "vpnAttempts",
  "vpnProxiesTried",
  "vpnProxiesFailed",
  "vpnProxySuccess",
  "vpnIpAddress",
  "vpnLocation",
  "createdAt"
FROM "generationLogs"
WHERE "source" = 'cli'
ORDER BY "createdAt" DESC
LIMIT 10;
```

## What to Look For

### Successful Single-VPN Download

```
🎬 Processing job 1 for taskId abc-123
   Video: https://youtube.com/watch?v=dQw4w9WgXcQ
   Range: 0ms - 10000ms

🌐 VPN Journey:
   ✅ http://gluetun-1:8888 (New York, US)

   ✨ Success via: http://gluetun-1:8888
   📍 IP: 12.34.56.78
   📍 Location: New York, US

✅ Updated log to completed (taskId: abc-123)
   VPN: http://gluetun-1:8888 (New York, US)
   Attempts: 1 (0 failed)
```

### Multi-VPN Failover

```
🎬 Processing job 2 for taskId def-456
   Video: https://youtube.com/watch?v=jNQXAC9IVRw
   Range: 0ms - 5000ms

🌐 VPN Journey:
   ❌ http://gluetun-1:8888 (New York, US) - Sign in to confirm you're not a bot
   ❌ http://gluetun-2:8888 (Los Angeles, US) - Sign in to confirm you're not a bot
   ✅ http://gluetun-3:8888 (Miami, US)

   ✨ Success via: http://gluetun-3:8888
   📍 IP: 98.76.54.32
   📍 Location: Miami, US

✅ Updated log to completed (taskId: def-456)
   VPN: http://gluetun-3:8888 (Miami, US)
   Attempts: 3 (2 failed)
```

### All VPNs Failed

```
🎬 Processing job 3 for taskId ghi-789
   Video: https://youtube.com/watch?v=blocked-video
   Range: 0ms - 5000ms

🌐 VPN Journey:
   ❌ http://gluetun-1:8888 (New York, US) - Sign in to confirm you're not a bot
   ❌ http://gluetun-2:8888 (Los Angeles, US) - Sign in to confirm you're not a bot
   ❌ http://gluetun-3:8888 (Miami, US) - Sign in to confirm you're not a bot

   ❌ All VPN attempts failed

❌ Updated log to failed (taskId: ghi-789)
```

## Testing Scenarios

### Scenario 1: Normal Operation

All VPNs working, first proxy succeeds:

```bash
./test-download.sh
```

Expected: 1 attempt, success on first VPN

### Scenario 2: First VPN Blocked

Stop gluetun-1, test download:

```bash
docker stop gluetun-local-1
./test-download.sh
```

Expected: 2+ attempts, success on gluetun-2 or gluetun-3

### Scenario 3: Two VPNs Down

```bash
docker stop gluetun-local-1 gluetun-local-2
./test-download.sh
```

Expected: 3 attempts, success on gluetun-3 only

### Scenario 4: Test Different Videos

Edit `test-download.sh` to test different videos:

```bash
# Rick Astley (usually works)
VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Me at the zoo (often blocked)
VIDEO_URL="https://www.youtube.com/watch?v=jNQXAC9IVRw"

# Your target videos
VIDEO_URL="https://www.youtube.com/watch?v=your-video-id"
```

## Cleanup

Stop and remove all containers:

```bash
docker-compose -f docker-compose.local.yml down

# Remove volumes too
docker-compose -f docker-compose.local.yml down -v

# Clean up gluetun data directories
rm -rf gluetun-*-data/
```

## Troubleshooting

### VPN Not Connecting

Check gluetun logs:
```bash
docker logs gluetun-local-1
```

Common issues:
- Invalid NordVPN credentials
- Rate limiting (wait a few minutes)
- Server selection (try different cities)

### Database Connection Failed

Verify DATABASE_URL in `.env` is correct:
```bash
source .env
echo $DATABASE_URL
```

### ytdl Container Crashes

Check logs:
```bash
docker logs ytdl-local
```

Rebuild if code changes weren't picked up:
```bash
docker-compose -f docker-compose.local.yml build ytdl
docker-compose -f docker-compose.local.yml up -d
```

## Performance Testing

Test multiple concurrent downloads:

```bash
for i in {1..5}; do
  ./test-download.sh &
done
wait
```

Then check VPN pool stats to see which VPNs performed best.
