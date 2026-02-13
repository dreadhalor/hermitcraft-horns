/**
 * Sync hermit data from hermitcraft.com API to local database
 * 
 * This updates profile pictures and other hermit metadata from the
 * authoritative hermitcraft.com API.
 * 
 * Usage:
 *   cd apps/app
 *   pnpm tsx scripts/sync-hermits-from-api.ts
 */

import { db } from '../drizzle/db.js';
import { hermitcraftChannels } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

interface HermitFromAPI {
  id: number;
  ChannelName: string;
  DisplayName: string;
  BlueSkyLink: string;
  ProfilePicture: string;
  TwitterName: string | null;
  TwitchName: string | null;
  WebsiteURL: string | null;
  Active: boolean;
  Streaming: boolean;
  YTStreaming: boolean;
  ChannelID: string;
  UploadPlaylistID: string;
}

async function syncHermitsFromAPI() {
  console.log('🔍 Fetching hermits from hermitcraft.com API...');
  
  const response = await fetch('https://hermitcraft.com/api/hermit');
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const apiHermits: HermitFromAPI[] = await response.json();
  console.log(`📝 Found ${apiHermits.length} hermits from API`);
  console.log('');

  let updated = 0;
  let inserted = 0;
  let unchanged = 0;

  for (const apiHermit of apiHermits) {
    console.log(`Processing ${apiHermit.DisplayName}...`);

    // Check if hermit exists in database
    const existingHermit = await db
      .select()
      .from(hermitcraftChannels)
      .where(eq(hermitcraftChannels.ChannelID, apiHermit.ChannelID))
      .limit(1);

    if (existingHermit.length > 0) {
      const existing = existingHermit[0]!;
      
      // Check if ProfilePicture or other fields changed
      const needsUpdate = 
        existing.ProfilePicture !== apiHermit.ProfilePicture ||
        existing.DisplayName !== apiHermit.DisplayName ||
        existing.Active !== apiHermit.Active ||
        existing.TwitterName !== apiHermit.TwitterName ||
        existing.TwitchName !== apiHermit.TwitchName;

      if (needsUpdate) {
        console.log(`  ✅ Updating...`);
        if (existing.ProfilePicture !== apiHermit.ProfilePicture) {
          console.log(`     Old: ${existing.ProfilePicture}`);
          console.log(`     New: ${apiHermit.ProfilePicture}`);
        }

        await db
          .update(hermitcraftChannels)
          .set({
            ChannelName: apiHermit.ChannelName,
            DisplayName: apiHermit.DisplayName,
            ProfilePicture: apiHermit.ProfilePicture,
            TwitterName: apiHermit.TwitterName,
            TwitchName: apiHermit.TwitchName,
            WebsiteURL: apiHermit.WebsiteURL,
            Active: apiHermit.Active,
            Streaming: apiHermit.Streaming,
            YTStreaming: apiHermit.YTStreaming,
            UploadPlaylistID: apiHermit.UploadPlaylistID,
          })
          .where(eq(hermitcraftChannels.ChannelID, apiHermit.ChannelID));

        updated++;
      } else {
        console.log(`  ℹ️  Already up to date`);
        unchanged++;
      }
    } else {
      console.log(`  ➕ Inserting new hermit...`);
      
      await db.insert(hermitcraftChannels).values({
        ChannelID: apiHermit.ChannelID,
        ChannelName: apiHermit.ChannelName,
        DisplayName: apiHermit.DisplayName,
        ProfilePicture: apiHermit.ProfilePicture,
        TwitterName: apiHermit.TwitterName,
        TwitchName: apiHermit.TwitchName,
        WebsiteURL: apiHermit.WebsiteURL,
        Active: apiHermit.Active,
        Streaming: apiHermit.Streaming,
        YTStreaming: apiHermit.YTStreaming,
        UploadPlaylistID: apiHermit.UploadPlaylistID,
      });

      inserted++;
    }
    
    console.log('');
  }

  console.log('✨ Sync complete!');
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log(`   Total: ${apiHermits.length}`);
}

// Run the script
syncHermitsFromAPI()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
