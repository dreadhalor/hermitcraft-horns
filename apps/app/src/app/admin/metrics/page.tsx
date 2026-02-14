'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/trpc/client';

interface VpnProxy {
  proxy: string;
  currentIp: string | null;
  currentLocation: string | null;
  ipLastChecked: string | null;
  stats: {
    total: {
      requests: number;
      success: number;
      failures: number;
      successRate: string;
    };
    currentIp: {
      requests: number;
      success: number;
      failures: number;
      successRate: string;
    };
  };
  lastIpChange: string | null;
  ipChangeCount: number;
  ipChanges: Array<{
    from: { ip: string; location: string } | null;
    to: { ip: string; location: string };
    timestamp: string;
    reason: string;
  }>;
  ipHistory: Array<{
    ip: string;
    location: string;
    firstSeen: string;
    lastSeen: string;
    requests: number;
    success: number;
    failures: number;
    successRate: string;
    recentRequests: Array<{
      videoUrl: string;
      timestamp: string;
      success: boolean;
      error?: string;
      taskId?: string;
    }>;
  }>;
}

interface VpnConnectionStatus {
  proxy: string;
  connected: boolean;
  ip: string | null;
  location: string | null;
  responseTimeMs: number | null;
  error?: string;
}

interface MetricsData {
  timestamp: string;
  vpnConnectionStatus?: VpnConnectionStatus[];
  vpn: {
    summary: {
      totalVpns: number;
      totalRequests: number;
      totalSuccess: number;
      totalFailures: number;
      vpnsWithIpChanges: number;
      totalIpChanges: number;
    };
    proxies: VpnProxy[];
    recentIpChanges: any[];
  };
  queue: {
    stats: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: number;
    };
    activeJobs: any[];
    waitingJobs: any[];
    recentCompleted?: any[];
    recentFailed?: any[];
  };
  system: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
  jobs?: Array<{
    id: string;
    taskId: string;
    userId: string | null;
    source: string;
    videoUrl: string;
    startMs: number;
    endMs: number;
    status: 'waiting' | 'active' | 'completed' | 'failed';
    errorMessage: string | null;
    timestamp: number;
    processedOn: number | null;
    finishedOn: number | null;
    progress: number;
    attemptsMade: number;
    failedReason?: string;
    vpnAttempts: Array<{
      proxy: string;
      ip: string;
      location: string;
      timestamp: string;
      success: boolean;
      error?: string;
    }>;
    vpnAttemptsCount: number;
    vpnProxiesTried: string[];
    vpnProxiesFailed: string[];
    vpnProxySuccess: string | null;
    vpnIpAddress: string | null;
    vpnLocation: string | null;
    vpnSuccessful: boolean;
  }>;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [restartingVpn, setRestartingVpn] = useState<string | null>(null);

  // Fetch all users to build userId -> username lookup
  const { data: allUsers } = trpc.getAllUsers.useQuery();
  const usernameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (allUsers) {
      for (const user of allUsers) {
        map.set(user.id, user.username);
      }
    }
    return map;
  }, [allUsers]);
  const [vpnLogs, setVpnLogs] = useState<Record<string, string | null>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const [filterLogNoise, setFilterLogNoise] = useState(true);

  const fetchMetrics = async () => {
    try {
      const ytdlUrl = process.env.NEXT_PUBLIC_YTDL_URL || 'http://localhost:3001/';
      const response = await fetch(`${ytdlUrl}metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearQueue = async () => {
    if (!confirm('Are you sure you want to clear ALL jobs from the queue? This cannot be undone.')) {
      return;
    }
    
    setClearing(true);
    try {
      const ytdlUrl = process.env.NEXT_PUBLIC_YTDL_URL || 'http://localhost:3001/';
      const response = await fetch(`${ytdlUrl}admin/clear-queue`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to clear queue');
      
      // Refresh metrics after clearing
      await fetchMetrics();
      alert('Queue cleared successfully!');
    } catch (err) {
      alert(`Error clearing queue: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClearing(false);
    }
  };

  const restartVpn = async (proxy: string, mode: 'soft' | 'hard') => {
    const modeLabel = mode === 'hard' ? 'Hard restart (container restart)' : 'Soft restart (reconnect)';
    if (!confirm(`${modeLabel} for ${proxy}?\n\n${mode === 'hard' ? 'This will fully restart the container, forcing a new VPN server. Takes 15-45 seconds.' : 'This will toggle the VPN connection. Takes 10-30 seconds.'}`)) {
      return;
    }
    setRestartingVpn(proxy);
    try {
      const ytdlUrl = process.env.NEXT_PUBLIC_YTDL_URL || 'http://localhost:3001/';
      const response = await fetch(`${ytdlUrl}admin/vpn/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxy, mode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to restart VPN');
      alert(data.message);
      // Refresh after a delay - hard restarts take longer
      setTimeout(fetchMetrics, mode === 'hard' ? 8000 : 3000);
    } catch (err) {
      alert(`Error restarting VPN: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRestartingVpn(null);
    }
  };

  const fetchVpnLogs = async (proxy: string) => {
    if (vpnLogs[proxy] !== undefined) {
      // Toggle: if logs are already shown, hide them
      setVpnLogs(prev => {
        const next = { ...prev };
        delete next[proxy];
        return next;
      });
      return;
    }
    setLoadingLogs(proxy);
    try {
      const ytdlUrl = process.env.NEXT_PUBLIC_YTDL_URL || 'http://localhost:3001/';
      const response = await fetch(`${ytdlUrl}admin/vpn/logs?proxy=${encodeURIComponent(proxy)}&tail=150`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
      setVpnLogs(prev => ({ ...prev, [proxy]: data.logs }));
    } catch (err) {
      setVpnLogs(prev => ({
        ...prev,
        [proxy]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    } finally {
      setLoadingLogs(null);
    }
  };

  const refreshVpnLogs = async (proxy: string) => {
    setLoadingLogs(proxy);
    try {
      const ytdlUrl = process.env.NEXT_PUBLIC_YTDL_URL || 'http://localhost:3001/';
      const response = await fetch(`${ytdlUrl}admin/vpn/logs?proxy=${encodeURIComponent(proxy)}&tail=150`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
      setVpnLogs(prev => ({ ...prev, [proxy]: data.logs }));
    } catch (err) {
      setVpnLogs(prev => ({
        ...prev,
        [proxy]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    } finally {
      setLoadingLogs(null);
    }
  };

  const filterLogs = (raw: string): string => {
    if (!filterLogNoise) return raw;
    return raw
      .split('\n')
      .filter((line) => {
        // Filter out gluetun auth warnings and routine 200 GET /v1/publicip/ip lines
        if (line.includes('is unprotected by default, please set up authentication')) return false;
        if (line.includes('200 GET /v1/publicip/ip')) return false;
        return true;
      })
      .join('\n');
  };

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading metrics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchMetrics} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">VPN & System Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '🔴 Auto-refresh: ON' : '⚪ Auto-refresh: OFF'}
          </Button>
          <Button onClick={fetchMetrics} variant="outline">
            🔄 Refresh Now
          </Button>
          <Button 
            onClick={clearQueue} 
            variant="destructive"
            disabled={clearing}
          >
            {clearing ? '⏳ Clearing...' : '🗑️ Clear Queue'}
          </Button>
        </div>
      </div>

      {/* VPN Connection Status - always visible */}
      {metrics.vpnConnectionStatus && metrics.vpnConnectionStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔌 VPN Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.vpnConnectionStatus.map((vpn) => (
                <div
                  key={vpn.proxy}
                  className={`border rounded-lg p-4 space-y-3 ${
                    vpn.connected
                      ? 'border-green-300 bg-green-50'
                      : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{vpn.proxy}</span>
                    <Badge variant={vpn.connected ? 'default' : 'destructive'}>
                      {vpn.connected ? '🟢 Connected' : '🔴 Disconnected'}
                    </Badge>
                  </div>
                  {vpn.connected ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">IP:</span>
                        <span className="font-mono">{vpn.ip}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{vpn.location || 'Unknown'}</span>
                      </div>
                      {vpn.responseTimeMs != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Latency:</span>
                          <span>{vpn.responseTimeMs}ms</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-700">
                      {vpn.error || 'Unable to connect'}
                    </div>
                  )}
                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant={vpn.connected ? 'outline' : 'default'}
                          disabled={restartingVpn === vpn.proxy}
                          className="text-xs"
                        >
                          {restartingVpn === vpn.proxy ? '⏳ Restarting...' : '🔄 Restart VPN'}
                          <ChevronDownIcon className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => restartVpn(vpn.proxy, 'soft')}>
                          <div>
                            <div className="font-medium">🔄 Soft Restart</div>
                            <div className="text-xs text-muted-foreground">Reconnect VPN (same container)</div>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => restartVpn(vpn.proxy, 'hard')} className="text-red-600 focus:text-red-600">
                          <div>
                            <div className="font-medium">🔁 Hard Restart</div>
                            <div className="text-xs text-muted-foreground">Restart container (new server)</div>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchVpnLogs(vpn.proxy)}
                      disabled={loadingLogs === vpn.proxy}
                      className="text-xs"
                    >
                      {loadingLogs === vpn.proxy
                        ? '⏳ Loading...'
                        : vpnLogs[vpn.proxy] !== undefined
                          ? '📋 Hide Logs'
                          : '📋 View Logs'}
                    </Button>
                  </div>
                  {/* Inline log viewer */}
                  {vpnLogs[vpn.proxy] !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted-foreground">Container Logs</span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterLogNoise}
                              onChange={(e) => setFilterLogNoise(e.target.checked)}
                              className="h-3 w-3 rounded"
                            />
                            <span className="text-xs text-muted-foreground">Filter noise</span>
                          </label>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => refreshVpnLogs(vpn.proxy)}
                          disabled={loadingLogs === vpn.proxy}
                          className="text-xs h-6 px-2"
                        >
                          {loadingLogs === vpn.proxy ? '⏳' : '🔄'}
                        </Button>
                      </div>
                      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all font-mono">
                        {filterLogs(vpnLogs[vpn.proxy] || '') || 'No logs available (all lines filtered)'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" defaultValue={['all-jobs', 'vpn-summary', 'queue-status']} className="space-y-4">

        {/* All Jobs - Chronological */}
        {metrics.jobs && metrics.jobs.length > 0 && (
          <AccordionItem value="all-jobs" className="border-b-0">
            <Card>
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <CardTitle className="flex items-center gap-2">📋 All Jobs (Chronological) ({metrics.jobs.length})</CardTitle>
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {metrics.jobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4 space-y-2">
                        {/* Job Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">Job #{job.taskId}</span>
                            <Badge 
                              variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'failed' ? 'destructive' :
                                job.status === 'active' ? 'secondary' :
                                'outline'
                              }
                            >
                              {job.status === 'completed' && '✅ Completed'}
                              {job.status === 'failed' && '❌ Failed'}
                              {job.status === 'active' && '🔄 Active'}
                              {job.status === 'waiting' && '⏳ Waiting'}
                            </Badge>
                            {job.vpnAttemptsCount > 0 && (
                              <Badge variant="outline">
                                {job.vpnAttemptsCount} VPN attempt{job.vpnAttemptsCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(job.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {/* Video Info */}
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Video:</span>
                            <span className="font-mono text-xs truncate flex-1">{job.videoUrl}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                            <div>Range: {(job.startMs / 1000).toFixed(1)}s - {(job.endMs / 1000).toFixed(1)}s</div>
                            {job.progress > 0 && <div>Progress: {job.progress}%</div>}
                            {job.userId && <div>User: <span className="font-mono" title={job.userId}>{usernameMap.get(job.userId) || job.userId}</span></div>}
                            {job.source && <div>Source: <Badge variant="outline" className="text-xs px-1 py-0">{job.source}</Badge></div>}
                          </div>
                          {/* Timing info */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            {job.processedOn && (
                              <div>Started: {new Date(job.processedOn).toLocaleTimeString()}</div>
                            )}
                            {job.finishedOn && (
                              <div>Finished: {new Date(job.finishedOn).toLocaleTimeString()}</div>
                            )}
                            {job.processedOn && job.finishedOn && (
                              <div>Duration: {((job.finishedOn - job.processedOn) / 1000).toFixed(1)}s</div>
                            )}
                          </div>
                        </div>

                        {/* VPN Summary */}
                        {job.vpnAttemptsCount > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-muted-foreground">VPN:</span>
                            {job.vpnProxySuccess && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                Success: {job.vpnProxySuccess}
                              </Badge>
                            )}
                            {job.vpnIpAddress && (
                              <span className="font-mono text-muted-foreground">{job.vpnIpAddress}</span>
                            )}
                            {job.vpnLocation && (
                              <span className="text-muted-foreground">({job.vpnLocation})</span>
                            )}
                            {job.vpnProxiesFailed?.length > 0 && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                                Failed: {job.vpnProxiesFailed.join(', ')}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* VPN Attempts */}
                        {job.vpnAttempts.length > 0 ? (
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs font-semibold mb-2">VPN Attempts:</div>
                            <div className="space-y-1">
                              {job.vpnAttempts.map((attempt, idx) => (
                                <div 
                                  key={idx} 
                                  className={`text-xs p-2 rounded ${attempt.success ? 'bg-green-50' : 'bg-red-50'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span>{attempt.success ? '✅' : '❌'}</span>
                                      <span className="font-mono">{attempt.proxy}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {attempt.ip}
                                      </Badge>
                                      <span className="text-muted-foreground">{attempt.location}</span>
                                    </div>
                                    <span className="text-muted-foreground">
                                      {new Date(attempt.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  {attempt.error && (
                                    <div className="mt-1 text-xs font-mono text-red-700">
                                      Error: {attempt.error}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs text-muted-foreground italic">
                              No VPN attempts recorded for this job
                            </div>
                          </div>
                        )}

                        {/* Failure Reason */}
                        {job.status === 'failed' && job.failedReason && (
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs font-mono text-red-700 bg-red-100 p-2 rounded">
                              {job.failedReason}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        {/* VPN Summary */}
        <AccordionItem value="vpn-summary" className="border-b-0">
          <Card>
            <AccordionTrigger className="hover:no-underline px-6 py-4">
              <CardTitle className="flex items-center gap-2">🌐 VPN Summary</CardTitle>
              <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{metrics.vpn.summary.totalVpns}</div>
                    <div className="text-sm text-muted-foreground">Total VPNs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics.vpn.summary.totalRequests}</div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{metrics.vpn.summary.totalSuccess}</div>
                    <div className="text-sm text-muted-foreground">Successes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{metrics.vpn.summary.totalFailures}</div>
                    <div className="text-sm text-muted-foreground">Failures</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics.vpn.summary.vpnsWithIpChanges}</div>
                    <div className="text-sm text-muted-foreground">VPNs w/ IP Changes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics.vpn.summary.totalIpChanges}</div>
                    <div className="text-sm text-muted-foreground">Total IP Changes</div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Queue Status */}
        <AccordionItem value="queue-status" className="border-b-0">
          <Card>
            <AccordionTrigger className="hover:no-underline px-6 py-4">
              <CardTitle className="flex items-center gap-2">📦 Queue Status</CardTitle>
              <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{metrics.queue.stats.waiting}</div>
                    <div className="text-sm text-muted-foreground">Waiting</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{metrics.queue.stats.active}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{metrics.queue.stats.completed}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{metrics.queue.stats.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics.queue.stats.delayed}</div>
                    <div className="text-sm text-muted-foreground">Delayed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics.queue.stats.paused}</div>
                    <div className="text-sm text-muted-foreground">Paused</div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* VPN Proxies */}
        <AccordionItem value="vpn-proxies" className="border-b-0">
          <Card>
            <AccordionTrigger className="hover:no-underline px-6 py-4">
              <CardTitle className="flex items-center gap-2">🌐 VPN Proxies ({metrics.vpn.proxies.length})</CardTitle>
              <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0 space-y-4">
                {metrics.vpn.proxies.map((vpn, idx) => (
                  <div key={idx} className={`border rounded-lg p-4 space-y-4 ${!vpn.currentIp ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg">{vpn.proxy}</div>
                        {vpn.currentIp ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {vpn.currentLocation || 'Unknown'} • {vpn.currentIp}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            ⚪ Not yet used
                          </p>
                        )}
                      </div>
                      <Badge variant={vpn.stats.total.requests > 0 ? 'default' : 'secondary'}>
                        {vpn.stats.total.successRate} success rate
                      </Badge>
                    </div>

                    {/* Current Stats */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-bold">{vpn.stats.total.requests}</div>
                        <div className="text-muted-foreground">Requests</div>
                      </div>
                      <div>
                        <div className="font-bold text-green-600">{vpn.stats.total.success}</div>
                        <div className="text-muted-foreground">Success</div>
                      </div>
                      <div>
                        <div className="font-bold text-red-600">{vpn.stats.total.failures}</div>
                        <div className="text-muted-foreground">Failures</div>
                      </div>
                      <div>
                        <div className="font-bold">{vpn.ipChangeCount}</div>
                        <div className="text-muted-foreground">IP Changes</div>
                      </div>
                    </div>

                    {/* IP History */}
                    {vpn.ipHistory.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2">IP History</h4>
                          <div className="space-y-2">
                            {vpn.ipHistory.map((ip, ipIdx) => (
                              <div key={ipIdx} className="text-sm border rounded p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-mono">{ip.ip}</span>
                                  <Badge variant="outline">{ip.successRate}</Badge>
                                </div>
                                <div className="text-muted-foreground">
                                  {ip.location} • {ip.requests} requests ({ip.success} ✓, {ip.failures} ✗)
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  First seen: {new Date(ip.firstSeen).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Recent Requests */}
                    {vpn.ipHistory.length > 0 && vpn.ipHistory[0].recentRequests.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2">Recent Requests</h4>
                          <div className="space-y-1 text-xs">
                            {vpn.ipHistory[0].recentRequests.slice(0, 5).map((req, reqIdx) => (
                              <div key={reqIdx} className="flex items-center gap-2">
                                <span>{req.success ? '✅' : '❌'}</span>
                                <span className="font-mono">{req.taskId}</span>
                                <span className="text-muted-foreground truncate flex-1">
                                  {req.videoUrl}
                                </span>
                                <span className="text-muted-foreground">
                                  {new Date(req.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* IP Changes */}
                    {vpn.ipChanges.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2">IP Change History</h4>
                          <div className="space-y-2 text-sm">
                            {vpn.ipChanges.slice(0, 5).map((change, changeIdx) => (
                              <div key={changeIdx} className="border rounded p-2">
                                <div className="flex items-center gap-2">
                                  <span>{change.from?.ip || 'Initial'}</span>
                                  <span>→</span>
                                  <span className="font-semibold">{change.to.ip}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(change.timestamp).toLocaleString()} • {change.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Queue Details */}
        <AccordionItem value="queue-details" className="border-b-0">
          <Card>
            <AccordionTrigger className="hover:no-underline px-6 py-4">
              <CardTitle className="flex items-center gap-2">📦 Queue Details</CardTitle>
              <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0 space-y-4">
                {/* Active Jobs */}
                {metrics.queue.activeJobs.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">🔵 Active Jobs ({metrics.queue.activeJobs.length})</h3>
                    <div className="space-y-3">
                      {metrics.queue.activeJobs.map((job: any) => (
                        <div key={job.id} className="border rounded p-3 bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-semibold">Job #{job.id}</span>
                            <Badge variant="default">{job.progress}% complete</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="truncate">
                              <span className="font-semibold">Video:</span> {job.data.videoUrl}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>Range: {(job.data.start / 1000).toFixed(1)}s - {(job.data.end / 1000).toFixed(1)}s</div>
                              <div>Attempts: {job.attemptsMade || 0}</div>
                              <div>Started: {new Date(job.processedOn).toLocaleTimeString()}</div>
                              <div>Added: {new Date(job.timestamp).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Waiting Jobs */}
                {metrics.queue.waitingJobs.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">🟡 Waiting Jobs ({metrics.queue.waitingJobs.length})</h3>
                    <div className="space-y-3">
                      {metrics.queue.waitingJobs.map((job: any) => (
                        <div key={job.id} className="border rounded p-3 bg-yellow-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-semibold">Job #{job.id}</span>
                            <Badge variant="secondary">Waiting</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="truncate">
                              <span className="font-semibold">Video:</span> {job.data.videoUrl}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>Range: {(job.data.start / 1000).toFixed(1)}s - {(job.data.end / 1000).toFixed(1)}s</div>
                              <div>Added: {new Date(job.timestamp).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Jobs */}
                {metrics.queue.recentCompleted?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">🟢 Recently Completed ({metrics.queue.recentCompleted.length})</h3>
                    <div className="space-y-3">
                      {metrics.queue.recentCompleted.map((job: any) => (
                        <div key={job.id} className="border rounded p-3 bg-green-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-semibold">Job #{job.id}</span>
                            <Badge variant="outline" className="bg-green-100">✅ Completed</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="truncate">
                              <span className="font-semibold">Video:</span> {job.data.videoUrl}
                            </div>
                            {job.returnvalue && (
                              <div className="text-xs font-mono text-green-700">File: {job.returnvalue}</div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>Range: {(job.data.start / 1000).toFixed(1)}s - {(job.data.end / 1000).toFixed(1)}s</div>
                              <div>Duration: {job.finishedOn && job.processedOn ? ((job.finishedOn - job.processedOn) / 1000).toFixed(1) : 'N/A'}s</div>
                              <div>Completed: {new Date(job.finishedOn).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed Jobs */}
                {metrics.queue.recentFailed?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">🔴 Recently Failed ({metrics.queue.recentFailed.length})</h3>
                    <div className="space-y-3">
                      {metrics.queue.recentFailed.map((job: any) => (
                        <div key={job.id} className="border rounded p-3 bg-red-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-semibold">Job #{job.id}</span>
                            <Badge variant="destructive">❌ Failed</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="truncate">
                              <span className="font-semibold">Video:</span> {job.data.videoUrl}
                            </div>
                            {job.failedReason && (
                              <div className="text-xs font-mono text-red-700 bg-red-100 p-2 rounded mt-2">
                                {job.failedReason}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>Range: {(job.data.start / 1000).toFixed(1)}s - {(job.data.end / 1000).toFixed(1)}s</div>
                              <div>Attempts: {job.attemptsMade || 0}</div>
                              <div>Failed: {new Date(job.finishedOn).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {metrics.queue.activeJobs.length === 0 && 
                 metrics.queue.waitingJobs.length === 0 && 
                 (!metrics.queue.recentCompleted || metrics.queue.recentCompleted.length === 0) && 
                 (!metrics.queue.recentFailed || metrics.queue.recentFailed.length === 0) && (
                  <div className="p-8 text-center text-muted-foreground">
                    No jobs in queue. Create a horn to see activity!
                  </div>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* System Info */}
        <AccordionItem value="system-info" className="border-b-0">
          <Card>
            <AccordionTrigger className="hover:no-underline px-6 py-4">
              <CardTitle className="flex items-center gap-2">💻 System Info</CardTitle>
              <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-bold">{formatUptime(metrics.system.uptime)}</div>
                    <div className="text-muted-foreground">Uptime</div>
                  </div>
                  <div>
                    <div className="font-bold">{formatBytes(metrics.system.memory.rss)}</div>
                    <div className="text-muted-foreground">Memory (RSS)</div>
                  </div>
                  <div>
                    <div className="font-bold">{formatBytes(metrics.system.memory.heapUsed)}</div>
                    <div className="text-muted-foreground">Heap Used</div>
                  </div>
                  <div>
                    <div className="font-bold">{formatBytes(metrics.system.memory.heapTotal)}</div>
                    <div className="text-muted-foreground">Heap Total</div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
