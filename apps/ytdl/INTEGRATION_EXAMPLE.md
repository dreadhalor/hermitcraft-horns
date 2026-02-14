# Complete Integration Example

## Changes needed in server.ts

### 1. Add imports at the top
```typescript
import { VpnDownloadManager, DownloadResult } from './vpn-download-manager';
import { extractVpnLogData, formatVpnSummary } from './vpn-logger';
```

### 2. Initialize VPN Download Manager (after database initialization)
```typescript
// Parse VPN proxies from environment
const VPN_PROXIES = process.env.VPN_PROXIES?.split(',').map(p => p.trim()).filter(Boolean) || [];

// Initialize VPN Download Manager
const downloadManager = new VpnDownloadManager(VPN_PROXIES);
```

### 3. Update downloadAudioSlice function signature and implementation

**Replace the entire function with:**
```typescript
async function downloadAudioSlice(
  videoUrl: string,
  startMilliseconds: number,
  endMilliseconds: number,
  taskId: string,
): Promise<DownloadResult> {
  return await downloadManager.downloadAudio({
    videoUrl,
    startMs: startMilliseconds,
    endMs: endMilliseconds,
    onProgress: (progress) => {
      updateTaskProgress(taskId, progress.percent);
    },
  });
}
```

### 4. Update the job processor to use DownloadResult

**Find the job processor (search for `taskQueue.process`), and update:**

```typescript
taskQueue.process(async (job) => {
  const { videoUrl, startMilliseconds, endMilliseconds, taskId } = job.data;
  
  console.log(`\n🎬 Processing job ${job.id} for taskId ${taskId}`);
  console.log(`   Video: ${videoUrl}`);
  console.log(`   Range: ${startMilliseconds}ms - ${endMilliseconds}ms`);

  // Update log to 'active' status
  if (db) {
    try {
      await db
        .update(generationLogs)
        .set({ status: 'active' })
        .where(eq(generationLogs.taskId, taskId));
      console.log(`📝 Updated log to active (taskId: ${taskId})`);
    } catch (error) {
      console.error('Error updating log to active:', error);
    }
  }

  try {
    // Download audio with VPN retry logic - returns DownloadResult
    const downloadResult = await downloadAudioSlice(
      videoUrl,
      startMilliseconds,
      endMilliseconds,
      taskId
    );

    // Log VPN attempt summary
    console.log(formatVpnSummary(downloadResult));

    // Extract VPN data for database
    const vpnData = extractVpnLogData(downloadResult);

    // Update database with completion AND VPN data
    if (db) {
      try {
        await db
          .update(generationLogs)
          .set({
            status: 'completed',
            completedAt: new Date(),
            ...vpnData, // Add VPN tracking data
          })
          .where(eq(generationLogs.taskId, taskId));
        console.log(`✅ Updated log to completed (taskId: ${taskId})`);
        console.log(`   VPN: ${vpnData.vpnProxySuccess} (${vpnData.vpnLocation || vpnData.vpnIpAddress || 'unknown'})`);
        console.log(`   Attempts: ${vpnData.vpnAttempts} (${vpnData.vpnProxiesFailed.length} failed)`);
      } catch (error) {
        console.error('Error updating log:', error);
      }
    }
    
    return downloadResult.filename;

  } catch (error) {
    console.error('Error processing video:', error);
    
    // Update log with failure
    if (db) {
      try {
        await db
          .update(generationLogs)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(generationLogs.taskId, taskId));
        console.log(`❌ Updated log to failed (taskId: ${taskId})`);
      } catch (logError) {
        console.error('Error updating log:', logError);
      }
    }
    
    throw error;
  }
});
```

## Example Console Output

With this logging, you'll see output like:

```
📥 Downloading audio slice from 00:00:10.000 to 00:00:25.000

🌐 Starting multi-VPN download (3 proxies available)
🔄 Attempt 1/3: http://gluetun-1:8888
   IP: 45.144.113.97
   Location: United States, New York, New York City
❌ Attempt 1 failed via http://gluetun-1:8888: yt-dlp exited with code 1

🔄 Attempt 2/3: http://gluetun-2:8888
   IP: 92.119.18.248
   Location: United States, California, Los Angeles
📊 Progress: 50% - Downloading
📊 Progress: 90% - Finalizing
✅ Download successful via http://gluetun-2:8888 (United States, California, Los Angeles)

🌐 VPN Journey:
   ❌ http://gluetun-1:8888 (United States, New York, New York City)
   ✅ http://gluetun-2:8888 (United States, California, Los Angeles)

   ✨ Success via: http://gluetun-2:8888
   📍 IP: 92.119.18.248
   📍 Location: United States, California, Los Angeles

✅ Updated log to completed (taskId: 3)
   VPN: http://gluetun-2:8888 (United States, California, Los Angeles)
   Attempts: 2 (1 failed)
```

## Admin Panel Enhancement

Update the admin panel schema to display VPN data:

```typescript
// In apps/app/drizzle/schema.ts - add same fields
export const generationLogs = pgTable(
  'generationLogs',
  {
    // ... existing fields ...
    vpnAttempts: numeric('vpnAttempts').default('0'),
    vpnProxiesTried: text('vpnProxiesTried').array(),
    vpnProxiesFailed: text('vpnProxiesFailed').array(),
    vpnProxySuccess: text('vpnProxySuccess'),
    vpnIpAddress: text('vpnIpAddress'),
    vpnLocation: text('vpnLocation'),
  }
);
```

The admin panel can then show:
- Which VPN was used for each request
- Success rate per VPN location
- Average attempts per request
- Most reliable VPN proxy/location
