# Hermitcraft Horns

A web app for creating, sharing, and browsing Hermitcraft sound clips. Built with a modern stack and deployed across Vercel and AWS.

## Architecture Overview

This is a monorepo built with **Turborepo** that manages both the frontend and backend services.

### Main Components

The infrastructure is split into two primary services in the `/apps` directory:

#### 1. **Main Web App** (`apps/app`)
The primary Next.js application that users interact with.

- **Framework**: Next.js 14 with App Router
- **Deployment**: Vercel (serverless)
- **API Layer**: tRPC endpoints accessed through React Query
- **Database**: PostgreSQL (Vercel Postgres) with Drizzle ORM
- **Auth**: Clerk for user authentication
- **Error Tracking**: Sentry for monitoring and debugging
- **Styling**: Tailwind CSS + Radix UI components

**What it does:**
- Browse and search through Hermitcraft sound clips
- Filter by hermit, season, time posted, etc.
- Create new clips by extracting audio from YouTube videos
- Upload custom audio files
- Like and save favorite clips

Check out `apps/app/README.md` for detailed setup instructions, environment variables, and troubleshooting.

#### 2. **Audio Processing Microservice** (`apps/ytdl`)
A Node.js/Express server that handles YouTube audio extraction and processing.

- **Name Origin**: Originally used `ytdl` package, switched to `yt-dlp` but kept the name
- **Stack**: Express.js + Bull (Redis-backed job queue) + FFmpeg
- **Deployment**: AWS EC2 instance
- **VPN**: Runs behind Gluetun (OpenVPN) via `network_mode` to transparently route all traffic through the VPN
- **Access**: Exposed via Application Load Balancer with SSL at `ytdl.hermitcraft-horns.com`

**What it does:**
- Downloads audio from YouTube videos
- Trims clips to specified timestamps
- Returns processed audio buffers to the frontend
- Handles multiple concurrent clip generation jobs

The VPN setup uses Docker's `network_mode: "service:gluetun"` so all outbound traffic (yt-dlp, ffmpeg, curl) transparently routes through the VPN tunnel.

### Supporting Infrastructure

**Load Balancer (AWS ELB)**
- Handles SSL termination for the ytdl service
- Performs health checks on the EC2 instance
- Routes traffic to the subdomain

**Database (Vercel Postgres)**
- Stores user data, clips, hermit metadata, and likes
- Managed through Drizzle ORM
- Includes caching layer for hermitcraft.com video data

**Redis (Docker on EC2)**
- Powers the Bull job queue for ytdl service
- Ensures clip generation requests don't get lost
- Enables concurrent processing

## Recent Updates

### AWS Secrets Manager Integration
Migrated all sensitive credentials (API keys, database URLs, VPN credentials) from environment files to AWS Secrets Manager. The EC2 instance uses IAM roles to securely fetch secrets at deployment time, eliminating the need for `.env` files in production.

### Improved Loading Experience
Replaced complex progress tracking with a clean, simple loading overlay featuring:
- Animated CSS spinner
- 18 randomized Hermitcraft-themed messages that cycle without repeating
- Elapsed time counter
- No fake progress bars - just honest "generating your horn..." feedback

### VPN Integration for YouTube Downloads
YouTube blocks datacenter IP addresses, causing clip generation to fail. The ytdl service now runs behind Gluetun using `network_mode: "service:gluetun"`, which transparently routes all traffic (yt-dlp metadata requests, ffmpeg stream downloads, etc.) through a NordVPN tunnel. No per-application proxy configuration needed.

### Error Tracking & Monitoring
Integrated Sentry across the entire Next.js app (client, server, and edge runtimes) to catch and report errors automatically. When clip generation fails, users get friendly notifications and I get detailed error reports with context about what went wrong.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (for monorepo management)
- Docker (if running ytdl service locally)

### Installation

```bash
# Clone the repo
git clone https://github.com/dreadhalor/hermitcraft-horns.git
cd hermitcraft-horns

# Install dependencies
pnpm install
```

### Development

**Run the main app:**
```bash
cd apps/app
pnpm dev
```

**Run the ytdl service:**
```bash
cd apps/ytdl
docker compose -f docker-compose.local.yml up
```

Check the individual app READMEs for detailed setup instructions:
- `apps/app/README.md` - Frontend setup, environment variables, scripts
- `apps/ytdl/README.md` - Backend setup, Docker/VPN configuration, troubleshooting

## Monorepo Structure

```
hermitcraft-horns/
├── apps/
│   ├── app/              # Main Next.js application
│   └── ytdl/             # Audio processing microservice
├── packages/
│   ├── audio-editor/     # Shared audio editing components
│   ├── eslint-config/    # Shared ESLint configurations
│   └── typescript-config/# Shared TypeScript configurations
└── turbo.json           # Turborepo configuration
```

## Key Features

**Smart Error Handling**
- 3-minute timeout on clip generation
- Automatic retry logic for transient failures
- User-friendly error messages with admin notifications
- Detailed error tracking in Sentry with custom tags

**Flexible Audio Sources**
- Extract clips from any YouTube video (with timestamps)
- Upload your own audio files via UploadThing
- Preview clips before saving

**Advanced Filtering**
- Filter by hermit (who said it)
- Filter by season (Seasons 1-11)
- Filter by time posted (24h, week, month, year, all time)
- Show only liked clips

**Hermit Management**
- Automatic profile picture updates from YouTube API
- Metadata sync from hermitcraft.com API
- Fallback images for reliability

## Deployment

**Frontend (Vercel)**
- Automatic deployments on push to `main`
- Source map uploads to Sentry for error debugging
- Environment variables managed in Vercel dashboard

**Backend (AWS EC2)**
- Docker Compose orchestration with Gluetun VPN
- Redis for job queue persistence
- Application Load Balancer for SSL and subdomain routing
- AWS Secrets Manager for secure credential management
- IAM roles for instance-level secret access
- Automated health checks and container restarts
- GitHub Actions for CI/CD deployment

## Contributing

Contributions are welcome! The codebase is well-documented and uses modern TypeScript practices throughout. Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests with improvements
- Ask questions about the architecture

## Tech Stack Summary

**Frontend:**
- Next.js 14, React, TypeScript
- tRPC, React Query, Zod
- Tailwind CSS, Radix UI, Shadcn/ui
- Clerk (auth), UploadThing (files), Sentry (errors)

**Backend:**
- Express.js, Node.js, TypeScript
- Bull (job queue), Redis, FFmpeg
- yt-dlp, Gluetun (VPN)

**Infrastructure:**
- Vercel (frontend hosting)
- AWS EC2, ELB, Route53, Secrets Manager, IAM
- Docker, Docker Compose
- PostgreSQL (Vercel Postgres)
- GitHub Actions (CI/CD)

## License

Do whatever you want with it - MIT or whatever. Just maybe give a shoutout if you find it useful!

---

Built by [@dreadhalor](https://github.com/dreadhalor) • Check out the live site at [hermitcraft-horns.com](https://hermitcraft-horns.com)
