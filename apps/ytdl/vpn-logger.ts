/**
 * VPN Logger
 * 
 * Handles logging VPN attempt details to the database
 */

import type { DownloadResult, VpnAttempt } from './vpn-download-manager';

export interface VpnLogData {
  vpnAttempts: number;
  vpnProxiesTried: string[];
  vpnProxiesFailed: string[];
  vpnProxySuccess: string | null;
  vpnIpAddress: string | null;
  vpnLocation: string | null;
}

/**
 * Extract VPN logging data from download result
 */
export function extractVpnLogData(result: DownloadResult): VpnLogData {
  const proxiesTried = result.vpnAttempts.map(a => a.proxy);
  const proxiesFailed = result.vpnAttempts.filter(a => !a.success).map(a => a.proxy);
  const successAttempt = result.vpnAttempts.find(a => a.success);

  return {
    vpnAttempts: result.totalAttempts,
    vpnProxiesTried: proxiesTried,
    vpnProxiesFailed: proxiesFailed,
    vpnProxySuccess: result.successfulProxy,
    vpnIpAddress: successAttempt?.ip || null,
    vpnLocation: successAttempt?.location || null,
  };
}

/**
 * Format VPN attempt summary for console logging
 */
export function formatVpnSummary(result: DownloadResult): string {
  const lines: string[] = [];
  
  lines.push('\n🌐 VPN Journey:');
  result.vpnAttempts.forEach(attempt => {
    const status = attempt.success ? '✅' : '❌';
    const location = attempt.location || attempt.ip || 'unknown';
    lines.push(`   ${status} ${attempt.proxy} (${location})`);
  });
  
  if (result.successfulProxy) {
    const success = result.vpnAttempts.find(a => a.success)!;
    lines.push(`\n   ✨ Success via: ${result.successfulProxy}`);
    lines.push(`   📍 IP: ${success.ip || 'unknown'}`);
    lines.push(`   📍 Location: ${success.location || 'unknown'}`);
  } else {
    lines.push(`\n   ❌ All ${result.totalAttempts} proxies failed`);
  }
  
  return lines.join('\n');
}
