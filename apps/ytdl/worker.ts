/**
 * Lightweight download worker.
 *
 * Runs behind a gluetun VPN container (network_mode: "service:gluetun-N"),
 * or directly on the bridge network with VPN_MODE=off (residential egress).
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
// 'gluetun' (default) = require the VPN control server on localhost:8000;
// 'off' = direct egress, no VPN layer at all
const VPN_MODE = (process.env.VPN_MODE || 'gluetun').toLowerCase();

// --- Extraction resilience -------------------------------------------------
// PO token provider. Without one YouTube serves "Only images are available" to
// the whole web client family, which is how this service ended up resting on a
// SINGLE working client (visionos) with no fallback -- the 8/19-8/20 outage.
const POT_BASE_URL = process.env.POT_PROVIDER_URL || 'http://pot-provider:4416';

// The extraction ladder. Each rung is a genuinely DIFFERENT YouTube client, so a
// block on one does not imply a block on the next -- that diversity is the entire
// point. Retrying the same command on a second worker (what we used to do) shares
// the yt-dlp build, the args and the egress IP, so it could only ever fail twice.
// '' = let yt-dlp choose, which is the fast path and usually succeeds first try.
//
// Verified working against a live video on 2026-08-22. Clients that returned only
// images or no audio formats that day -- web, web_safari, ios, android, tv -- are
// deliberately omitted. Re-probe with scripts/probe-clients.sh before editing this
// list; YouTube changes which clients work, so trust a fresh probe over the order
// written here.
const DEFAULT_CLIENT_LADDER = ['', 'mweb', 'tv_embedded', 'web_embedded', 'visionos', 'android_vr_no_auth'];

// Overridable at runtime so a shifting YouTube block can be worked around by
// editing compose and restarting, with no rebuild and no code change. Comma
// separated; use "default" for the no-override rung.
//   YTDLP_CLIENT_LADDER=default,mweb,tv_embedded
const CLIENT_LADDER = (process.env.YTDLP_CLIENT_LADDER
  ? process.env.YTDLP_CLIENT_LADDER.split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => (c.toLowerCase() === 'default' ? '' : c))
  : DEFAULT_CLIENT_LADDER);

// The manager gives each worker 120s (vpn-download-manager.ts). Stay inside that
// so a slow ladder never turns into a manager-side timeout with no error detail.
const ATTEMPT_TIMEOUT_MS = 35_000;
const LADDER_BUDGET_MS = 100_000;

// In direct mode the egress IP never changes; fetch ip + geo once and cache.
// Mirrors the shape gluetun's control server returns (public_ip/country/
// region/city) so the manager/UI render direct workers with no special cases.
type DirectEgressInfo = {
  public_ip: string | null;
  country?: string;
  region?: string;
  city?: string;
};
let directEgressInfo: DirectEgressInfo | null = null;
async function fetchDirectEgressInfo(): Promise<DirectEgressInfo> {
  if (directEgressInfo?.public_ip) return directEgressInfo;
  try {
    const r = await fetch(
      'http://ip-api.com/json?fields=query,country,regionName,city',
      { signal: AbortSignal.timeout(3000) },
    );
    if (r.ok) {
      const j = (await r.json()) as any;
      directEgressInfo = {
        public_ip: j.query ?? null,
        country: j.country,
        region: j.regionName,
        city: j.city,
      };
    }
  } catch {
    // non-fatal: direct mode works without knowing its own IP
  }
  return directEgressInfo ?? { public_ip: null };
}

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
  client: string,
): string[] {
  const args = [
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
  ];
  if (POT_BASE_URL) {
    args.push('--extractor-args', `youtubepot-bgutilhttp:base_url=${POT_BASE_URL}`);
  }
  // '' means "no override" -- let yt-dlp pick its own default client.
  if (client) {
    args.push('--extractor-args', `youtube:player_client=${client}`);
  }
  args.push('-o', outputFilename, videoUrl);
  return args;
}

function executeDownload(
  args: string[],
  timeoutMs: number,
): Promise<{ stderrOutput: string }> {
  return new Promise((resolve, reject) => {
    console.log(`[${WORKER_ID}] Executing: yt-dlp ${args.join(' ')}`);

    const ytdlpProcess = spawn('yt-dlp', args);
    let stderrOutput = '';
    let timedOut = false;

    // A hung extraction must not eat the whole ladder budget and starve the
    // remaining clients -- that would reproduce the "one path, no fallback" bug.
    const timer = setTimeout(() => {
      timedOut = true;
      ytdlpProcess.kill('SIGKILL');
    }, timeoutMs);

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

    ytdlpProcess.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });

    ytdlpProcess.on('close', (code: number) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`yt-dlp timed out after ${timeoutMs}ms`));
      } else if (code === 0) {
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

  if (VPN_MODE === 'off') {
    // Same shape as gluetun's publicip payload + status 'running', so the
    // manager's connected-check and the metrics UI treat direct workers as
    // first-class (they ARE running — there's just no tunnel).
    const egress = await fetchDirectEgressInfo();
    result.vpn = { mode: 'direct', ...egress };
    result.vpnStatus = { status: 'running', mode: 'direct' };
    return res.json(result);
  }

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

  // Pre-flight VPN check — fail fast if VPN tunnel is down.
  // Skipped entirely in direct mode: there is no tunnel to be down.
  if (VPN_MODE === 'off') {
    console.log(`[${WORKER_ID}] Direct mode — skipping VPN pre-flight`);
  } else try {
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

  console.log(`[${WORKER_ID}] Download request: ${videoUrl} [${startTime} - ${endTime}]`);

  // Walk the client ladder. First rung that produces a file wins; we only pay for
  // the extra rungs when YouTube is actually refusing one of them.
  const ladderStart = Date.now();
  const failures: string[] = [];

  for (let rung = 0; rung < CLIENT_LADDER.length; rung++) {
    const client = CLIENT_LADDER[rung]!;
    const label = client || 'default';
    const elapsed = Date.now() - ladderStart;

    if (rung > 0 && elapsed > LADDER_BUDGET_MS) {
      failures.push(`(budget exhausted before "${label}")`);
      break;
    }

    const outputFilename = path.join(
      OUTPUT_DIR,
      `download_${WORKER_ID}_${Date.now()}_${label}.mp3`,
    );

    try {
      const attemptTimeout = Math.max(
        10_000,
        Math.min(ATTEMPT_TIMEOUT_MS, LADDER_BUDGET_MS - elapsed),
      );
      await executeDownload(
        buildYtDlpArgs(videoUrl, startTime, endTime, outputFilename, client),
        attemptTimeout,
      );

      if (!fs.existsSync(outputFilename)) {
        throw new Error('yt-dlp reported success but produced no output file');
      }

      const stat = fs.statSync(outputFilename);
      if (rung > 0) {
        console.log(
          `[${WORKER_ID}] RECOVERED on client "${label}" (rung ${rung + 1}/${CLIENT_LADDER.length}) after ${rung} failed client(s)`,
        );
      }
      console.log(`[${WORKER_ID}] Streaming ${stat.size} bytes back to caller`);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('X-Worker-Id', WORKER_ID);
      // Which rung actually worked -- so a shifting YouTube block is visible in
      // logs/metrics well before it becomes a user-facing failure.
      res.setHeader('X-Ytdlp-Client', label);

      const stream = fs.createReadStream(outputFilename);
      stream.pipe(res);
      stream.on('end', () => {
        fs.unlink(outputFilename, () => {});
      });
      stream.on('error', (err) => {
        console.error(`[${WORKER_ID}] Stream error:`, err);
        fs.unlink(outputFilename, () => {});
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream file' });
        }
      });
      return;
    } catch (err) {
      fs.unlink(outputFilename, () => {});
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[${WORKER_ID}] client "${label}" failed: ${message.slice(-200)}`);
      failures.push(`${label}: ${message.slice(-200)}`);
    }
  }

  // Every distinct client refused -- this is a real outage, not a flaky rung.
  const combined = failures.join(' | ');
  console.error(
    `[${WORKER_ID}] Download failed: all ${CLIENT_LADDER.length} clients refused`,
  );

  const isYouTubeBlock =
    combined.includes('403') ||
    combined.includes('Sign in to confirm') ||
    combined.includes('bot') ||
    combined.includes('blocked');

  res.status(isYouTubeBlock ? 403 : 500).json({
    error: `All extraction clients failed -- ${combined}`,
    blocked: isYouTubeBlock,
    worker: WORKER_ID,
    clientsTried: CLIENT_LADDER.map((c) => c || 'default'),
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[${WORKER_ID}] Running on port ${PORT}`);
  console.log(`[${WORKER_ID}] Output dir: ${OUTPUT_DIR}`);
  console.log(
    `[${WORKER_ID}] Client ladder: ${CLIENT_LADDER.map((c) => c || 'default').join(' -> ')}`,
  );
  console.log(`[${WORKER_ID}] PO token provider: ${POT_BASE_URL || '(none)'}`);
});
