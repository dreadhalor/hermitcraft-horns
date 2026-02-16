/**
 * Lightweight download worker.
 *
 * Runs behind a gluetun VPN container (network_mode: "service:gluetun-N").
 * Accepts download requests via HTTP, executes yt-dlp, and streams the
 * resulting audio file back in the response.
 */

import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.WORKER_PORT || '3001');
const WORKER_ID = process.env.WORKER_ID || 'worker';
const OUTPUT_DIR = 'media-output';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let simulateBlock = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function buildYtDlpArgs(
  videoUrl: string,
  startTime: string,
  endTime: string,
  outputFilename: string,
): string[] {
  return [
    '--download-sections',
    `*${startTime}-${endTime}`,
    '--force-keyframes-at-cuts',
    '-f',
    'bestaudio',
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
    '--postprocessor-args',
    'ffmpeg:-af loudnorm=I=-16:LRA=11:TP=-1.5',
    '--no-cache-dir',
    '--newline',
    '-o',
    outputFilename,
    videoUrl,
  ];
}

function executeDownload(
  args: string[],
): Promise<{ stderrOutput: string }> {
  return new Promise((resolve, reject) => {
    console.log(`[${WORKER_ID}] Executing: yt-dlp ${args.join(' ')}`);

    const ytdlpProcess = spawn('yt-dlp', args);
    let stderrOutput = '';

    ytdlpProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      const progressMatch = output.match(/(\d+)%/);
      if (progressMatch) {
        const progress = parseInt(progressMatch[1]!, 10);
        if (progress % 10 === 0) {
          console.log(`[${WORKER_ID}] Progress: ${progress}%`);
        }
      }
    });

    ytdlpProcess.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    ytdlpProcess.on('close', (code: number) => {
      if (code === 0) {
        console.log(`[${WORKER_ID}] yt-dlp finished successfully`);
        resolve({ stderrOutput });
      } else {
        const truncated = stderrOutput.trim().slice(-500);
        reject(new Error(`yt-dlp exited with code ${code}: ${truncated}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// POST /simulate-block -- toggle simulated YouTube block for testing failover
// ---------------------------------------------------------------------------

app.post('/simulate-block', (req, res) => {
  const { enabled } = req.body;
  simulateBlock = enabled !== undefined ? Boolean(enabled) : !simulateBlock;
  console.log(`[${WORKER_ID}] Simulate block: ${simulateBlock ? 'ON' : 'OFF'}`);
  res.json({ worker: WORKER_ID, simulateBlock });
});

app.get('/simulate-block', (_req, res) => {
  res.json({ worker: WORKER_ID, simulateBlock });
});

// ---------------------------------------------------------------------------
// GET /health -- worker health + VPN IP info
// ---------------------------------------------------------------------------

app.get('/health', async (_req, res) => {
  const result: any = {
    worker: WORKER_ID,
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Fetch VPN IP from gluetun control server (localhost:8000 via shared network)
  try {
    const ipRes = await fetch('http://localhost:8000/v1/publicip/ip', {
      signal: AbortSignal.timeout(5000),
    });
    if (ipRes.ok) {
      result.vpn = await ipRes.json();
    } else {
      result.vpn = { error: `Control server returned ${ipRes.status}` };
    }
  } catch (err) {
    result.vpn = { error: err instanceof Error ? err.message : String(err) };
  }

  // Fetch VPN connection status
  try {
    const vpnRes = await fetch('http://localhost:8000/v1/vpn/status', {
      signal: AbortSignal.timeout(5000),
    });
    if (vpnRes.ok) {
      result.vpnStatus = await vpnRes.json();
    } else {
      result.vpnStatus = { error: `Control server returned ${vpnRes.status}` };
    }
  } catch (err) {
    result.vpnStatus = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  res.json(result);
});

// ---------------------------------------------------------------------------
// POST /download -- download an audio slice and stream it back
// ---------------------------------------------------------------------------

app.post('/download', async (req, res) => {
  const { videoUrl, startMs, endMs } = req.body;

  if (!videoUrl || startMs == null || endMs == null) {
    return res.status(400).json({ error: 'Missing videoUrl, startMs, or endMs' });
  }

  // Pre-flight VPN check — fail fast if VPN tunnel is down
  try {
    const vpnCheck = await fetch('http://localhost:8000/v1/publicip/ip', {
      signal: AbortSignal.timeout(3000),
    });
    if (!vpnCheck.ok) {
      console.error(`[${WORKER_ID}] VPN pre-flight failed: control server returned ${vpnCheck.status}`);
      return res.status(503).json({
        error: `VPN is not connected (control server returned ${vpnCheck.status})`,
        blocked: false,
        worker: WORKER_ID,
        vpnDown: true,
      });
    }
    const vpnData = await vpnCheck.json() as any;
    if (!vpnData.public_ip) {
      console.error(`[${WORKER_ID}] VPN pre-flight failed: no public IP`);
      return res.status(503).json({
        error: 'VPN is not connected (no public IP)',
        blocked: false,
        worker: WORKER_ID,
        vpnDown: true,
      });
    }
    console.log(`[${WORKER_ID}] VPN pre-flight OK — IP: ${vpnData.public_ip}`);
  } catch (vpnErr) {
    console.error(`[${WORKER_ID}] VPN pre-flight failed:`, vpnErr);
    return res.status(503).json({
      error: `VPN is not reachable: ${vpnErr instanceof Error ? vpnErr.message : String(vpnErr)}`,
      blocked: false,
      worker: WORKER_ID,
      vpnDown: true,
    });
  }

  // Simulated YouTube block for testing failover
  if (simulateBlock) {
    console.log(`[${WORKER_ID}] SIMULATED BLOCK — returning 403`);
    return res.status(403).json({
      error: '[SIMULATED] Sign in to confirm you\'re not a bot. This helps protect our community.',
      blocked: true,
      worker: WORKER_ID,
      simulated: true,
    });
  }

  const startTime = formatTime(startMs);
  const endTime = formatTime(endMs);
  const outputFilename = path.join(OUTPUT_DIR, `download_${WORKER_ID}_${Date.now()}.mp3`);

  console.log(`[${WORKER_ID}] Download request: ${videoUrl} [${startTime} - ${endTime}]`);

  try {
    const args = buildYtDlpArgs(videoUrl, startTime, endTime, outputFilename);
    await executeDownload(args);

    // Verify the file exists
    if (!fs.existsSync(outputFilename)) {
      return res.status(500).json({ error: 'Download succeeded but output file not found' });
    }

    const stat = fs.statSync(outputFilename);
    console.log(`[${WORKER_ID}] Streaming ${stat.size} bytes back to caller`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('X-Worker-Id', WORKER_ID);

    const stream = fs.createReadStream(outputFilename);
    stream.pipe(res);

    stream.on('end', () => {
      // Clean up temp file after streaming
      fs.unlink(outputFilename, () => {});
    });

    stream.on('error', (err) => {
      console.error(`[${WORKER_ID}] Stream error:`, err);
      fs.unlink(outputFilename, () => {});
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });
  } catch (err) {
    // Clean up temp file on error
    fs.unlink(outputFilename, () => {});

    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${WORKER_ID}] Download failed:`, message);

    // Detect YouTube blocks specifically
    const isYouTubeBlock =
      message.includes('403') ||
      message.includes('Sign in to confirm') ||
      message.includes('bot') ||
      message.includes('blocked');

    res.status(isYouTubeBlock ? 403 : 500).json({
      error: message,
      blocked: isYouTubeBlock,
      worker: WORKER_ID,
    });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[${WORKER_ID}] Running on port ${PORT}`);
  console.log(`[${WORKER_ID}] Output dir: ${OUTPUT_DIR}`);
});
