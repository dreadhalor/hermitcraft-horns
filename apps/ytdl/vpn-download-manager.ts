/**
 * VPN Download Manager -- Multi-Worker Orchestrator
 *
 * Dispatches download jobs to remote worker containers via HTTP.
 * Each worker runs behind its own gluetun VPN instance. On failure
 * (YouTube block, timeout, etc.), the manager retries on the next worker.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { metricsTracker } from './metrics-tracker';

export interface DownloadProgress {
  percent: number;
  stage: string;
}

export interface VpnAttempt {
  proxy: string;
  ip?: string;
  location?: string;
  success: boolean;
  error?: string;
  attemptNumber: number;
}

export interface DownloadResult {
  filename: string;
  vpnAttempts: VpnAttempt[];
  totalAttempts: number;
  successfulProxy: string | null;
}

export interface DownloadOptions {
  videoUrl: string;
  startMs: number;
  endMs: number;
  taskId?: string;
  onProgress?: (progress: DownloadProgress) => void;
}

interface WorkerEndpoint {
  id: string;
  host: string;
  port: number;
}

interface WorkerStats {
  endpoint: string;
  attempts: number;
  successes: number;
  failures: number;
  blocks: number;
  lastUsed: string | null;
  lastError: string | null;
  currentJob: { taskId: string; videoUrl: string; startedAt: string } | null;
}

export class VpnDownloadManager {
  private workers: WorkerEndpoint[];
  private outputDir: string;
  private stats: Map<string, WorkerStats>;
  private nextWorkerIndex: number = 0;

  constructor(_vpnProxies: string[] = [], outputDir: string = 'media-output') {
    this.outputDir = outputDir;
    this.stats = new Map();

    // Parse WORKER_ENDPOINTS env var: "gluetun-1:3001,gluetun-2:3001,gluetun-3:3001"
    const workerEndpoints = process.env.WORKER_ENDPOINTS?.split(',').map((e) => e.trim()).filter(Boolean) || [];

    this.workers = workerEndpoints.map((endpoint, i) => {
      const [host, portStr] = endpoint.split(':');
      const id = `worker-${i + 1}`;
      const port = parseInt(portStr || '3001');
      this.stats.set(id, {
        endpoint,
        attempts: 0,
        successes: 0,
        failures: 0,
        blocks: 0,
        lastUsed: null,
        lastError: null,
        currentJob: null,
      });
      return { id, host: host!, port };
    });

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    if (this.workers.length === 0) {
      console.log('🌐 VPN Download Manager initialized (no workers configured -- local fallback)');
    } else {
      console.log(`🌐 VPN Download Manager initialized with ${this.workers.length} workers:`);
      this.workers.forEach((w) => console.log(`   ${w.id}: ${w.host}:${w.port}`));
    }
  }

  /**
   * Download audio slice by dispatching to workers with sequential fallback.
   */
  async downloadAudio(options: DownloadOptions): Promise<DownloadResult> {
    const { videoUrl, startMs, endMs, onProgress } = options;
    const attempts: VpnAttempt[] = [];

    if (this.workers.length === 0) {
      throw new Error('No workers configured. Set WORKER_ENDPOINTS environment variable.');
    }

    // Round-robin: rotate which worker we try first for each job
    const startIdx = this.nextWorkerIndex % this.workers.length;
    this.nextWorkerIndex = (startIdx + 1) % this.workers.length;

    for (let i = 0; i < this.workers.length; i++) {
      const workerIdx = (startIdx + i) % this.workers.length;
      const worker = this.workers[workerIdx]!;
      const attempt: VpnAttempt = {
        proxy: `${worker.id} (${worker.host}:${worker.port})`,
        success: false,
        attemptNumber: i + 1,
      };

      const workerStat = this.stats.get(worker.id)!;
      workerStat.attempts++;
      workerStat.lastUsed = new Date().toISOString();
      workerStat.currentJob = {
        taskId: options.taskId || `unknown`,
        videoUrl,
        startedAt: new Date().toISOString(),
      };

      // Fetch the worker's VPN IP before attempting download
      const vpnInfo = await this.fetchWorkerVpnInfo(worker);
      attempt.ip = vpnInfo.ip || undefined;
      attempt.location = vpnInfo.location || undefined;

      process.stdout.write(`📥 [downloadAudio] Trying ${worker.id} (${worker.host}:${worker.port}) — attempt ${i + 1}/${this.workers.length}\n`);
      if (vpnInfo.ip) {
        process.stdout.write(`   VPN IP: ${vpnInfo.ip} (${vpnInfo.location || 'unknown location'})\n`);
      }

      // Skip this worker immediately if VPN is down (avoids hanging on yt-dlp)
      if (!vpnInfo.ip) {
        const skipMsg = `Worker ${worker.id} VPN is down (no IP) — skipping`;
        process.stdout.write(`⚠️  [downloadAudio] ${skipMsg}\n`);
        attempt.error = skipMsg;
        attempts.push(attempt);
        workerStat.failures++;
        workerStat.lastError = skipMsg;
        workerStat.currentJob = null;
        metricsTracker.recordRequest(
          worker.id, null, null, videoUrl, false, skipMsg, options.taskId,
        );
        if (i < this.workers.length - 1) {
          process.stdout.write(`   Falling back to next worker...\n`);
        }
        continue;
      }

      if (onProgress) {
        onProgress({ percent: 0, stage: `Trying ${worker.id}...` });
      }

      try {
        const outputFilename = path.join(
          this.outputDir,
          `audio_slice_${Date.now()}.mp3`,
        );

        await this.downloadFromWorker(worker, videoUrl, startMs, endMs, outputFilename);

        attempt.success = true;
        workerStat.successes++;
        workerStat.currentJob = null;
        attempts.push(attempt);

        metricsTracker.recordRequest(
          worker.id, vpnInfo.ip, vpnInfo.location, videoUrl, true, undefined, options.taskId,
        );

        process.stdout.write(`✅ [downloadAudio] ${worker.id} succeeded\n`);

        if (onProgress) {
          onProgress({ percent: 100, stage: 'Finalizing' });
        }

        return {
          filename: outputFilename,
          vpnAttempts: attempts,
          totalAttempts: attempts.length,
          successfulProxy: worker.id,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempt.error = message;
        attempts.push(attempt);

        workerStat.failures++;
        workerStat.lastError = message;
        workerStat.currentJob = null;

        metricsTracker.recordRequest(
          worker.id, vpnInfo.ip, vpnInfo.location, videoUrl, false, message, options.taskId,
        );

        const isBlock = message.includes('403') || message.includes('blocked');
        if (isBlock) workerStat.blocks++;

        process.stdout.write(`❌ [downloadAudio] ${worker.id} failed: ${message}\n`);

        if (i < this.workers.length - 1) {
          process.stdout.write(`   Falling back to next worker...\n`);
        }
      }
    }

    // All workers failed
    const summary = attempts
      .map((a) => `${a.proxy}: ${a.error || 'unknown error'}`)
      .join('\n  ');
    throw new Error(`All ${this.workers.length} workers failed:\n  ${summary}`);
  }

  /**
   * Fetch a worker's current VPN IP and location via its /health endpoint.
   */
  private async fetchWorkerVpnInfo(
    worker: WorkerEndpoint,
  ): Promise<{ ip: string | null; location: string | null }> {
    return new Promise((resolve) => {
      const opts: http.RequestOptions = {
        hostname: worker.host,
        port: worker.port,
        path: '/health',
        method: 'GET',
        timeout: 5000,
      };

      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk.toString()));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const ip = parsed.vpn?.public_ip || null;
            const parts = [parsed.vpn?.region, parsed.vpn?.country].filter(Boolean);
            const location = parts.length > 0 ? parts.join(', ') : null;
            resolve({ ip, location });
          } catch {
            resolve({ ip: null, location: null });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ip: null, location: null });
      });

      req.on('error', () => {
        resolve({ ip: null, location: null });
      });

      req.end();
    });
  }

  /**
   * Send a download request to a specific worker and save the streamed response.
   */
  private downloadFromWorker(
    worker: WorkerEndpoint,
    videoUrl: string,
    startMs: number,
    endMs: number,
    outputFilename: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify({ videoUrl, startMs, endMs });

      const opts: http.RequestOptions = {
        hostname: worker.host,
        port: worker.port,
        path: '/download',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 120000, // 2 minute timeout for downloads
      };

      const req = http.request(opts, (res) => {
        if (res.statusCode === 200) {
          // Stream audio file to disk
          const fileStream = fs.createWriteStream(outputFilename);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });
          fileStream.on('error', (err) => {
            fs.unlink(outputFilename, () => {});
            reject(new Error(`Failed to write file: ${err.message}`));
          });
        } else {
          // Non-200: read error body
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const blocked = parsed.blocked ? ' [BLOCKED]' : '';
              reject(new Error(`Worker ${worker.id} returned ${res.statusCode}${blocked}: ${parsed.error || data}`));
            } catch {
              reject(new Error(`Worker ${worker.id} returned ${res.statusCode}: ${data}`));
            }
          });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Worker ${worker.id} timed out after 120s`));
      });

      req.on('error', (err) => {
        reject(new Error(`Worker ${worker.id} unreachable: ${err.message}`));
      });

      req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Get per-worker download statistics.
   */
  getStats(): Array<{ proxy: string; successRate: number; total: number; details: WorkerStats }> {
    return Array.from(this.stats.entries()).map(([id, stat]) => ({
      proxy: id,
      successRate: stat.attempts > 0 ? stat.successes / stat.attempts : 0,
      total: stat.attempts,
      details: stat,
    }));
  }

  /**
   * Print current worker pool status.
   */
  printStatus() {
    if (this.workers.length === 0) {
      console.log('VPN routing: no workers configured');
      return;
    }
    console.log(`VPN Workers (${this.workers.length}):`);
    for (const [id, stat] of this.stats.entries()) {
      const rate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : 0;
      console.log(`  ${id}: ${stat.successes}/${stat.attempts} (${rate}%) blocks=${stat.blocks}`);
    }
  }
}
