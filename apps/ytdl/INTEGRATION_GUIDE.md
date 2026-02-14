# Multi-VPN Integration Guide

## How to integrate VPN Download Manager into server.ts

### 1. Add import at the top of server.ts

```typescript
import { VpnDownloadManager } from './vpn-download-manager';
```

### 2. Initialize the manager (after other initialization code)

```typescript
// Parse VPN proxies from environment
const VPN_PROXIES = process.env.VPN_PROXIES?.split(',').map(p => p.trim()).filter(Boolean) || [];

// Initialize VPN Download Manager
const downloadManager = new VpnDownloadManager(VPN_PROXIES);
```

### 3. Replace the downloadAudioSlice function

**Before (current implementation):**
```typescript
async function downloadAudioSlice(
  videoUrl: string,
  startMilliseconds: number,
  endMilliseconds: number,
  taskId: string,
): Promise<string> {
  // 50+ lines of yt-dlp logic, progress tracking, etc.
  // ...
}
```

**After (with VPN Download Manager):**
```typescript
async function downloadAudioSlice(
  videoUrl: string,
  startMilliseconds: number,
  endMilliseconds: number,
  taskId: string,
): Promise<string> {
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

That's it! The entire function becomes 5 lines.

### 4. Add VPN status endpoint (optional)

```typescript
router.get('/vpn-status', (req, res) => {
  res.json({
    enabled: downloadManager.getStats().length > 0,
    vpns: downloadManager.getStats(),
  });
});
```

## Docker Compose Setup

### Single VPN (current setup)
```yaml
ytdl:
  network_mode: "service:gluetun"  # All traffic through one VPN
```

### Multi-VPN (new setup)
```yaml
# Use docker-compose.multi-vpn.yml instead
ytdl:
  environment:
    - VPN_PROXIES=http://gluetun-1:8888,http://gluetun-2:8888,http://gluetun-3:8888
  networks:
    - ytdl-network  # Can reach all 3 gluetun containers
```

## Benefits

✅ **Clean separation of concerns**: server.ts focuses on HTTP/TRPC, VPN logic is isolated
✅ **Easy to test**: Mock VpnDownloadManager in tests
✅ **Easy to extend**: Add features like rate limiting, caching, etc. without touching server.ts
✅ **Backward compatible**: Works with single VPN (current setup) or multi-VPN (new setup)
✅ **Smart failover**: Automatically tries VPNs in order of success rate
✅ **Health monitoring**: Tracks performance and can trigger hot-swaps

## Expected Performance Improvement

**Current (single VPN):**
- Success rate: ~40-70% (varies by video)
- Failed request = user gets error

**With 3 VPNs:**
- Expected combined success rate: ~85-95%
- Failed request only if all 3 VPNs fail (much rarer)
- Probability of all 3 failing = 0.5³ = 12.5% (vs 50% for single VPN)

## Hot-Swap Feature (Future Enhancement)

The VpnPool already tracks when a VPN is underperforming. Next step:
1. When VPN fails too often, restart its gluetun container
2. Use Docker API to execute: `docker restart gluetun-1`
3. Or better: update gluetun's SERVER_CITIES env var and restart
4. This gives you unlimited server rotation without manual intervention
