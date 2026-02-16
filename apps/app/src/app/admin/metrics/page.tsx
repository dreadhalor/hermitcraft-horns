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
import { trpc } from '@/trpc/client';

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
    summary: Record<string, number>;
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
  };
  system: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    nodeVersion?: string;
    platform?: string;
    pid?: number;
  };
  workerDownloadStats?: Array<{
    proxy: string;
    successRate: number;
    total: number;
    details: {
      endpoint: string;
      attempts: number;
      successes: number;
      failures: number;
      blocks: number;
      lastUsed: string | null;
      lastError: string | null;
      currentJob: { taskId: string; videoUrl: string; startedAt: string } | null;
    };
  }>;
  database?: {
    connected: boolean;
    recentLogs: Array<{
      id: string;
      userId: string | null;
      source: string;
      videoUrl: string;
      status: string;
      errorMessage: string | null;
      taskId: string | null;
      createdAt: string;
      completedAt: string | null;
      vpnAttempts: string;
      vpnProxiesTried: string[];
      vpnProxiesFailed: string[];
      vpnProxySuccess: string | null;
      vpnIpAddress: string | null;
      vpnLocation: string | null;
    }>;
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

interface GluetunStatus {
  container: string;
  worker?: string | null;
  timestamp: string;
  containerState?: {
    status?: string;
    running?: boolean;
    health?: string;
    startedAt?: string;
    restartCount?: number;
    error?: string;
  };
  vpnStatus?: {
    status?: string;
    error?: string;
  };
  publicIp?: {
    public_ip?: string;
    country?: string;
    region?: string;
    city?: string;
    error?: string;
  };
}

interface InfraStatus {
  container: string;
  role: string;
  timestamp: string;
  containerState?: {
    status?: string;
    running?: boolean;
    health?: string | null;
    startedAt?: string;
    restartCount?: number;
    image?: string | null;
    error?: string;
  };
  self?: {
    uptime: number;
    memory: { rss: number; heapTotal: number; heapUsed: number };
    pid: number;
    nodeVersion: string;
  };
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [restartingVpn, setRestartingVpn] = useState<string | null>(null);
  const [gluetunStatuses, setGluetunStatuses] = useState<GluetunStatus[]>([]);
  const [gluetunError, setGluetunError] = useState<string | null>(null);

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
  const [simulateBlockStatus, setSimulateBlockStatus] = useState<Record<string, boolean>>({});
  const [togglingBlock, setTogglingBlock] = useState<string | null>(null);
  const [infraStatuses, setInfraStatuses] = useState<InfraStatus[]>([]);

  // Build a lookup from taskId -> worker currently processing it
  const activeJobWorker = useMemo(() => {
    const map = new Map<string, { worker: string; startedAt: string }>();
    if (metrics?.workerDownloadStats) {
      for (const stat of metrics.workerDownloadStats) {
        const job = stat.details.currentJob;
        if (job) {
          map.set(job.taskId, { worker: stat.proxy, startedAt: job.startedAt });
        }
      }
    }
    return map;
  }, [metrics?.workerDownloadStats]);

  // Build a lookup from worker proxy name (e.g. "worker-1") -> download stats
  const workerStatsByProxy = useMemo(() => {
    const map = new Map<string, NonNullable<MetricsData['workerDownloadStats']>[number]>();
    if (metrics?.workerDownloadStats) {
      for (const stat of metrics.workerDownloadStats) {
        map.set(stat.proxy, stat);
      }
    }
    return map;
  }, [metrics?.workerDownloadStats]);

  // Build a lookup from gluetun container name -> latency (from vpnConnectionStatus)
  const latencyByContainer = useMemo(() => {
    const map = new Map<string, number>();
    if (metrics?.vpnConnectionStatus) {
      for (const vpn of metrics.vpnConnectionStatus) {
        const match = vpn.proxy.match(/\(([^:]+):/);
        if (match?.[1] && vpn.responseTimeMs != null) {
          map.set(match[1], vpn.responseTimeMs);
        }
      }
    }
    return map;
  }, [metrics?.vpnConnectionStatus]);

  const ytdlUrl = process.env.NEXT_PUBLIC_YTDL_URL || 'http://localhost:3001/';

  const fetchGluetunStatus = async () => {
    try {
      const response = await fetch(`${ytdlUrl}manager/gluetun/status`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      // Manager now returns an array of statuses
      const statuses = Array.isArray(data) ? data : [data];
      setGluetunStatuses(statuses);
      setGluetunError(null);
    } catch (err) {
      setGluetunError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchInfraStatus = async () => {
    try {
      const response = await fetch(`${ytdlUrl}manager/infrastructure/status`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        setInfraStatuses(data);
      }
    } catch {
      // Silently fail
    }
  };

  const fetchSimulateBlockStatus = async () => {
    try {
      const response = await fetch(`${ytdlUrl}manager/workers/simulate-block`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        const map: Record<string, boolean> = {};
        for (const item of data) {
          if (item.gluetun) {
            map[item.gluetun] = Boolean(item.simulateBlock);
          }
        }
        setSimulateBlockStatus(map);
      }
    } catch {
      // Silently fail -- non-critical
    }
  };

  const toggleSimulateBlock = async (container: string) => {
    const currentlyBlocked = simulateBlockStatus[container] ?? false;
    setTogglingBlock(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/workers/simulate-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker: container, enabled: !currentlyBlocked }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to toggle simulate block');
      setSimulateBlockStatus((prev) => ({ ...prev, [container]: Boolean(data.simulateBlock) }));
    } catch (err) {
      alert(`Error toggling simulate block: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTogglingBlock(null);
    }
  };

  const fetchMetrics = async () => {
    try {
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

  const restartVpn = async (container: string, mode: 'soft' | 'hard') => {
    const modeLabel = mode === 'hard' ? 'Hard restart (container restart)' : 'Soft restart (reconnect)';
    if (!confirm(`${modeLabel} for ${container}?\n\n${mode === 'hard' ? 'This will fully restart the container + its worker. Takes 15-45 seconds.' : 'This will toggle the VPN connection. Takes 10-30 seconds.'}`)) {
      return;
    }
    setRestartingVpn(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/gluetun/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container, mode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to restart VPN');
      alert(data.message);
      const delay = mode === 'hard' ? 8000 : 3000;
      setTimeout(() => { fetchMetrics(); fetchGluetunStatus(); }, delay);
    } catch (err) {
      alert(`Error restarting VPN: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRestartingVpn(null);
    }
  };

  const [stoppingVpn, setStoppingVpn] = useState<string | null>(null);

  const stopVpn = async (container: string) => {
    if (!confirm(`Stop the VPN on ${container}? The worker behind it will fail downloads until restarted.`)) {
      return;
    }
    setStoppingVpn(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/gluetun/stop-vpn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to stop VPN');
      alert(data.message);
      setTimeout(() => { fetchMetrics(); fetchGluetunStatus(); }, 2000);
    } catch (err) {
      alert(`Error stopping VPN: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setStoppingVpn(null);
    }
  };

  const [stoppingContainer, setStoppingContainer] = useState<string | null>(null);

  const stopContainer = async (container: string) => {
    if (!confirm(`Stop container ${container}? Its worker will become unreachable until hard restarted.`)) {
      return;
    }
    setStoppingContainer(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/gluetun/stop-container`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to stop container');
      alert(data.message);
      setTimeout(() => { fetchMetrics(); fetchGluetunStatus(); }, 2000);
    } catch (err) {
      alert(`Error stopping container: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setStoppingContainer(null);
    }
  };

  const fetchVpnLogs = async (container: string) => {
    if (vpnLogs[container] !== undefined) {
      setVpnLogs(prev => {
        const next = { ...prev };
        delete next[container];
        return next;
      });
      return;
    }
    setLoadingLogs(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/gluetun/logs?tail=150&container=${container}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
      setVpnLogs(prev => ({ ...prev, [container]: data.logs }));
    } catch (err) {
      setVpnLogs(prev => ({
        ...prev,
        [container]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    } finally {
      setLoadingLogs(null);
    }
  };

  const refreshVpnLogs = async (container: string) => {
    setLoadingLogs(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/gluetun/logs?tail=150&container=${container}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
      setVpnLogs(prev => ({ ...prev, [container]: data.logs }));
    } catch (err) {
      setVpnLogs(prev => ({
        ...prev,
        [container]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
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
    fetchGluetunStatus();
    fetchSimulateBlockStatus();
    fetchInfraStatus();
    
    if (autoRefresh) {
      const interval = setInterval(() => { fetchMetrics(); fetchGluetunStatus(); fetchSimulateBlockStatus(); fetchInfraStatus(); }, 5000);
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

  // Reusable card for a single gluetun/worker pair
  const renderGluetunCard = (gs: GluetunStatus, idx: number) => {
    const vpnRunning = gs.vpnStatus?.status === 'running';
    const containerRunning = gs.containerState?.running === true;
    const healthy = gs.containerState?.health === 'healthy';
    const allGood = containerRunning && vpnRunning && healthy;
    const publicIp = gs.publicIp?.public_ip;
    const city = gs.publicIp?.city;
    const cName = gs.container;
    const latency = latencyByContainer.get(cName);
    const isBlocked = simulateBlockStatus[cName] ?? false;
    const workerStats = workerStatsByProxy.get(`worker-${idx + 1}`);

    const accentColor = !containerRunning
      ? 'border-l-red-500'
      : !vpnRunning
        ? 'border-l-yellow-500'
        : 'border-l-green-500';

    const statusDotColor = !containerRunning
      ? 'bg-red-500'
      : !vpnRunning
        ? 'bg-yellow-500'
        : 'bg-green-500';

    return (
      <Card key={cName} className={`border-l-4 ${accentColor}`}>
        {/* Header */}
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotColor}`} />
              <CardTitle className="text-base font-semibold">Worker {idx + 1}</CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isBlocked && (
                <Badge variant="outline" className="text-orange-700 border-orange-400 bg-orange-50 text-xs font-normal">Simulating Block</Badge>
              )}
              {allGood ? (
                <Badge variant="outline" className="text-green-700 border-green-300 text-xs font-normal">Healthy</Badge>
              ) : !containerRunning ? (
                <Badge variant="destructive" className="text-xs font-normal">Down</Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-700 border-yellow-400 text-xs font-normal">Degraded</Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{cName}{gs.worker ? ` / ${gs.worker}` : ''}</p>
        </CardHeader>

        <CardContent className="px-5 pb-4 pt-0 space-y-3">
          {/* Status badges -- compact inline row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={containerRunning ? 'secondary' : 'destructive'} className="text-[11px] font-normal">
              {gs.containerState?.status || 'unknown'}
            </Badge>
            <Badge variant={healthy ? 'secondary' : 'destructive'} className="text-[11px] font-normal">
              {gs.containerState?.health || 'no health'}
            </Badge>
            <Badge variant={vpnRunning ? 'secondary' : 'destructive'} className="text-[11px] font-normal">
              VPN: {gs.vpnStatus?.status || gs.vpnStatus?.error || 'unknown'}
            </Badge>
            {publicIp && (
              <span className="text-[11px] font-mono text-muted-foreground">{publicIp}</span>
            )}
            {city && (
              <span className="text-[11px] text-muted-foreground">{city}</span>
            )}
            {latency != null && (
              <span className="text-[11px] text-muted-foreground">{latency}ms</span>
            )}
          </div>

          {/* Current job indicator */}
          {workerStats?.details.currentJob && (
            <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-medium text-blue-700">Processing Job #{workerStats.details.currentJob.taskId}</span>
              <span className="text-blue-500 truncate max-w-[200px] font-mono">{workerStats.details.currentJob.videoUrl}</span>
              <span className="text-blue-400 ml-auto whitespace-nowrap">since {new Date(workerStats.details.currentJob.startedAt).toLocaleTimeString()}</span>
            </div>
          )}

          {/* Worker download stats */}
          {workerStats && workerStats.total > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{workerStats.details.attempts} attempts</span>
              <span className="text-green-600">{workerStats.details.successes} ok</span>
              <span className="text-red-600">{workerStats.details.failures} fail</span>
              {workerStats.details.blocks > 0 && (
                <span className="text-orange-600">{workerStats.details.blocks} blocked</span>
              )}
              <span className="font-mono">{(workerStats.successRate * 100).toFixed(0)}%</span>
              {workerStats.details.lastUsed && (
                <span>last: {new Date(workerStats.details.lastUsed).toLocaleTimeString()}</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => restartVpn(cName, 'soft')} disabled={restartingVpn === cName}>
              {restartingVpn === cName ? 'Restarting...' : 'Soft Restart'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => restartVpn(cName, 'hard')} disabled={restartingVpn === cName}>
              {restartingVpn === cName ? 'Restarting...' : 'Hard Restart'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fetchVpnLogs(cName)} disabled={loadingLogs === cName}>
              {vpnLogs[cName] !== undefined ? 'Hide Logs' : 'Logs'}
            </Button>

            {(vpnRunning || containerRunning) && (
              <Separator orientation="vertical" className="h-4 mx-0.5" />
            )}

            {containerRunning && (
              <Button
                size="sm"
                variant={isBlocked ? 'default' : 'ghost'}
                className={`h-7 text-xs ${isBlocked ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-muted-foreground hover:text-orange-600'}`}
                onClick={() => toggleSimulateBlock(cName)}
                disabled={togglingBlock === cName}
              >
                {togglingBlock === cName ? '...' : isBlocked ? 'Unblock' : 'Simulate Block'}
              </Button>
            )}
            {vpnRunning && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-orange-600" onClick={() => stopVpn(cName)} disabled={stoppingVpn === cName}>
                {stoppingVpn === cName ? 'Stopping...' : 'Stop VPN'}
              </Button>
            )}
            {containerRunning && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-orange-600" onClick={() => stopContainer(cName)} disabled={stoppingContainer === cName}>
                {stoppingContainer === cName ? 'Stopping...' : 'Stop Container'}
              </Button>
            )}
          </div>

          {/* Log viewer */}
          {vpnLogs[cName] !== undefined && (
            <div className="border-t pt-3 mt-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Container Logs</span>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={filterLogNoise} onChange={(e) => setFilterLogNoise(e.target.checked)} className="h-3 w-3 rounded" />
                    <span className="text-[11px] text-muted-foreground">Filter noise</span>
                  </label>
                </div>
                <Button size="sm" variant="ghost" onClick={() => refreshVpnLogs(cName)} disabled={loadingLogs === cName} className="text-xs h-6 px-2">
                  {loadingLogs === cName ? '...' : 'Refresh'}
                </Button>
              </div>
              <pre className="text-[11px] leading-relaxed bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap break-all font-mono">
                {filterLogs(vpnLogs[cName] || '') || 'No logs available'}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">ytdl Service Unreachable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{error}</p>
            <p className="text-sm text-muted-foreground">
              The ytdl backend is not responding. Check the VPN workers below.
            </p>
            <Button onClick={() => { fetchMetrics(); fetchGluetunStatus(); }} className="mt-2">Retry</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">VPN Workers {gluetunError ? '(manager unreachable)' : ''}</h2>
          {gluetunError ? (
            <p className="text-sm text-red-600">Could not reach manager: {gluetunError}</p>
          ) : gluetunStatuses.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {gluetunStatuses.map(renderGluetunCard)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading worker status...</p>
          )}
        </div>
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
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              {metrics.queue.stats.active > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal text-blue-700 bg-blue-50">{metrics.queue.stats.active} active</Badge>
              )}
              {metrics.queue.stats.waiting > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal text-yellow-700 bg-yellow-50">{metrics.queue.stats.waiting} waiting</Badge>
              )}
              <Badge variant="secondary" className="text-[11px] font-normal text-green-700 bg-green-50">{metrics.queue.stats.completed} completed</Badge>
              {metrics.queue.stats.failed > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal text-red-700 bg-red-50">{metrics.queue.stats.failed} failed</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
          </Button>
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            Refresh Now
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button 
            onClick={clearQueue} 
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-red-600"
            disabled={clearing}
          >
            {clearing ? 'Clearing...' : 'Clear Queue'}
          </Button>
        </div>
      </div>

      {/* Infrastructure Status Cards */}
      {infraStatuses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {infraStatuses.map((infra) => {
            const running = infra.containerState?.running === true;
            const statusColor = running ? 'border-l-green-500' : 'border-l-red-500';
            const dotColor = running ? 'bg-green-500' : 'bg-red-500';
            const uptime = infra.self?.uptime;
            const isYtdl = infra.role.toLowerCase().includes('primary') || infra.role.toLowerCase().includes('ytdl');

            return (
              <Card key={infra.container} className={`border-l-4 ${statusColor}`}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                      <CardTitle className="text-sm font-semibold capitalize">{infra.role}</CardTitle>
                    </div>
                    <Badge variant={running ? 'outline' : 'destructive'} className="text-[10px] font-normal">
                      {infra.containerState?.status || 'unknown'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{infra.container}</p>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {infra.containerState?.health && (
                      <Badge variant="secondary" className="text-[10px] font-normal">{infra.containerState.health}</Badge>
                    )}
                    {infra.containerState?.restartCount != null && infra.containerState.restartCount > 0 && (
                      <span>{infra.containerState.restartCount} restarts</span>
                    )}
                    {uptime != null && (
                      <span>{Math.floor(uptime / 3600)}h {Math.floor((uptime % 3600) / 60)}m up</span>
                    )}
                    {infra.self?.memory && (
                      <span>{(infra.self.memory.rss / 1024 / 1024).toFixed(0)}MB</span>
                    )}
                    {infra.self?.nodeVersion && (
                      <span className="font-mono">{infra.self.nodeVersion}</span>
                    )}
                    {infra.containerState?.startedAt && (
                      <span>started {new Date(infra.containerState.startedAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                  {/* Merge ytdl-specific system & DB info into this card */}
                  {isYtdl && metrics && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{formatUptime(metrics.system.uptime)} process uptime</span>
                      <span>{formatBytes(metrics.system.memory.heapUsed)} heap</span>
                      {metrics.system.pid != null && (
                        <span className="font-mono">PID {metrics.system.pid}</span>
                      )}
                      {metrics.database && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${metrics.database.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>DB {metrics.database.connected ? 'connected' : 'disconnected'}</span>
                          {metrics.database.connected && (
                            <span>({metrics.database.recentLogs.length} logs)</span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* VPN Worker Status Cards -- always visible via manager */}
      {gluetunStatuses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {gluetunStatuses.map(renderGluetunCard)}
        </div>
      )}

      {/* All Jobs */}
      {metrics.jobs && metrics.jobs.length > 0 && (
        <Accordion type="multiple" defaultValue={['all-jobs']} className="space-y-4">
          <AccordionItem value="all-jobs" className="border-b-0">
            <Card>
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <CardTitle className="flex items-center gap-2">All Jobs ({metrics.jobs.length})</CardTitle>
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {metrics.jobs.map((job) => {
                      const singleSuccess = job.vpnAttempts.length === 1 && job.vpnAttempts[0]!.success;
                      return (
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
                                {job.status === 'completed' && 'Completed'}
                                {job.status === 'failed' && 'Failed'}
                                {job.status === 'active' && 'Active'}
                                {job.status === 'waiting' && 'Waiting'}
                              </Badge>
                              {job.vpnAttemptsCount > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {job.vpnAttemptsCount} attempts
                                </Badge>
                              )}
                              {activeJobWorker.has(job.taskId) && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs gap-1">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  {activeJobWorker.get(job.taskId)!.worker}
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

                          {/* VPN Summary — compact inline for single-success, detailed for multi-attempt */}
                          {singleSuccess ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs gap-1">
                                <span>✅</span> {job.vpnAttempts[0]!.proxy}
                              </Badge>
                              {job.vpnAttempts[0]!.ip && (
                                <span className="font-mono text-muted-foreground">{job.vpnAttempts[0]!.ip}</span>
                              )}
                              {job.vpnAttempts[0]!.location && (
                                <span className="text-muted-foreground">({job.vpnAttempts[0]!.location})</span>
                              )}
                            </div>
                          ) : job.vpnAttempts.length > 0 ? (
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
                                        {attempt.ip && (
                                          <Badge variant="outline" className="text-xs">
                                            {attempt.ip}
                                          </Badge>
                                        )}
                                        {attempt.location && (
                                          <span className="text-muted-foreground">{attempt.location}</span>
                                        )}
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
                          ) : job.status !== 'waiting' ? (
                            <div className="text-xs text-muted-foreground italic">
                              No VPN attempts recorded
                            </div>
                          ) : null}

                          {/* Failure Reason */}
                          {job.status === 'failed' && job.failedReason && (
                            <div className="border-t pt-2 mt-2">
                              <div className="text-xs font-mono text-red-700 bg-red-100 p-2 rounded">
                                {job.failedReason}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
