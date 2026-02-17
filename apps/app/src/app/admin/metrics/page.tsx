'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface ContainerMemory {
  container: string;
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
  error?: string;
}

interface MemorySnapshot {
  timestamp: string;
  memPercent: number;
  swapPercent: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  host: {
    memTotalMB: number;
    memUsedMB: number;
    memAvailableMB: number;
    memPercent: number;
    swapTotalMB: number;
    swapUsedMB: number;
    swapPercent: number;
  } | null;
  containers: ContainerMemory[];
  memoryHistory: MemorySnapshot[];
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
  const [infraLogs, setInfraLogs] = useState<Record<string, string | null>>({});
  const [loadingInfraLogs, setLoadingInfraLogs] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

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

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch(`${ytdlUrl}manager/system/health`);
      if (!response.ok) return;
      const data = await response.json();
      setSystemHealth(data);
    } catch {
      // Silently fail
    }
  };

  // Build a lookup from container name -> memory stats
  const memoryByContainer = useMemo(() => {
    const map = new Map<string, ContainerMemory>();
    if (systemHealth?.containers) {
      for (const c of systemHealth.containers) {
        map.set(c.container, c);
      }
    }
    return map;
  }, [systemHealth?.containers]);

  const toggleInfraLogs = async (container: string) => {
    if (infraLogs[container] !== undefined) {
      setInfraLogs(prev => {
        const next = { ...prev };
        delete next[container];
        return next;
      });
      return;
    }
    setLoadingInfraLogs(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/infrastructure/logs?tail=150&container=${container}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
      setInfraLogs(prev => ({ ...prev, [container]: data.logs }));
    } catch (err) {
      setInfraLogs(prev => ({
        ...prev,
        [container]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    } finally {
      setLoadingInfraLogs(null);
    }
  };

  const refreshInfraLogs = async (container: string) => {
    setLoadingInfraLogs(container);
    try {
      const response = await fetch(`${ytdlUrl}manager/infrastructure/logs?tail=150&container=${container}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
      setInfraLogs(prev => ({ ...prev, [container]: data.logs }));
    } catch (err) {
      setInfraLogs(prev => ({
        ...prev,
        [container]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    } finally {
      setLoadingInfraLogs(null);
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

  const filterLogs = (raw: string): { text: string; filtered: number } => {
    const lines = raw.split('\n');
    if (!filterLogNoise) return { text: raw, filtered: 0 };
    const kept: string[] = [];
    let filtered = 0;
    for (const line of lines) {
      // Gluetun: auth warning
      if (line.includes('is unprotected by default, please set up authentication')) { filtered++; continue; }
      // Gluetun: routine health-check polling
      if (line.includes('200 GET /v1/publicip/ip')) { filtered++; continue; }
      if (line.includes('200 GET /v1/vpn/status')) { filtered++; continue; }
      // Redis: routine background save chatter
      if (line.includes('changes in') && line.includes('seconds. Saving...')) { filtered++; continue; }
      if (line.includes('Background saving started by pid')) { filtered++; continue; }
      if (line.includes('Background saving terminated with success')) { filtered++; continue; }
      if (line.includes('BGSAVE done')) { filtered++; continue; }
      if (line.includes('DB saved on disk')) { filtered++; continue; }
      if (line.includes('Fork CoW for RDB')) { filtered++; continue; }
      // Redis: auth warning
      if (line.includes('Redis does not require authentication')) { filtered++; continue; }
      kept.push(line);
    }
    return { text: kept.join('\n'), filtered };
  };

  useEffect(() => {
    fetchMetrics();
    fetchGluetunStatus();
    fetchSimulateBlockStatus();
    fetchInfraStatus();
    fetchSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(() => { fetchMetrics(); fetchGluetunStatus(); fetchSimulateBlockStatus(); fetchInfraStatus(); fetchSystemHealth(); }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const CHART_RANGES = [1, 6, 12, 24, 48] as const;
  const [chartRangeHours, setChartRangeHours] = useState<number>(6);

  const ramChartLayout = useMemo(() => ({
    W: 600, H: 140, padTop: 20, padBottom: 24, padLeft: 30, padRight: 10,
    get chartW() { return this.W - this.padLeft - this.padRight; },
    get chartH() { return this.H - this.padTop - this.padBottom; },
  }), []);

  const ramChartData = useMemo(() => {
    const allHistory = systemHealth?.memoryHistory ?? [];
    if (allHistory.length < 2) return null;

    // Filter to selected time window
    const cutoff = Date.now() - chartRangeHours * 3_600_000;
    const windowed = allHistory.filter(s => new Date(s.timestamp).getTime() >= cutoff);
    if (windowed.length < 2) return null;

    // Downsample: target ~150 points max for a readable chart
    const MAX_DISPLAY_POINTS = 150;
    let displayData: MemorySnapshot[];
    if (windowed.length <= MAX_DISPLAY_POINTS) {
      displayData = windowed;
    } else {
      const step = (windowed.length - 1) / (MAX_DISPLAY_POINTS - 1);
      displayData = [];
      for (let i = 0; i < MAX_DISPLAY_POINTS - 1; i++) {
        displayData.push(windowed[Math.round(i * step)]!);
      }
      displayData.push(windowed[windowed.length - 1]!);
    }

    const { padLeft, padTop, chartW, chartH } = ramChartLayout;
    const points = displayData.map((s, i) => {
      const x = padLeft + (i / (displayData.length - 1)) * chartW;
      const y = padTop + (1 - s.memPercent / 100) * chartH;
      return { x, y, ...s };
    });
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1]!.x},${padTop + chartH} L${points[0]!.x},${padTop + chartH} Z`;
    const oldest = new Date(displayData[0]!.timestamp);
    const newest = new Date(displayData[displayData.length - 1]!.timestamp);
    const spanMs = newest.getTime() - oldest.getTime();
    const spanLabel = spanMs < 120_000 ? `${Math.round(spanMs / 1000)}s` :
      spanMs < 7_200_000 ? `${Math.round(spanMs / 60_000)}m` :
      `${(spanMs / 3_600_000).toFixed(1)}h`;
    return { points, linePath, areaPath, oldest, newest, spanLabel, totalSamples: windowed.length, displayedSamples: displayData.length };
  }, [systemHealth?.memoryHistory, ramChartLayout, chartRangeHours]);

  const handleChartMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!ramChartData || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * ramChartLayout.W;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < ramChartData.points.length; i++) {
      const dist = Math.abs(ramChartData.points[i]!.x - svgX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    setHoveredPoint(closest);
  }, [ramChartData, ramChartLayout]);

  const handleChartMouseLeave = useCallback(() => setHoveredPoint(null), []);

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-6">
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
        <CardHeader className="pb-3 pt-4 px-3 sm:px-5">
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

        <CardContent className="px-3 sm:px-5 pb-4 pt-0 space-y-3">
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 overflow-hidden">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              <span className="font-medium text-blue-700" title={`ID: ${workerStats.details.currentJob.taskId}`}>Processing Job</span>
              <span className="text-blue-500 truncate font-mono min-w-0">{workerStats.details.currentJob.videoUrl}</span>
              <span className="text-blue-400 whitespace-nowrap">since {new Date(workerStats.details.currentJob.startedAt).toLocaleTimeString()}</span>
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

          {/* Memory bars for gluetun + worker */}
          {(memoryByContainer.has(cName) || memoryByContainer.has(gs.worker || '')) && (
            <div className="space-y-1">
              {memoryByContainer.has(cName) && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0">VPN</span>
                  <div className="flex-1"><MemoryBar mem={memoryByContainer.get(cName)} /></div>
                </div>
              )}
              {gs.worker && memoryByContainer.has(gs.worker) && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0">Worker</span>
                  <div className="flex-1"><MemoryBar mem={memoryByContainer.get(gs.worker!)} /></div>
                </div>
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
          {vpnLogs[cName] !== undefined && (() => {
            const { text, filtered } = filterLogs(vpnLogs[cName] || '');
            return (
              <div className="border-t pt-3 mt-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">Container Logs</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={filterLogNoise} onChange={(e) => setFilterLogNoise(e.target.checked)} className="h-3 w-3 rounded" />
                      <span className="text-[11px] text-muted-foreground">Filter noise</span>
                    </label>
                    {filterLogNoise && filtered > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">{filtered} line{filtered !== 1 ? 's' : ''} hidden</span>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => refreshVpnLogs(cName)} disabled={loadingLogs === cName} className="text-xs h-6 px-2">
                    {loadingLogs === cName ? '...' : 'Refresh'}
                  </Button>
                </div>
                <pre className="text-[11px] leading-relaxed bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap break-all font-mono">
                  {text || 'No logs available'}
                </pre>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-6 space-y-4 sm:space-y-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
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

  const memoryBarColor = (percent: number) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const RamChart = ({ history }: { history: MemorySnapshot[] }) => {
    if (history.length < 2) return (
      <p className="text-[11px] text-muted-foreground italic">Collecting data... ({history.length} sample{history.length !== 1 ? 's' : ''}, updates every 60s)</p>
    );
    if (!ramChartData) return null;

    const { W, H, padTop, padLeft, chartW, chartH } = ramChartLayout;
    const { points, linePath, areaPath, oldest, newest, spanLabel, totalSamples, displayedSamples } = ramChartData;
    const hp = hoveredPoint !== null ? points[hoveredPoint] : null;

    return (
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Host RAM — last {spanLabel}
            {totalSamples !== displayedSamples
              ? ` (${displayedSamples} of ${totalSamples} samples)`
              : ` (${totalSamples} samples)`}
          </span>
          <div className="flex items-center gap-0.5">
            {hp && (
              <span className="text-[11px] font-mono text-muted-foreground mr-2">
                {new Date(hp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {' — '}
                <span className={`font-semibold ${hp.memPercent > 85 ? 'text-red-600' : hp.memPercent > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {hp.memPercent}% RAM
                </span>
                {hp.swapPercent > 0 && <span>, {hp.swapPercent}% swap</span>}
              </span>
            )}
            {CHART_RANGES.map((h) => (
              <button
                key={h}
                onClick={() => { setChartRangeHours(h); setHoveredPoint(null); }}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  chartRangeHours === h
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          {/* Warning/critical threshold zones */}
          <rect x={padLeft} y={padTop} width={chartW} height={(1 - 0.85) * chartH} fill="rgb(239 68 68 / 0.15)" />
          <rect x={padLeft} y={padTop + (1 - 0.85) * chartH} width={chartW} height={0.15 * chartH} fill="rgb(234 179 8 / 0.15)" />

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padTop + (1 - pct / 100) * chartH;
            return (
              <g key={pct}>
                <line x1={padLeft} x2={padLeft + chartW} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="3,3" />
                <text x={padLeft - 4} y={y + 3} textAnchor="end" fontSize={8} fill="currentColor" fillOpacity={0.4}>{pct}%</text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#ramGradient)" />
          <defs>
            <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* Line */}
          <path d={linePath} fill="none" stroke="rgb(59 130 246)" strokeWidth={2} strokeLinejoin="round" />

          {/* Data point dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint === i ? 4 : 2}
              fill={hoveredPoint === i ? 'rgb(59 130 246)' : 'rgb(59 130 246 / 0.4)'}
              className="transition-all duration-100"
            />
          ))}

          {/* Hover crosshair */}
          {hp && (
            <g>
              <line x1={hp.x} x2={hp.x} y1={padTop} y2={padTop + chartH} stroke="rgb(59 130 246)" strokeOpacity={0.5} strokeDasharray="2,2" />
              <line x1={padLeft} x2={padLeft + chartW} y1={hp.y} y2={hp.y} stroke="rgb(59 130 246)" strokeOpacity={0.3} strokeDasharray="2,2" />
            </g>
          )}

          {/* Current value label (rightmost point, shown when not hovering) */}
          {hoveredPoint === null && points.length > 0 && (() => {
            const last = points[points.length - 1]!;
            return (
              <text x={last.x - 6} y={last.y - 8} textAnchor="end" fontSize={10} fontWeight="bold"
                fill={last.memPercent > 85 ? 'rgb(239 68 68)' : last.memPercent > 70 ? 'rgb(234 179 8)' : 'rgb(34 197 94)'}>
                {last.memPercent}%
              </text>
            );
          })()}

          {/* Hovered point value label */}
          {hp && (
            <text
              x={hp.x < padLeft + chartW / 2 ? hp.x + 6 : hp.x - 6}
              y={hp.y - 8}
              textAnchor={hp.x < padLeft + chartW / 2 ? 'start' : 'end'}
              fontSize={10}
              fontWeight="bold"
              fill={hp.memPercent > 85 ? 'rgb(239 68 68)' : hp.memPercent > 70 ? 'rgb(234 179 8)' : 'rgb(34 197 94)'}
            >
              {hp.memPercent}%
            </text>
          )}

          {/* Time labels */}
          <text x={padLeft} y={H - 2} fontSize={8} fill="currentColor" fillOpacity={0.4}>
            {oldest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
          <text x={padLeft + chartW} y={H - 2} textAnchor="end" fontSize={8} fill="currentColor" fillOpacity={0.4}>
            {newest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
        </svg>
      </div>
    );
  };

  const MemoryBar = ({ mem }: { mem: ContainerMemory | undefined }) => {
    if (!mem || mem.memoryLimitMB === 0) return null;
    const pct = Math.min(mem.memoryPercent, 100);
    return (
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Memory</span>
          <span className="font-mono">{mem.memoryUsageMB} / {mem.memoryLimitMB} MB ({pct}%)</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${memoryBarColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl sm:text-3xl font-bold">VPN & System Metrics</h1>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs sm:text-sm sm:h-9"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
            </Button>
            <Button onClick={fetchMetrics} variant="outline" size="sm" className="h-7 text-xs sm:text-sm sm:h-9">
              Refresh
            </Button>
            <Button 
              onClick={clearQueue} 
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-red-600"
              disabled={clearing}
            >
              {clearing ? '...' : 'Clear'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {new Date(metrics.timestamp).toLocaleTimeString()}
          </span>
          <Separator orientation="vertical" className="h-3 sm:h-4" />
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {metrics.queue.stats.active > 0 && (
              <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-normal text-blue-700 bg-blue-50">{metrics.queue.stats.active} active</Badge>
            )}
            {metrics.queue.stats.waiting > 0 && (
              <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-normal text-yellow-700 bg-yellow-50">{metrics.queue.stats.waiting} waiting</Badge>
            )}
            <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-normal text-green-700 bg-green-50">{metrics.queue.stats.completed} completed</Badge>
            {metrics.queue.stats.failed > 0 && (
              <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-normal text-red-700 bg-red-50">{metrics.queue.stats.failed} failed</Badge>
            )}
          </div>
        </div>
      </div>

      {/* System Health Accordion */}
      {systemHealth && (
        <Accordion type="single" collapsible>
          <AccordionItem value="health" className={`rounded-lg border px-3 sm:px-4 ${
            systemHealth.status === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
            systemHealth.status === 'warning' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' :
            'border-green-300 bg-green-50 dark:bg-green-950/20'
          }`}>
            <AccordionTrigger className="w-full py-2.5 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180" noRotate>
              <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                    systemHealth.status === 'critical' ? 'bg-red-500 animate-pulse' :
                    systemHealth.status === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <span className={`text-sm font-semibold ${
                    systemHealth.status === 'critical' ? 'text-red-700 dark:text-red-400' :
                    systemHealth.status === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                    'text-green-700 dark:text-green-400'
                  }`}>
                    System {systemHealth.status === 'critical' ? 'Critical' : systemHealth.status === 'warning' ? 'Warning' : 'Healthy'}
                  </span>
                </div>
                {systemHealth.host && (
                  <>
                    <Separator orientation="vertical" className="h-4 hidden sm:block" />
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>RAM:</span>
                        <span className="font-mono">{(systemHealth.host.memUsedMB / 1024).toFixed(1)} / {(systemHealth.host.memTotalMB / 1024).toFixed(1)} GB</span>
                        <span className={`font-semibold ${systemHealth.host.memPercent > 85 ? 'text-red-600' : systemHealth.host.memPercent > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                          ({systemHealth.host.memPercent}%)
                        </span>
                      </div>
                      {systemHealth.host.swapTotalMB > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>Swap:</span>
                          <span className="font-mono">{(systemHealth.host.swapUsedMB / 1024).toFixed(1)} / {(systemHealth.host.swapTotalMB / 1024).toFixed(1)} GB</span>
                          <span className={`font-semibold ${systemHealth.host.swapPercent > 50 ? 'text-red-600' : systemHealth.host.swapPercent > 20 ? 'text-yellow-600' : 'text-green-600'}`}>
                            ({systemHealth.host.swapPercent}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent className="pb-3 sm:pb-4 pt-0">
              <RamChart history={systemHealth.memoryHistory} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Infrastructure Status Cards */}
      {infraStatuses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {infraStatuses.map((infra) => {
            const running = infra.containerState?.running === true;
            const statusColor = running ? 'border-l-green-500' : 'border-l-red-500';
            const dotColor = running ? 'bg-green-500' : 'bg-red-500';
            const uptime = infra.self?.uptime;
            const isYtdl = infra.role.toLowerCase().includes('primary') || infra.role.toLowerCase().includes('ytdl');

            return (
              <Card key={infra.container} className={`border-l-4 ${statusColor}`}>
                <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
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
                <CardContent className="px-3 sm:px-4 pb-3 pt-0 space-y-1.5">
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
                  {/* Memory bar */}
                  <MemoryBar mem={memoryByContainer.get(infra.container)} />
                  {/* Logs button */}
                  <div className="pt-1">
                    <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => toggleInfraLogs(infra.container)} disabled={loadingInfraLogs === infra.container}>
                      {infraLogs[infra.container] !== undefined ? 'Hide Logs' : 'Logs'}
                    </Button>
                  </div>
                  {/* Log viewer */}
                  {infraLogs[infra.container] !== undefined && (() => {
                    const { text, filtered } = filterLogs(infraLogs[infra.container] || '');
                    return (
                      <div className="border-t pt-2 mt-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground">Container Logs</span>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input type="checkbox" checked={filterLogNoise} onChange={(e) => setFilterLogNoise(e.target.checked)} className="h-3 w-3 rounded" />
                              <span className="text-[10px] text-muted-foreground">Filter noise</span>
                            </label>
                            {filterLogNoise && filtered > 0 && (
                              <span className="text-[10px] text-muted-foreground/60">{filtered} line{filtered !== 1 ? 's' : ''} hidden</span>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => refreshInfraLogs(infra.container)} disabled={loadingInfraLogs === infra.container} className="text-[11px] h-5 px-2">
                            {loadingInfraLogs === infra.container ? '...' : 'Refresh'}
                          </Button>
                        </div>
                        <pre className="text-[10px] leading-relaxed bg-gray-950 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-56 overflow-y-auto whitespace-pre-wrap break-all font-mono">
                          {text || 'No logs available'}
                        </pre>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* VPN Worker Status Cards -- always visible via manager */}
      {gluetunStatuses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
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
                    {metrics.jobs.map((job, jobIdx) => {
                      const singleSuccess = job.vpnAttempts.length === 1 && job.vpnAttempts[0]!.success;
                      return (
                        <div key={job.id} className="border rounded-lg p-3 sm:p-4 space-y-2">
                          {/* Job Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">Job #{metrics.jobs!.length - jobIdx}</span>
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
                          <p className="text-[10px] font-mono text-muted-foreground/60 -mt-1 truncate">ID: {job.taskId}</p>

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
