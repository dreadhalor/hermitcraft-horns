# YTDL Microservice

Audio processing microservice for Hermitcraft Horns. Handles YouTube audio extraction, trimming, and processing.

## Overview

This Express.js server processes audio clips from YouTube videos using `yt-dlp` and FFmpeg. It runs behind a VPN (Gluetun) to avoid YouTube's IP-based rate limiting and uses a Redis-backed job queue (Bull) to handle concurrent requests.

## Features

- **YouTube Audio Extraction**: Downloads audio from any YouTube video
- **Precise Trimming**: Extracts specific time ranges (millisecond precision)
- **Audio Normalization**: Applies loudnorm filter for consistent volume
- **Job Queue**: Bull + Redis for reliable async processing
- **VPN Integration**: Routes through Gluetun to avoid IP blocking
- **Database Logging**: Tracks generation attempts and failures
- **Health Checks**: Monitoring endpoints for production

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js + tRPC
- **Job Queue**: Bull (Redis-backed)
- **Audio Tools**: yt-dlp + FFmpeg
- **VPN**: Gluetun (OpenVPN)
- **Database**: PostgreSQL via Drizzle ORM

## Local Development

### Prerequisites

- Docker & Docker Compose
- pnpm
- Redis (via Docker)

### Quick Start

```bash
# Start all services (gluetun VPN + ytdl + redis)
docker compose -f docker-compose.local.yml up -d

# Or rebuild after code changes
docker compose -f docker-compose.local.yml build ytdl
docker compose -f docker-compose.local.yml up -d
```

The server will be available at `http://localhost:3001`

### Environment Variables

Required in `.env`:
```bash
YTDL_INTERNAL_API_KEY=your-api-key-here
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Production Deployment

### Architecture

The service runs on AWS EC2 with:
- **Gluetun** container for VPN connectivity (ytdl uses `network_mode: "service:gluetun"` so all traffic routes through the VPN)
- **ytdl** container for audio processing (shares gluetun's network stack)
- **Redis** container for job queue

All secrets are managed via **AWS Secrets Manager** and fetched at deployment time using IAM roles.

### Deployment Process

Automated via GitHub Actions (`.github/workflows/deploy-ytdl.yml`):

1. Build Docker image
2. Push to AWS ECR
3. SSH to EC2 instance
4. Fetch secrets from AWS Secrets Manager
5. Pull latest image from ECR
6. Restart containers with new secrets

### Manual Deployment

```bash
# From project root
gh workflow run deploy-ytdl.yml
```

### Container Management

```bash
# Check logs
docker logs ytdl --tail 100
docker logs gluetun --tail 100

# Restart containers
docker compose restart ytdl
docker compose restart gluetun

# Pull and restart with new image
docker compose pull ytdl
docker compose up -d ytdl
```

## API Endpoints

### tRPC Endpoints

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

## Troubleshooting

### Common Issues

**YouTube Download Failures**
- Ensure VPN (Gluetun) is running and connected
- Check EC2 security group allows outbound traffic
- Verify yt-dlp is up to date

**Redis Connection Errors**
- Verify Redis container is running
- Check Redis host/port in environment variables
- Ensure network connectivity between containers

**Out of Disk Space**
- Run `docker system prune -af --volumes` to clean up
- Use `df -h` to check disk usage
- Old Docker images accumulate quickly

### Useful Commands

```bash
# Check container status
docker compose ps

# View real-time logs
docker logs ytdl -f

# Check VPN connection (from inside ytdl, which shares gluetun's network)
docker exec ytdl curl -s https://api.ipify.org

# Restart specific container
docker compose restart ytdl

# Force rebuild and restart
docker compose up -d --build ytdl
```

## VPN Configuration

The service uses Gluetun for VPN connectivity via Docker's `network_mode: "service:gluetun"`.

**Key points:**
- Uses NordVPN (New York server)
- Credentials stored in AWS Secrets Manager
- ytdl shares gluetun's network stack -- all traffic transparently routes through the VPN
- `FIREWALL_OUTBOUND_SUBNETS` whitelists private Docker subnets for internal traffic (Redis, etc.)
- `FIREWALL_INPUT_PORTS=3001` allows incoming connections to ytdl
- Auto-reconnects on connection drops
- Verify VPN routing at `/admin/vpn/verify`

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
- **AWS Secrets Manager**: All credentials stored securely
- **IAM Roles**: EC2 instance uses role-based access (no hardcoded credentials)
- **VPN**: All YouTube traffic routed through VPN
- **Network Isolation**: Container runs in isolated Docker network

## Monitoring

- **Health Checks**: AWS ELB monitors container health
- **Database Logs**: All generation attempts tracked
- **Sentry**: Error tracking (frontend only)
- **CloudWatch**: EC2 metrics and logs

## Contributing

When making changes:

1. Test locally with `pnpm start:dev`
2. Commit changes
3. Push to trigger GitHub Actions deployment
4. Monitor deployment logs
5. Test production endpoint

---

**Note**: This service was originally called `ytdl` after the `ytdl-core` package, but now uses `yt-dlp`. The name stuck.
