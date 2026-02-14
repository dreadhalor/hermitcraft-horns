/**
 * Metrics Tracker
 * 
 * Tracks VPN IP address changes, request history, and system health metrics
 */

export interface VpnIpHistory {
  ip: string;
  location: string;
  firstSeen: Date;
  lastSeen: Date;
  requestCount: number;
  successCount: number;
  failureCount: number;
  requests: Array<{
    videoUrl: string;
    timestamp: Date;
    success: boolean;
    error?: string;
    taskId?: string;
  }>;
}

export interface VpnMetrics {
  proxy: string;
  currentIp: string | null;
  currentLocation: string | null;
  ipLastChecked: Date | null;
  ipHistory: VpnIpHistory[];
  totalRequests: number;
  totalSuccess: number;
  totalFailures: number;
  currentIpRequests: number;
  currentIpSuccess: number;
  currentIpFailures: number;
  lastIpChange: Date | null;
  ipChanges: Array<{
    from: { ip: string; location: string } | null;
    to: { ip: string; location: string };
    timestamp: Date;
    reason: string;
  }>;
  allAttempts: Array<{
    videoUrl: string;
    timestamp: Date;
    success: boolean;
    error?: string;
    taskId?: string;
    ip: string | null;
    location: string | null;
  }>;
}

class MetricsTracker {
  private vpnMetrics: Map<string, VpnMetrics> = new Map();
  
  constructor() {
    console.log('📊 Metrics Tracker initialized');
  }

  /**
   * Initialize a VPN proxy in the metrics tracker
   */
  initVpn(proxy: string) {
    if (!this.vpnMetrics.has(proxy)) {
      this.vpnMetrics.set(proxy, {
        proxy,
        currentIp: null,
        currentLocation: null,
        ipLastChecked: null,
        ipHistory: [],
        totalRequests: 0,
        totalSuccess: 0,
        totalFailures: 0,
        currentIpRequests: 0,
        currentIpSuccess: 0,
        currentIpFailures: 0,
        lastIpChange: null,
        ipChanges: [],
        allAttempts: [],
      });
    }
  }

  /**
   * Update VPN IP address (detects changes)
   */
  updateVpnIp(proxy: string, ip: string, location: string, reason: string = 'initial') {
    this.initVpn(proxy);
    const metrics = this.vpnMetrics.get(proxy)!;
    
    const oldIp = metrics.currentIp;
    const oldLocation = metrics.currentLocation;
    
    // Detect IP change
    if (oldIp && oldIp !== ip) {
      console.log(`🔄 VPN IP Change detected for ${proxy}: ${oldIp} → ${ip}`);
      
      metrics.ipChanges.push({
        from: oldIp ? { ip: oldIp, location: oldLocation || 'unknown' } : null,
        to: { ip, location },
        timestamp: new Date(),
        reason,
      });
      
      metrics.lastIpChange = new Date();
      
      // Reset current IP stats
      metrics.currentIpRequests = 0;
      metrics.currentIpSuccess = 0;
      metrics.currentIpFailures = 0;
    }
    
    // Update current IP
    metrics.currentIp = ip;
    metrics.currentLocation = location;
    metrics.ipLastChecked = new Date();
    
    // Update or create IP history entry
    let ipEntry = metrics.ipHistory.find(h => h.ip === ip);
    if (!ipEntry) {
      ipEntry = {
        ip,
        location,
        firstSeen: new Date(),
        lastSeen: new Date(),
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        requests: [],
      };
      metrics.ipHistory.push(ipEntry);
    } else {
      ipEntry.lastSeen = new Date();
      ipEntry.location = location; // Update location in case it changed
    }
  }

  /**
   * Record a request attempt through a VPN
   */
  recordRequest(
    proxy: string,
    ip: string | null,
    location: string | null,
    videoUrl: string,
    success: boolean,
    error?: string,
    taskId?: string
  ) {
    this.initVpn(proxy);
    const metrics = this.vpnMetrics.get(proxy)!;
    
    // Always record to allAttempts (even with unknown IP)
    metrics.allAttempts.push({
      videoUrl,
      timestamp: new Date(),
      success,
      error,
      taskId,
      ip,
      location,
    });
    
    // Keep last 1000 attempts
    if (metrics.allAttempts.length > 1000) {
      metrics.allAttempts.shift();
    }
    
    // Update total counters
    metrics.totalRequests++;
    if (success) {
      metrics.totalSuccess++;
    } else {
      metrics.totalFailures++;
    }
    
    // Update current IP counters
    if (ip === metrics.currentIp) {
      metrics.currentIpRequests++;
      if (success) {
        metrics.currentIpSuccess++;
      } else {
        metrics.currentIpFailures++;
      }
    }
    
    // Add to IP history (only if IP is known)
    if (ip) {
      const ipEntry = metrics.ipHistory.find(h => h.ip === ip);
      if (ipEntry) {
        ipEntry.requestCount++;
        if (success) {
          ipEntry.successCount++;
        } else {
          ipEntry.failureCount++;
        }
        
        // Keep last 100 requests per IP
        ipEntry.requests.push({
          videoUrl,
          timestamp: new Date(),
          success,
          error,
          taskId,
        });
        
        if (ipEntry.requests.length > 100) {
          ipEntry.requests.shift();
        }
      }
    }
  }

  /**
   * Get metrics for a specific VPN
   */
  getVpnMetrics(proxy: string): VpnMetrics | null {
    return this.vpnMetrics.get(proxy) || null;
  }

  /**
   * Get metrics for all VPNs
   */
  getAllVpnMetrics(): VpnMetrics[] {
    return Array.from(this.vpnMetrics.values());
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const vpns = this.getAllVpnMetrics();
    
    return {
      totalVpns: vpns.length,
      totalRequests: vpns.reduce((sum, v) => sum + v.totalRequests, 0),
      totalSuccess: vpns.reduce((sum, v) => sum + v.totalSuccess, 0),
      totalFailures: vpns.reduce((sum, v) => sum + v.totalFailures, 0),
      vpnsWithIpChanges: vpns.filter(v => v.ipChanges.length > 0).length,
      totalIpChanges: vpns.reduce((sum, v) => sum + v.ipChanges.length, 0),
    };
  }

  /**
   * Get recent IP changes across all VPNs
   */
  getRecentIpChanges(limit: number = 10) {
    const allChanges: Array<{
      proxy: string;
      from: { ip: string; location: string } | null;
      to: { ip: string; location: string };
      timestamp: Date;
      reason: string;
    }> = [];
    
    for (const metrics of this.vpnMetrics.values()) {
      for (const change of metrics.ipChanges) {
        allChanges.push({
          proxy: metrics.proxy,
          ...change,
        });
      }
    }
    
    return allChanges
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get all VPN attempts for a specific task
   */
  getVpnAttemptsForTask(taskId: string) {
    const attempts: Array<{
      proxy: string;
      ip: string | null;
      location: string | null;
      timestamp: Date;
      success: boolean;
      error?: string;
      videoUrl: string;
    }> = [];

    // Search through allAttempts (includes unknown IPs)
    for (const metrics of this.vpnMetrics.values()) {
      for (const attempt of metrics.allAttempts) {
        if (attempt.taskId === taskId) {
          attempts.push({
            proxy: metrics.proxy,
            ip: attempt.ip,
            location: attempt.location,
            timestamp: attempt.timestamp,
            success: attempt.success,
            error: attempt.error,
            videoUrl: attempt.videoUrl,
          });
        }
      }
    }

    return attempts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const metricsTracker = new MetricsTracker();
