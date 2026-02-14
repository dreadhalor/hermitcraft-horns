/**
 * VPN Download Manager
 *
 * High-level abstraction for downloading audio through multiple VPN proxies.
 * Handles all retry logic, proxy selection, and health monitoring internally.
 *
 * Usage from server.ts:
 *   const manager = new VpnDownloadManager(vpnProxies);
 *   const filename = await manager.downloadAudio(videoUrl, startMs, endMs, onProgress);
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { VpnPool } from './vpn-pool';
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

export class VpnDownloadManager {
  private vpnPool: VpnPool | null = null;
  private outputDir: string;

  constructor(vpnProxies: string[] = [], outputDir: string = 'media-output') {
    this.outputDir = outputDir;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Initialize VPN pool if proxies provided
    if (vpnProxies.length > 0) {
      this.vpnPool = new VpnPool(vpnProxies);
      console.log(
        `🌐 VPN Download Manager initialized with ${vpnProxies.length} VPN proxies`,
      );

      // Initialize metrics tracker for each VPN
      vpnProxies.forEach((proxy) => metricsTracker.initVpn(proxy));

      // Print VPN status every 5 minutes
      setInterval(() => this.printStatus(), 5 * 60 * 1000);
    } else {
      console.log(
        '⚠️  VPN Download Manager running in single-VPN mode (no VPN_PROXIES configured)',
      );
    }
  }

  /**
   * Download audio slice from YouTube video.
   * Automatically retries through multiple VPN proxies if available.
   *
   * @returns Download result with filename and VPN attempt details
   */
  async downloadAudio(options: DownloadOptions): Promise<DownloadResult> {
    const { videoUrl, startMs, endMs, onProgress } = options;
    const outputFilename = path.join(
      this.outputDir,
      `audio_slice_${Date.now()}.mp3`,
    );

    const startTime = this.formatTime(startMs);
    const endTime = this.formatTime(endMs);
    
    // Critical debug logging
    const debugLog = `[${new Date().toISOString()}] downloadAudio called:\n` +
      `  taskId: ${options.taskId}\n` +
      `  videoUrl: ${videoUrl}\n` +
      `  vpnPool exists: ${!!this.vpnPool}\n` +
      `  vpnPool type: ${typeof this.vpnPool}\n` +
      `  vpnPool value: ${this.vpnPool}\n`;
    fs.writeFileSync('/tmp/vpn-debug.log', debugLog + '\n', { flag: 'a' });
    
    process.stdout.write(`📥 [downloadAudio] Downloading audio slice from ${startTime} to ${endTime}\n`);
    process.stdout.write(`   [downloadAudio] taskId: ${options.taskId}\n`);
    process.stdout.write(`   [downloadAudio] vpnPool exists: ${!!this.vpnPool}\n`);

    const args = this.buildYtDlpArgs(
      videoUrl,
      startTime,
      endTime,
      outputFilename,
    );

    // Multi-VPN mode: Try each VPN until success
    if (this.vpnPool) {
      process.stdout.write(`   [downloadAudio] Using MULTI-VPN mode\n`);
      return await this.downloadWithVpnPool(
        args,
        videoUrl,
        options.taskId,
        onProgress,
      );
    }

    // Single-VPN mode: Direct download
    process.stdout.write(`   [downloadAudio] Using SINGLE-VPN mode (NO RETRIES!)\n`);
    const singleVpnAttempt: VpnAttempt = {
      proxy: 'direct (single VPN)',
      success: false,
      attemptNumber: 1,
    };

    try {
      await this.executeDownload(args, null, onProgress);
      singleVpnAttempt.success = true;
      console.log('✅ Download complete (single-VPN mode)');
    } catch (error) {
      singleVpnAttempt.error = (error as Error).message;
      process.stdout.write(`❌ [downloadAudio SINGLE-VPN] Failed: ${(error as Error).message}\n`);
      throw error;
    }

    return {
      filename: outputFilename,
      vpnAttempts: [singleVpnAttempt],
      totalAttempts: 1,
      successfulProxy: singleVpnAttempt.success ? 'direct' : null,
    };
  }

  /**
   * Get current VPN pool statistics
   */
  getStats() {
    return this.vpnPool?.getStats() || [];
  }

  /**
   * Print current VPN pool status
   */
  printStatus() {
    this.vpnPool?.printStatus();
  }

  /**
   * Build yt-dlp command arguments
   */
  private buildYtDlpArgs(
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
      '-af loudnorm=I=-16:LRA=11:TP=-1.5',
      '--no-cache-dir',
      '--newline',
      '-o',
      outputFilename,
      videoUrl,
    ];
  }

  /**
   * Download with VPN pool retry logic
   */
  private async downloadWithVpnPool(
    args: string[],
    videoUrl: string,
    taskId?: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<DownloadResult> {
    const vpns = this.vpnPool!.getVpnsSortedByPerformance();
    const outputFilename = args[args.length - 2]!; // Second to last arg
    const vpnAttempts: VpnAttempt[] = [];
    let successfulProxy: string | null = null;

    console.log(
      `\n🌐 Starting multi-VPN download (${vpns.length} proxies available)`,
    );

    for (let i = 0; i < vpns.length; i++) {
      const proxy = vpns[i]!;
      const attempt: VpnAttempt = {
        proxy,
        success: false,
        attemptNumber: i + 1,
      };

      // Declare vpnInfo outside try-catch so it's accessible in catch block
      let vpnInfo: { ip?: string; location?: string } = {};

      try {
        // Get VPN info before attempting
        vpnInfo = await this.getVpnInfo(proxy);
        attempt.ip = vpnInfo.ip;
        attempt.location = vpnInfo.location;

        console.log(`🔄 Attempt ${i + 1}/${vpns.length}: ${proxy}`);
        console.log(`   IP: ${vpnInfo.ip || 'unknown'}`);
        console.log(`   Location: ${vpnInfo.location || 'unknown'}`);

        await this.executeDownload(args, proxy, onProgress);

        // Success!
        attempt.success = true;
        vpnAttempts.push(attempt);
        successfulProxy = proxy;

        this.vpnPool!.recordSuccess(proxy);
        console.log(
          `✅ Download successful via ${proxy} (${vpnInfo.location || vpnInfo.ip})`,
        );

        // Record success in metrics tracker
        metricsTracker.recordRequest(
          proxy,
          vpnInfo.ip || null,
          vpnInfo.location || null,
          videoUrl,
          true,
          undefined,
          taskId,
        );

        this.logVpnSummary(vpnAttempts, successfulProxy);

        return {
          filename: outputFilename,
          vpnAttempts,
          totalAttempts: vpnAttempts.length,
          successfulProxy,
        };
      } catch (error) {
        // Record failure and try next VPN
        attempt.error = (error as Error).message;
        vpnAttempts.push(attempt);

        this.vpnPool!.recordFailure(proxy);
        console.log(
          `❌ Attempt ${i + 1} failed via ${proxy}: ${attempt.error}`,
        );

        // Record failure in metrics tracker
        metricsTracker.recordRequest(
          proxy,
          vpnInfo.ip || null,
          vpnInfo.location || null,
          videoUrl,
          false,
          attempt.error,
          taskId,
        );
      }
    }

    // All VPNs failed
    console.error(`\n❌ All ${vpns.length} VPN proxies failed`);
    this.logVpnSummary(vpnAttempts, null);
    this.vpnPool!.printStatus();

    throw new Error(`All ${vpns.length} VPN proxies failed`);
  }

  /**
   * Get VPN information (IP address and location)
   */
  private async getVpnInfo(
    proxy: string,
  ): Promise<{ ip?: string; location?: string }> {
    try {
      // Extract host from proxy URL (e.g., "gluetun-1" from "http://gluetun-1:8888")
      const host = proxy.replace(/https?:\/\//, '').split(':')[0];

      // Try to get IP info from the gluetun container's control server
      // Gluetun exposes port 8000 for control server
      const controlUrl = `http://${host}:8000/v1/publicip/ip`;

      const response = await fetch(controlUrl, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        const ip = data.public_ip;
        const location = data.country
          ? `${data.country}, ${data.region || ''}, ${data.city || ''}`
              .replace(/, ,/g, ',')
              .replace(/,$/, '')
          : 'unknown';

        // Track IP in metrics
        metricsTracker.updateVpnIp(proxy, ip, location, 'periodic_check');

        return { ip, location };
      }
    } catch (error) {
      // Silently fail - VPN info is nice-to-have, not required
    }

    return { ip: undefined, location: undefined };
  }

  /**
   * Log summary of VPN attempts
   */
  private logVpnSummary(
    attempts: VpnAttempt[],
    successfulProxy: string | null,
  ) {
    console.log('\n📊 VPN Attempt Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total attempts: ${attempts.length}`);

    attempts.forEach((attempt) => {
      const status = attempt.success ? '✅' : '❌';
      const location = attempt.location || attempt.ip || 'unknown';
      console.log(
        `  ${status} Attempt ${attempt.attemptNumber}: ${attempt.proxy} (${location})`,
      );
      if (!attempt.success && attempt.error) {
        console.log(`     Error: ${attempt.error}`);
      }
    });

    if (successfulProxy) {
      const successAttempt = attempts.find((a) => a.success);
      console.log(
        `\n✅ Success via: ${successfulProxy} (${successAttempt?.location || successAttempt?.ip || 'unknown'})`,
      );
    } else {
      console.log('\n❌ All proxies failed');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Execute yt-dlp download with optional proxy
   */
  private executeDownload(
    args: string[],
    proxy: string | null,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use --proxy flag to ensure ALL yt-dlp traffic goes through VPN.
      // Also set http_proxy/HTTPS_PROXY env vars as belt-and-suspenders for ffmpeg subprocesses.
      // The --proxy flag is the primary mechanism; env vars are the fallback.
      const finalArgs = proxy
        ? ['--proxy', proxy, ...args]
        : args;
      const env = proxy
        ? { ...process.env, http_proxy: proxy, HTTP_PROXY: proxy, https_proxy: proxy, HTTPS_PROXY: proxy }
        : process.env;

      const proxyInfo = proxy ? ` (via --proxy ${proxy})` : '';
      console.log(`Executing: yt-dlp ${finalArgs.join(' ')}${proxyInfo}`);

      const ytdlpProcess = spawn('yt-dlp', finalArgs, { env });
      let lastProgress = 0;
      let stderrOutput = '';

      ytdlpProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        const progressMatch = output.match(/(\d+)%/);

        if (progressMatch) {
          const progress = parseInt(progressMatch[1]!, 10);
          if (progress !== lastProgress && progress % 10 === 0) {
            lastProgress = progress;

            const stage = this.getDownloadStage(progress);
            console.log(`📊 Progress: ${progress}% - ${stage}`);

            if (onProgress) {
              onProgress({ percent: progress, stage });
            }
          }
        }
      });

      ytdlpProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderrOutput += text;
        console.error(`yt-dlp error: ${text}`);
      });

      ytdlpProcess.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ Download complete');
          resolve();
        } else {
          const truncatedStderr = stderrOutput.trim().slice(-500);
          console.error(`yt-dlp exited with code ${code}: ${truncatedStderr}`);
          reject(new Error(`yt-dlp exited with code ${code}: ${truncatedStderr}`));
        }
      });
    });
  }

  /**
   * Convert milliseconds to HH:MM:SS.mmm format
   */
  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  /**
   * Get human-readable download stage from progress percentage
   */
  private getDownloadStage(progress: number): string {
    if (progress < 50) return 'Downloading';
    if (progress < 75) return 'Extracting audio';
    if (progress < 90) return 'Preparing output';
    return 'Finalizing';
  }
}
