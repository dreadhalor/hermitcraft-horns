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

// A failed attempt is only actionable if the reason travels with it. Keep the
// entry parseable as "<proxy> [<ip>]: <reason>" so the proxy id is still the
// leading token for anything that groups on it.
const MAX_REASON_CHARS = 400;

function describeFailure(attempt: VpnAttempt): string {
  const reason = (attempt.error || 'unknown error').replace(/\s+/g, ' ').trim();
  const truncated =
    reason.length > MAX_REASON_CHARS
      ? `${reason.slice(0, MAX_REASON_CHARS)}…`
      : reason;
  const where = attempt.ip ? ` [${attempt.ip}]` : '';
  return `${attempt.proxy}${where}: ${truncated}`;
}

/**
 * Extract VPN logging data from a list of attempts.
 *
 * Used by both the success path (via `extractVpnLogData`) and the
 * all-workers-failed path, so a failed job records the same breakdown a
 * successful one does.
 */
export function extractVpnLogDataFromAttempts(
  attempts: VpnAttempt[],
): VpnLogData {
  const successAttempt = attempts.find(a => a.success);

  return {
    vpnAttempts: attempts.length,
    vpnProxiesTried: attempts.map(a => a.proxy),
    vpnProxiesFailed: attempts.filter(a => !a.success).map(describeFailure),
    vpnProxySuccess: successAttempt?.proxy ?? null,
    vpnIpAddress: successAttempt?.ip || null,
    vpnLocation: successAttempt?.location || null,
  };
}

/**
 * Extract VPN logging data from download result
 */
export function extractVpnLogData(result: DownloadResult): VpnLogData {
  return {
    ...extractVpnLogDataFromAttempts(result.vpnAttempts),
    vpnAttempts: result.totalAttempts,
    vpnProxySuccess: result.successfulProxy,
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
