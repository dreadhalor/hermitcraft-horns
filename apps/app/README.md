# Hermitcraft Horns - Main App

Yo! This is the main Next.js app for Hermitcraft Horns. It's where all the magic happens - browsing horns, creating clips, uploading files, the whole shebang.

## What's This Thing Do?

It's basically a site where you can:
- Browse & search through Hermitcraft sound clips (aka "horns")
- Create new clips by pulling audio from YouTube videos
- Upload your own audio files
- Filter by hermit, season, time posted, etc.
- Like clips (because who doesn't love a good "SOMEONE DIED" horn?)

## Tech Stack

- **Next.js 14** with App Router (because we're modern like that)
- **tRPC** for type-safe API calls
- **Drizzle ORM** + PostgreSQL (hosted on Vercel)
- **Clerk** for authentication
- **UploadThing** for file uploads
- **Sentry** for error tracking (so I know when stuff breaks)
- **Tailwind CSS** + **Radix UI** for styling
- **Howler.js** for audio playback

## Getting Started

### Prerequisites

You'll need:
- Node.js (v18+)
- pnpm (because that's what we're using for the monorepo)
- A bunch of environment variables (see below)

### Installation

From the monorepo root:

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file in `apps/app/` with these bad boys:

```bash
# Database (Vercel Postgres)
POSTGRES_URL="your_postgres_url"
POSTGRES_PRISMA_URL="your_prisma_url"
# ... other Postgres vars from Vercel

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_key"
CLERK_SECRET_KEY="your_clerk_secret"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# UploadThing
UPLOADTHING_SECRET="your_uploadthing_secret"
UPLOADTHING_APP_ID="your_uploadthing_app_id"

# YouTube Audio Download Service (ytdl microservice)
NEXT_PUBLIC_YTDL_URL="http://localhost:3001/" # or your production URL

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000" # or production URL

# Sentry (for error tracking)
NEXT_PUBLIC_SENTRY_DSN="your_sentry_dsn"
SENTRY_ORG="your_org"
SENTRY_PROJECT="your_project"

# YouTube Data API (for updating hermit profile pictures)
YOUTUBE_API_KEY="your_youtube_api_key"
```

### Running the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and you should see the site!

**Note:** Make sure the `ytdl` microservice is running too if you want to actually generate clips. Otherwise you'll just get error notifications (but hey, at least Sentry will catch 'em).

## Error Tracking & Monitoring

We use **Sentry** to track errors and get notified when things break. The integration includes:

- Automatic error capture on client, server, and edge runtimes
- Custom tags for YouTube audio download failures (so I can tell when the download service is acting up)
- Environment-based filtering (dev vs prod errors)
- User-friendly error notifications that let people know I've been notified

When horn generation fails, the user gets a nice toast notification saying "The admin has been notified and will fix this issue soon" - because let's be honest, it's usually the YouTube download service having a bad day.

## Hermit Profile Picture Management

Hermit profile pictures come from YouTube channel avatars, which occasionally break when YouTube changes their CDN URLs or hermits update their pictures.

We've got two scripts to keep them fresh:

### Option 1: Update from YouTube Data API (Recommended)

Uses the official YouTube API to fetch current profile pictures. Requires a free API key from Google Cloud Console.

```bash
cd apps/app
pnpm tsx --tsconfig scripts/tsconfig.json scripts/update-hermit-profile-pictures.ts
```

The script will:
1. Fetch all hermits from your database
2. Get their current YouTube profile picture URLs (800x800px high quality)
3. Update the database with fresh URLs
4. Show you which ones changed

It respects YouTube's API quota by waiting 200ms between requests.

### Option 2: Sync Metadata from hermitcraft.com API

Updates hermit metadata (names, social links, active status) from the official hermitcraft.com API. Profile pictures from this API are often outdated though, so use Option 1 for images.

```bash
cd apps/app
pnpm tsx --tsconfig scripts/tsconfig.json scripts/sync-hermits-from-api.ts
```

Check out `scripts/README.md` for more details on both options.

## Project Structure

```
apps/app/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   │   └── horn-tile/ # Horn-related components (tiles, filters, etc.)
│   ├── hooks/         # React hooks (including horn generation logic)
│   ├── providers/     # Context providers
│   ├── schemas/       # Zod validation schemas
│   └── trpc/          # tRPC API routes & routers
├── drizzle/           # Database schema & migrations
├── scripts/           # Utility scripts (hermit updates, etc.)
├── public/            # Static assets
└── sentry.*.ts        # Sentry configuration files
```

## Key Features & How They Work

### Horn Generation

1. User pastes a YouTube URL and selects timestamps
2. Frontend calls the `ytdl` microservice via tRPC
3. Microservice downloads the audio, trims it, and returns a buffer
4. Frontend lets user preview and save the clip
5. If anything fails, Sentry captures it and the user gets a notification

There's a 3-minute timeout on clip generation because sometimes YouTube's being slow or the download service is having issues.

### Error Handling

The app has robust error handling for when the YouTube audio download service fails:
- Network connectivity errors
- YouTube download failures  
- Timeouts
- Task queue failures

All of these trigger Sentry alerts with detailed context (video URL, timestamps, error type, etc.) so I can debug issues quickly.

### Hermit Filtering

Users can filter horns by:
- Hermit (who said it)
- Season (1-11 as of Season 11)
- Time posted (last 24h, week, month, year, all time)
- Liked status (show only clips you've liked)

## Database

We're using **Drizzle ORM** with **Vercel Postgres**. The schema includes:
- `users` - User accounts (synced with Clerk)
- `clips` - Horn audio clips
- `hermitcraftChannels` - Hermit metadata (names, profile pictures, etc.)
- `likes` - User likes on clips
- `cachedHermitcraftVideos` - Cached video data from hermitcraft.com

To run migrations:

```bash
pnpm migrate
```

## Deployment

The app is deployed on **Vercel** (because serverless is nice when you don't want to deal with servers).

When you push to `main`, Vercel automatically:
1. Builds the Next.js app
2. Uploads Sentry source maps (for better error stack traces)
3. Deploys to production

The `ytdl` microservice lives on AWS EC2 and connects through a subdomain with an Application Load Balancer handling SSL.

## Troubleshooting

**"Horn generation is stuck on 'Generating...'"**
- The YouTube audio download service (`ytdl`) is probably down or having issues
- Check Sentry for error notifications
- Restart the `ytdl` service on EC2

**"Hermit images aren't loading"**
- Profile picture URLs from YouTube might be outdated
- Run the profile picture update script (see above)

**"I'm getting 'too many redirects' locally"**
- Check that `NEXT_PUBLIC_APP_URL` in `.env.local` is set to `http://localhost:3000`
- Not the production Vercel URL

**"TypeScript errors in scripts"**
- Make sure you're using `--tsconfig scripts/tsconfig.json` when running scripts
- The scripts use path aliases that need the custom tsconfig

## Contributing

Feel free to open issues or PRs! I built this while watching movies so there's probably some janky code in here somewhere. 😅

## License

IDK, do whatever you want with it I guess? Just don't be a jerk about it.

---

Built with ❤️ and probably too much caffeine by @dreadhalor
