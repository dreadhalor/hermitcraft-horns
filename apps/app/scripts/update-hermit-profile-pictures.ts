/**
 * Update hermit profile pictures from YouTube Data API v3
 * 
 * Usage:
 *   cd apps/app
 *   YOUTUBE_API_KEY=your_key pnpm tsx --tsconfig scripts/tsconfig.json scripts/update-hermit-profile-pictures.ts
 */

import { db } from '../drizzle/db.js';
import { hermitcraftChannels } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface YouTubeChannelSnippet {
  title: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
  };
}

async function fetchProfilePictureFromAPI(channelId: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) {
    console.error('No YouTube API key found. Set YOUTUBE_API_KEY environment variable.');
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`API error for ${channelId}:`, response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      console.error(`No channel found for ${channelId}`);
      return null;
    }

    const snippet: YouTubeChannelSnippet = data.items[0].snippet;
    // Use the highest quality available
    return snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url;
  } catch (error) {
    console.error(`Error fetching profile picture for ${channelId}:`, error);
    return null;
  }
}

async function updateHermitProfilePictures() {
  console.log('🔍 Fetching all hermits from database...');
  
  const hermits = await db.select().from(hermitcraftChannels);
  
  console.log(`📝 Found ${hermits.length} hermits to update`);
  console.log('');

  let updated = 0;
  let failed = 0;
  let unchanged = 0;

  for (const hermit of hermits) {
    console.log(`Processing ${hermit.DisplayName} (${hermit.ChannelID})...`);
    
    const newProfilePicture = await fetchProfilePictureFromAPI(hermit.ChannelID);

    if (newProfilePicture && newProfilePicture !== hermit.ProfilePicture) {
      console.log(`  ✅ Updating:`);
      console.log(`     Old: ${hermit.ProfilePicture}`);
      console.log(`     New: ${newProfilePicture}`);
      
      await db
        .update(hermitcraftChannels)
        .set({ ProfilePicture: newProfilePicture })
        .where(eq(hermitcraftChannels.ChannelID, hermit.ChannelID));
      
      updated++;
    } else if (newProfilePicture) {
      console.log(`  ℹ️  Already up to date`);
      unchanged++;
    } else {
      console.log(`  ❌ Failed to fetch new profile picture`);
      failed++;
    }
    
    console.log('');
    
    // Be nice to YouTube's API quota
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('✨ Update complete!');
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Unchanged: ${unchanged}`);
}

// Run the script
updateHermitProfilePictures()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
