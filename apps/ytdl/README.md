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
- View gluetun logs *and* worker logs with noise filtering — yt-dlp's own stderr
  only ever appears in the worker logs, never the gluetun ones
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
- `UPDATER_PERIOD=480h`: Refreshes the server list every 20 days (see below)
- `HTTP_CONTROL_SERVER_LOG=off`: Suppresses per-request control-server access logs

### Reconnection behaviour

Gluetun self-heals on its own: it checks the tunnel every minute (ICMP/DNS) and
every 5 minutes (TCP+TLS), and restarts the VPN client when a check fails. That
internal restart does **not** tear down the network namespace, so the paired
worker keeps its interface and only sees traffic pause.

Two consequences worth knowing:

- **Do not override gluetun's healthcheck.** The image ships its own, which
  queries the internal health server. A custom `healthcheck:` in compose does
  not disable self-healing, but it makes the container's reported health
  meaningless — and every auto-heal tool keys off exactly that signal.
- **A stale server list breaks reconnection permanently.** The server list is
  embedded in the image. If it goes stale and the provider decommissions those
  hosts, gluetun retries dead endpoints forever and no restart helps, because a
  restart reloads the same list. `UPDATER_PERIOD` refreshes it — but the update
  runs *through the tunnel*, so it cannot rescue a container that is already
  stuck. Recovering one of those means pulling a newer gluetun image.

Restarting the gluetun **container** (as opposed to gluetun's internal VPN
restart) destroys the network namespace and leaves the paired worker orphaned
with no network at all. The worker cannot recover on its own. Only
`/manager/gluetun/restart` with `mode: hard` fixes this, because it is the one
code path that restarts both halves of the pair.

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

### CLI

`scripts/ytdl-status.py` wraps the manager's read-only endpoints. It is
GET-only — nothing in it can change the service.

```bash
./scripts/ytdl-status.py                 # summary; exits 1 if anything is degraded
./scripts/ytdl-status.py workers         # per-worker VPN exit IPs
./scripts/ytdl-status.py gluetun         # tunnel state, restart counts, uptime
./scripts/ytdl-status.py system          # container memory; flags stopped containers
./scripts/ytdl-status.py logs gluetun-1  # routed to the right endpoint, noise filtered
./scripts/ytdl-status.py logs worker-2 --raw --tail 400
```

Stdlib only, no install. Point it elsewhere with `YTDL_URL`, e.g.
`YTDL_URL=http://localhost:3001/ ./scripts/ytdl-status.py`.

The noise filter matters more than it sounds: gluetun logs two lines per
control-server request, which is most of any tail you fetch. Use `--raw` only
when you specifically want them.

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

### A Worker Has No IP And Never Recovers

Check the gluetun logs first — with access logging off, tunnel events are
actually visible now. Three different causes look identical from the dashboard:

| Log evidence | Cause | Fix |
|---|---|---|
| Repeated dial failures against the same hosts | Stale embedded server list | Pull a newer gluetun image — restarting will not help |
| `AUTH_FAILED` | Credentials or NordVPN rate limiting | Wait, then hard restart one at a time |
| Gluetun healthy with an IP, but the worker reports none | Worker orphaned from a destroyed network namespace | Hard restart (restarts the pair) |

The generation log distinguishes these too: `vpnProxiesFailed` records the
reason alongside the proxy, so `"worker-3 [ip]: VPN is down (no IP) — skipping"`
is distinguishable from a 403 block after the fact.

Note that a dead worker does **not** produce failed jobs. Jobs fail over to a
peer and complete, so the pool silently runs at reduced capacity. Watch
`vpnAttempts > 1` in the generation logs as the early warning.

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
