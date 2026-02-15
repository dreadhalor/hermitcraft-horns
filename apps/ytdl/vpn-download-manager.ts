/**
 * VPN Download Manager
 *
 * Downloads audio slices via yt-dlp. When running behind gluetun with
 * network_mode: "service:gluetun", ALL traffic is automatically routed
 * through the VPN at the network level -- no proxy configuration needed.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

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
  private outputDir: string;

  constructor(_vpnProxies: string[] = [], outputDir: string = 'media-output') {
    this.outputDir = outputDir;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    console.log('🌐 VPN Download Manager initialized (network-level VPN routing)');
  }

  /**
   * Download audio slice from YouTube video.
   * Traffic routes through VPN automatically via network_mode: "service:gluetun".
   */
  async downloadAudio(options: DownloadOptions): Promise<DownloadResult> {
    const { videoUrl, startMs, endMs, onProgress } = options;
    const outputFilename = path.join(
      this.outputDir,
      `audio_slice_${Date.now()}.mp3`,
    );

    const startTime = this.formatTime(startMs);
    const endTime = this.formatTime(endMs);

    process.stdout.write(`📥 [downloadAudio] Downloading audio slice from ${startTime} to ${endTime}\n`);
    process.stdout.write(`   [downloadAudio] taskId: ${options.taskId}\n`);

    const args = this.buildYtDlpArgs(videoUrl, startTime, endTime, outputFilename);

    const attempt: VpnAttempt = {
      proxy: 'network-level VPN (gluetun)',
      success: false,
      attemptNumber: 1,
    };

    try {
      await this.executeDownload(args, onProgress);
      attempt.success = true;
      console.log('✅ Download complete');
    } catch (error) {
      attempt.error = (error as Error).message;
      process.stdout.write(`❌ [downloadAudio] Failed: ${attempt.error}\n`);
      throw error;
    }

    return {
      filename: outputFilename,
      vpnAttempts: [attempt],
      totalAttempts: 1,
      successfulProxy: attempt.success ? 'network-level VPN' : null,
    };
  }

  /**
   * Get current VPN pool statistics (stub for compatibility)
   */
  getStats(): Array<{ proxy: string; successRate: number; total: number }> {
    return [];
  }

  /**
   * Print current VPN pool status (stub for compatibility)
   */
  printStatus() {
    console.log('VPN routing: network-level via gluetun (no proxy pool)');
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
      'ffmpeg:-af loudnorm=I=-16:LRA=11:TP=-1.5',
      '--no-cache-dir',
      '--newline',
      '-o',
      outputFilename,
      videoUrl,
    ];
  }

  /**
   * Execute yt-dlp download. No proxy needed -- network-level VPN handles routing.
   */
  private executeDownload(
    args: string[],
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Executing: yt-dlp ${args.join(' ')}`);

      const ytdlpProcess = spawn('yt-dlp', args);
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
        console.error(`yt-dlp stderr: ${text}`);
      });

      ytdlpProcess.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ yt-dlp finished successfully');
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
