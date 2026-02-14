import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

export interface VpnHealth {
  isAvailable: boolean;
  ip: string | null;
  location: string | null;
  lastChecked: Date;
  consecutiveFailures: number;
  responseTime: number | null;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * Represents a single VPN connection endpoint with health monitoring
 * and execution capabilities.
 */
export class VpnConnector {
  private health: VpnHealth;
  private currentProcess: ChildProcess | null = null;

  constructor(public readonly proxyUrl: string) {
    this.health = {
      isAvailable: true,
      ip: null,
      location: null,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      responseTime: null,
    };
  }

  /**
   * Get current health status
   */
  getHealth(): Readonly<VpnHealth> {
    return { ...this.health };
  }

  /**
   * Check if VPN is available and healthy
   */
  isAvailable(): boolean {
    const maxConsecutiveFailures = 3;
    const staleThresholdMs = 5 * 60 * 1000; // 5 minutes
    
    const timeSinceCheck = Date.now() - this.health.lastChecked.getTime();
    const isStale = timeSinceCheck > staleThresholdMs;
    const hasTooManyFailures = this.health.consecutiveFailures >= maxConsecutiveFailures;
    
    return this.health.isAvailable && !hasTooManyFailures && !isStale;
  }

  /**
   * Fetch current IP and location from VPN
   */
  async checkHealth(): Promise<VpnHealth> {
    const startTime = Date.now();
    
    try {
      // Try to get IP through the proxy
      const response = await axios.get('https://api.ipify.org?format=json', {
        proxy: false, // Disable axios proxy
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false,
        }),
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const ip = response.data?.ip || null;
      const responseTime = Date.now() - startTime;

      // Try to get location info
      let location: string | null = null;
      try {
        const locationResponse = await axios.get(`http://ip-api.com/json/${ip}`, {
          timeout: 5000,
        });
        if (locationResponse.data?.status === 'success') {
          location = `${locationResponse.data.country}, ${locationResponse.data.regionName}, ${locationResponse.data.city}`;
        }
      } catch (locationError) {
        // Location lookup failed, but IP check succeeded
        process.stdout.write(`⚠️  [VPN ${this.proxyUrl}] Location lookup failed\n`);
      }

      this.health = {
        isAvailable: true,
        ip,
        location,
        lastChecked: new Date(),
        consecutiveFailures: 0,
        responseTime,
      };

      process.stdout.write(`✅ [VPN ${this.proxyUrl}] Health check passed (${responseTime}ms)\n`);
      return { ...this.health };
    } catch (error) {
      this.health.consecutiveFailures++;
      this.health.lastChecked = new Date();
      this.health.responseTime = Date.now() - startTime;
      
      if (this.health.consecutiveFailures >= 3) {
        this.health.isAvailable = false;
      }

      process.stdout.write(`❌ [VPN ${this.proxyUrl}] Health check failed (${this.health.consecutiveFailures} consecutive failures): ${error}\n`);
      return { ...this.health };
    }
  }

  /**
   * Execute a command through this VPN proxy
   */
  async execute(
    command: string,
    args: string[],
    onProgress?: (data: string) => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        HTTP_PROXY: this.proxyUrl,
        HTTPS_PROXY: this.proxyUrl,
      };

      process.stdout.write(`[VPN ${this.proxyUrl}] Executing: ${command} ${args.join(' ')}\n`);

      this.currentProcess = spawn(command, args, { env });
      let stdout = '';
      let stderr = '';

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        if (onProgress) {
          onProgress(output);
        }
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
      });

      this.currentProcess.on('close', (code: number) => {
        const duration = Date.now() - startTime;
        this.currentProcess = null;

        if (code === 0) {
          this.health.consecutiveFailures = 0;
          resolve({
            success: true,
            duration,
          });
        } else {
          this.health.consecutiveFailures++;
          reject({
            success: false,
            error: `Process exited with code ${code}`,
            duration,
          });
        }
      });

      this.currentProcess.on('error', (error: Error) => {
        const duration = Date.now() - startTime;
        this.currentProcess = null;
        this.health.consecutiveFailures++;
        
        reject({
          success: false,
          error: error.message,
          duration,
        });
      });
    });
  }

  /**
   * Cancel any running process
   */
  cancel(): boolean {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
      return true;
    }
    return false;
  }

  /**
   * Mark this VPN as failed
   */
  recordFailure(): void {
    this.health.consecutiveFailures++;
    if (this.health.consecutiveFailures >= 3) {
      this.health.isAvailable = false;
    }
  }

  /**
   * Mark this VPN as successful
   */
  recordSuccess(): void {
    this.health.consecutiveFailures = 0;
    this.health.isAvailable = true;
  }

  /**
   * Get a simple string representation
   */
  toString(): string {
    return `VPN(${this.proxyUrl}, available=${this.isAvailable()}, failures=${this.health.consecutiveFailures})`;
  }
}
