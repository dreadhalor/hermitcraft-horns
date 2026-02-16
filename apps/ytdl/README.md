# YTDL Microservice

Audio processing microservice for Hermitcraft Horns. Handles YouTube audio extraction, trimming, and processing.

## Overview

This service processes audio clips from YouTube videos using `yt-dlp` and FFmpeg. It uses a **multi-worker VPN architecture** with 3 parallel gluetun/worker pairs for redundancy and automatic failover if a worker gets blocked by YouTube. A centralized manager service handles request proxying and provides a control plane for all containers.

## Architecture

```
                    ┌─────────────────┐
                    │    Manager      │  ← Always reachable, proxies to ytdl
                    │   (port 3001)   │    Controls gluetun/worker containers
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │      ytdl       │  ← Primary API, job queue, orchestration
                    │   (Bull queue)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼────────┐ ┌──▼──────────┐
     │  gluetun-1    │ │  gluetun-2  │ │  gluetun-3  │
     │  (New York)   │ │  (Chicago)  │ │ (Los Angeles)│
     │  ┌──────────┐ │ │ ┌──────────┐│ │ ┌──────────┐│
     │  │ worker-1 │ │ │ │ worker-2 ││ │ │ worker-3 ││
     │  └──────────┘ │ │ └──────────┘│ │ └──────────┘│
     └───────────────┘ └─────────────┘ └─────────────┘
              │
     ┌────────▼────────┐
     │     Redis        │  ← Job queue persistence
     └─────────────────┘
```

**Key components:**
- **Manager** (`manager.ts`) — Always-reachable proxy that forwards requests to ytdl and provides container management (status, restart, logs) via the Docker socket and Gluetun control API
- **ytdl** (`server.ts`) — Primary API server, manages the Bull job queue and orchestrates downloads across workers
- **Workers** (`worker.ts`) — Lightweight Express servers that run `yt-dlp`/`ffmpeg`. Each shares its paired gluetun's network via `network_mode: "service:gluetun-N"`
- **Gluetun** — VPN client containers (NordVPN/OpenVPN), each configured to a different city
- **Redis** — Powers the Bull job queue

### How Downloads Work

1. A job is dequeued and assigned to a worker (round-robin rotation)
2. The download manager checks the worker's VPN status before attempting — if VPN is down, it skips immediately
3. If the worker succeeds, the job completes
4. If the worker fails (blocked by YouTube, VPN down, etc.), the failure is recorded and the job is passed to the next worker
5. All attempts (success and failure) are tracked with VPN IP, location, and timestamps

## Features

- **Multi-worker VPN Redundancy**: 3 parallel workers on different VPN locations with automatic failover
- **YouTube Audio Extraction**: Downloads audio from any YouTube video via `yt-dlp`
- **Precise Trimming**: Extracts specific time ranges (millisecond precision) with FFmpeg
- **Audio Normalization**: Applies loudnorm filter for consistent volume
- **Job Queue**: Bull + Redis for reliable async processing
- **Admin Dashboard**: Real-time monitoring, logs, and control at `/admin/metrics`
- **Container Management**: Soft/hard restart, stop VPN, stop container — all from the UI
- **Database Logging**: Tracks generation attempts, VPN routing, and failures
- **Simulate Block**: Test failover by simulating YouTube IP blocks on individual workers

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js + tRPC
- **Job Queue**: Bull (Redis-backed)
- **Audio Tools**: yt-dlp + FFmpeg
- **VPN**: Gluetun (OpenVPN) with NordVPN
- **Database**: PostgreSQL via Drizzle ORM
- **Container Orchestration**: Docker Compose

## Local Development

### Prerequisites

- Docker & Docker Compose
- pnpm
- NordVPN credentials (set in `.env`)

### Quick Start

```bash
# Start all services (3 gluetun + 3 workers + manager + ytdl + redis)
docker compose -f docker-compose.local.yml up -d

# Or rebuild after code changes
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml up -d
```

The manager will be available at `http://localhost:3001` (this is what the frontend talks to).

### Environment Variables

Required in `.env` (in `apps/ytdl/`):
```bash
YTDL_INTERNAL_API_KEY=your-api-key-here
DATABASE_URL=postgresql://...
NORDVPN_USERNAME=your-nordvpn-email
NORDVPN_PASSWORD=your-nordvpn-password
```

Redis is handled internally by Docker Compose — no external config needed.

## Production Deployment

### Deployment Process

Manual trigger via GitHub Actions (`.github/workflows/deploy-ytdl.yml`):

1. Build Docker image for amd64
2. Push to AWS ECR
3. SSH to EC2 and generate `docker-compose.yml`
4. Fetch secrets from AWS Secrets Manager
5. Pull latest images from ECR
6. Restart all containers with `--force-recreate --remove-orphans`

### Deploy

```bash
# From the GitHub Actions tab, or:
gh workflow run deploy-ytdl.yml
```

