# Hermit Data Sync Scripts

## ⚠️ Important Note

The hermitcraft.com API currently has **outdated profile picture URLs** (old `yt3.ggpht.com/a/AGF-l7-...` format that YouTube no longer reliably serves).

**Recommended approach:**
- Use the client-side fallback system (already implemented in the codebase)
- OR get a YouTube API key and fetch fresh URLs directly from YouTube

## Sync from Hermitcraft API (Updates metadata, but profile pictures may be outdated)

```bash
cd apps/app
pnpm tsx --tsconfig scripts/tsconfig.json scripts/sync-hermits-from-api.ts
```

### What It Does

- Fetches all hermits from `https://hermitcraft.com/api/hermit`
- Updates your database with:
  - Display names
  - Active status
  - Social media links
  - Profile pictures (⚠️ may be outdated)
- Inserts any new hermits automatically

### Output Example

```
🔍 Fetching hermits from hermitcraft.com API...
📝 Found 25 hermits from API

Processing BdoubleO...
  ✅ Updating...
     Old: https://yt3.ggpht.com/a/AGF-l7-old-url...
     New: https://yt3.googleusercontent.com/new-url...

Processing GeminiTay...
  ℹ️  Already up to date

✨ Sync complete!
   Inserted: 0
   Updated: 15
   Unchanged: 10
   Total: 25
```

---

## Alternative - Update from YouTube Directly

If you need to bypass the hermitcraft API and go directly to YouTube:

### Option 1: With YouTube API Key

1. Get a free YouTube Data API v3 key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add to your `.env.local`:
   ```bash
   YOUTUBE_API_KEY=your_api_key_here
   ```
3. Run:
   ```bash
   cd apps/app
   YOUTUBE_API_KEY=your_key pnpm tsx scripts/update-hermit-profile-pictures.ts
   ```

### Option 2: HTML Scraping (No API Key)

```bash
cd apps/app
pnpm tsx scripts/update-hermit-profile-pictures.ts
```

---

## When to Use Which Script

- **`update-hermit-profile-pictures.ts`** (Recommended for profile pictures)
  - Gets fresh profile pictures directly from YouTube
  - Requires API key (free) or uses HTML scraping
  - Most reliable for current profile pictures

- **`sync-hermits-from-api.ts`**
  - Good for syncing metadata (names, social links, active status)
  - Profile pictures from hermitcraft.com API may be outdated
  - No API keys needed

## Current Solution

The codebase already has a **client-side fallback system** that:
1. Tries the ProfilePicture URL from database
2. Falls back to newer YouTube formats using the ChannelID
3. Shows a YouTube icon if all else fails

So broken images are handled gracefully without needing to update the database.
