/**
 * VPN Pool Manager
 * 
 * Manages multiple VPN connections with automatic failover and health monitoring.
 * - Tries VPNs in order of success rate
 * - Tracks performance metrics per VPN
 * - Supports hot-swapping of underperforming VPNs
 */

interface VpnStats {
  proxy: string;
  successes: number;
  failures: number;
  lastUsed: Date;
  consecutiveFailures: number;
}

export class VpnPool {
  private vpns: Map<string, VpnStats> = new Map();
  private readonly maxConsecutiveFailures = 5;
  private readonly minAttemptsBeforeSwap = 10;

  constructor(proxyUrls: string[]) {
    proxyUrls.forEach(proxy => {
      this.vpns.set(proxy, {
        proxy,
        successes: 0,
        failures: 0,
        lastUsed: new Date(0),
        consecutiveFailures: 0,
      });
    });
    console.log(`🌐 VPN Pool initialized with ${proxyUrls.length} proxies:`, proxyUrls);
  }

  /**
   * Get VPNs sorted by success rate (best first)
   */
  getVpnsSortedByPerformance(): string[] {
    const vpnArray = Array.from(this.vpns.values());
    
    return vpnArray
      .sort((a, b) => {
        // Calculate success rate (0-1)
        const totalA = a.successes + a.failures;
        const totalB = b.successes + b.failures;
        
        const rateA = totalA > 0 ? a.successes / totalA : 0.5; // Default to 50% for untested
        const rateB = totalB > 0 ? b.successes / totalB : 0.5;
        
        // Prioritize higher success rate
        if (Math.abs(rateA - rateB) > 0.1) {
          return rateB - rateA;
        }
        
        // If similar success rates, prefer least recently used
        return a.lastUsed.getTime() - b.lastUsed.getTime();
      })
      .map(vpn => vpn.proxy);
  }

  /**
   * Record a successful download through a VPN
   */
  recordSuccess(proxy: string) {
    const vpn = this.vpns.get(proxy);
    if (vpn) {
      vpn.successes++;
      vpn.consecutiveFailures = 0;
      vpn.lastUsed = new Date();
      
      const successRate = this.getSuccessRate(proxy);
      console.log(`✅ VPN ${proxy} success (rate: ${(successRate * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Record a failed download through a VPN
   */
  recordFailure(proxy: string) {
    const vpn = this.vpns.get(proxy);
    if (vpn) {
      vpn.failures++;
      vpn.consecutiveFailures++;
      vpn.lastUsed = new Date();
      
      const successRate = this.getSuccessRate(proxy);
      console.log(`❌ VPN ${proxy} failure (rate: ${(successRate * 100).toFixed(1)}%, consecutive: ${vpn.consecutiveFailures})`);
      
      // Check if this VPN needs hot-swapping
      if (this.shouldSwapVpn(proxy)) {
        console.warn(`🔥 VPN ${proxy} needs hot-swap (${vpn.consecutiveFailures} consecutive failures)`);
        // TODO: Implement hot-swap logic (restart gluetun container with different server)
      }
    }
  }

  /**
   * Get success rate for a VPN (0-1)
   */
  getSuccessRate(proxy: string): number {
    const vpn = this.vpns.get(proxy);
    if (!vpn) return 0;
    
    const total = vpn.successes + vpn.failures;
    return total > 0 ? vpn.successes / total : 0.5;
  }

  /**
   * Check if a VPN should be swapped
   */
  private shouldSwapVpn(proxy: string): boolean {
    const vpn = this.vpns.get(proxy);
    if (!vpn) return false;
    
    const total = vpn.successes + vpn.failures;
    
    // Only swap if we have enough data
    if (total < this.minAttemptsBeforeSwap) return false;
    
    // Swap if too many consecutive failures
    if (vpn.consecutiveFailures >= this.maxConsecutiveFailures) return true;
    
    // Swap if success rate drops below 30%
    const successRate = this.getSuccessRate(proxy);
    return successRate < 0.3;
  }

  /**
   * Get statistics for all VPNs
   */
  getStats(): Array<{ proxy: string; successRate: number; total: number }> {
    return Array.from(this.vpns.values()).map(vpn => ({
      proxy: vpn.proxy,
      successRate: this.getSuccessRate(vpn.proxy),
      total: vpn.successes + vpn.failures,
    }));
  }

  /**
   * Print current VPN pool status
   */
  printStatus() {
    console.log('\n📊 VPN Pool Status:');
    this.getStats().forEach((stat, idx) => {
      const rate = (stat.successRate * 100).toFixed(1);
      const status = stat.successRate > 0.6 ? '🟢' : stat.successRate > 0.4 ? '🟡' : '🔴';
      console.log(`  ${status} ${stat.proxy}: ${rate}% (${stat.total} attempts)`);
    });
    console.log('');
  }
}