Deployments are **manual only** — pushing to `main` does not auto-deploy.

### Container Management

Most container management is done through the `/admin/metrics` UI:
- View real-time status of all workers, VPN connections, and infrastructure
- Soft restart (reconnect VPN) or hard restart (recreate container) individual workers
- Stop VPN or stop container for individual workers
- View container logs with noise filtering
- Simulate YouTube IP blocks for testing failover
- Monitor job processing, VPN attempts, and download stats

For direct SSH access:
```bash
# Check all container statuses
docker compose ps

# View logs for a specific service
docker compose logs --tail 100 manager
docker compose logs --tail 100 ytdl
docker compose logs --tail 100 gluetun-1
docker compose logs --tail 100 worker-1
```

## API Endpoints

### tRPC Endpoints (via manager proxy)

**`enqueueTask`**
```typescript
{
  videoUrl: string;
  start: number;      // milliseconds
  end: number;        // milliseconds
  userId: string;
  source: string;
}
// Returns: { taskId: string }
```

**`checkTaskStatus`**
```typescript
{
  taskId: string;
}
// Returns: { status: 'waiting' | 'active' | 'completed' | 'failed', progress: number }
```

### Authentication

All requests require the `x-api-key` header with the internal API key.

## VPN Configuration

Each worker runs inside its paired gluetun container's network via `network_mode: "service:gluetun-N"`, so all outbound traffic (yt-dlp, ffmpeg, curl) transparently routes through the VPN.

**Current VPN locations:**
- **gluetun-1**: New York
- **gluetun-2**: Chicago
- **gluetun-3**: Los Angeles

**Key settings:**
- Provider: NordVPN (OpenVPN)
- Credentials: AWS Secrets Manager (prod) or `.env` (local)
- `FIREWALL_OUTBOUND_SUBNETS`: Whitelists private Docker subnets for internal traffic
- `FIREWALL_INPUT_PORTS=3001`: Allows incoming connections to the worker
- Auto-reconnects on connection drops

### Switching VPN IPs

If a worker's IP gets blocked frequently:

- **Soft restart** (from `/admin/metrics`) reconnects the VPN, usually assigning a different server/IP within the same city
- **Hard restart** recreates the container, also resulting in a new IP
- **Change city**: Edit `SERVER_CITIES` for the relevant gluetun in `deploy-ytdl.yml` and redeploy. Gluetun does not support changing the server location at runtime — it requires a restart with new environment variables

## Database Schema

Generation logs are stored in the `generationLogs` table:

```typescript
{
  id: string;
  userId: string;
  source: 'web' | 'cli';
  videoUrl: string;
  start: string;
  end: string;
  status: 'received' | 'initiated' | 'active' | 'completed' | 'failed';
  errorMessage?: string;
  taskId?: string;
  createdAt: Date;
  completedAt?: Date;
  vpnAttempts?: number;
  vpnProxiesTried?: string[];
  vpnProxiesFailed?: string[];
  vpnProxySuccess?: string;
  vpnIpAddress?: string;
  vpnLocation?: string;
}
```

## Security

- **API Key**: Required for all requests
- **AWS Secrets Manager**: All production credentials stored securely
- **IAM Roles**: EC2 instance uses role-based access (no hardcoded credentials)
- **VPN**: All YouTube traffic routed through VPN tunnels
- **Network Isolation**: Services run in isolated Docker networks
- **Docker Socket**: Only the manager has access (for container management)

## Monitoring

- **`/admin/metrics`**: Real-time dashboard with worker status, job tracking, VPN attempts, download stats, and infrastructure health
- **AWS ELB**: Health checks on the manager service
- **Database Logs**: All generation attempts tracked with VPN routing details
- **Sentry**: Error tracking (frontend)

## Troubleshooting

### YouTube Download Failures
- Check `/admin/metrics` for worker status — are VPNs connected?
- Try soft restarting the affected worker
- If a city's IPs are consistently blocked, change `SERVER_CITIES` and redeploy
- Use "Simulate Block" to test failover behavior

### Redis Connection Errors
- Verify Redis container is running: `docker compose ps redis`
- Check network connectivity between ytdl and redis

### All Workers Down
- Check if gluetun containers are running and healthy
- VPN auth failures (rate limiting) can cause all workers to fail — try hard restarting one at a time
- If persistent, wait a few minutes and redeploy

### Out of Disk Space
- The deploy workflow prunes old images automatically
- For manual cleanup: `docker system prune -af --volumes`

## Contributing

When making changes:

1. Test locally with `docker compose -f docker-compose.local.yml up -d`
2. Verify changes work via `/admin/metrics` and test clip generation
3. Commit and push
4. Manually trigger the deploy workflow from GitHub Actions
5. Verify production at `/admin/metrics`

---

**Note**: This service was originally called `ytdl` after the `ytdl-core` package, but now uses `yt-dlp`. The name stuck.
