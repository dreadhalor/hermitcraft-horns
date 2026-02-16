/**
 * Manager -- API gateway, reverse proxy, and multi-gluetun orchestrator.
 *
 * Always reachable (runs on its own Docker bridge network). Proxies normal
 * API traffic to the primary ytdl server and provides management endpoints
 * for all gluetun/worker pairs.
 */

import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.MANAGER_PORT || '3001');

// ytdl primary -- no longer behind gluetun, directly on bridge network
const YTDL_HOST = process.env.YTDL_HOST || 'ytdl-local';
const YTDL_PORT = parseInt(process.env.YTDL_PORT || '3001');
const YTDL_TARGET = `http://${YTDL_HOST}:${YTDL_PORT}`;

// Gluetun containers: comma-separated names (for Docker socket operations)
const GLUETUN_CONTAINERS = (process.env.GLUETUN_CONTAINERS || 'gluetun-1-local,gluetun-2-local,gluetun-3-local')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Worker containers: comma-separated names (paired 1:1 with gluetun containers)
const WORKER_CONTAINERS = (process.env.WORKER_CONTAINERS || 'worker-1-local,worker-2-local,worker-3-local')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Gluetun hosts for control server API (same as container names on Docker bridge)
const GLUETUN_HOSTS = GLUETUN_CONTAINERS;

// Infrastructure containers (manager, ytdl primary, redis)
const MANAGER_CONTAINER = process.env.MANAGER_CONTAINER || 'manager-local';
const YTDL_CONTAINER = process.env.YTDL_CONTAINER || 'ytdl-local';
const REDIS_CONTAINER = process.env.REDIS_CONTAINER || 'redis-local';
const INFRA_CONTAINERS = [
  { name: MANAGER_CONTAINER, role: 'API Gateway / Proxy' },
  { name: YTDL_CONTAINER, role: 'Primary Server (API, Queue, DB)' },
  { name: REDIS_CONTAINER, role: 'Job Queue (Redis)' },
];

// ---------------------------------------------------------------------------
// Docker socket helpers
// ---------------------------------------------------------------------------

function dockerRequest(
  method: string,
  path: string,
  body?: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      socketPath: '/var/run/docker.sock',
      path,
      method,
      headers: body
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        : undefined,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () =>
        resolve({ statusCode: res.statusCode ?? 500, body: data }),
      );
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

function parseDockerLogs(raw: Buffer): string {
  const lines: string[] = [];
  let offset = 0;
  while (offset + 8 <= raw.length) {
    const size = raw.readUInt32BE(offset + 4);
    if (offset + 8 + size > raw.length) break;
    const line = raw.subarray(offset + 8, offset + 8 + size).toString('utf8');
    lines.push(line.replace(/\n$/, ''));
    offset += 8 + size;
  }
  return lines.join('\n') || raw.toString('utf8');
}

function fetchDockerLogs(
  containerName: string,
  tailLines: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      socketPath: '/var/run/docker.sock',
      path: `/containers/${containerName}/logs?stdout=1&stderr=1&tail=${tailLines}&timestamps=1`,
      method: 'GET',
    };
    const req = http.request(opts, (res) => {
      const chunks: Uint8Array[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(new Uint8Array(chunk)));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode === 200) {
          resolve(parseDockerLogs(buf));
        } else {
          reject(
            new Error(
              `Docker API returned ${res.statusCode}: ${buf.toString()}`,
            ),
          );
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Gluetun control server helpers
// ---------------------------------------------------------------------------

async function fetchGluetunApi(
  host: string,
  path: string,
  options?: RequestInit,
): Promise<Response> {
  return fetch(`http://${host}:8000${path}`, {
    ...options,
    signal: AbortSignal.timeout(5000),
  });
}

// Validate that a container name is one of the known gluetun containers
function validateContainer(container: string | undefined): string | null {
  if (!container) return null;
  if (GLUETUN_CONTAINERS.includes(container)) return container;
  return null;
}

// Get the paired worker container for a gluetun container
function getPairedWorker(gluetunContainer: string): string | null {
  const idx = GLUETUN_CONTAINERS.indexOf(gluetunContainer);
  if (idx === -1) return null;
  return WORKER_CONTAINERS[idx] || null;
}

// ---------------------------------------------------------------------------
// GET /health -- always returns 200
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'manager' });
});

// ---------------------------------------------------------------------------
// GET /manager/gluetun/status -- status of ALL gluetun containers
// ---------------------------------------------------------------------------

app.get('/manager/gluetun/status', async (req, res) => {
  const specificContainer = req.query.container as string | undefined;
  const containers = specificContainer
    ? [specificContainer].filter((c) => GLUETUN_CONTAINERS.includes(c))
    : GLUETUN_CONTAINERS;

  const results = await Promise.all(
    containers.map(async (containerName, idx) => {
      const result: any = {
        container: containerName,
        worker: WORKER_CONTAINERS[GLUETUN_CONTAINERS.indexOf(containerName)] || null,
        timestamp: new Date().toISOString(),
      };

      // 1. Container state via Docker API
      try {
        const { statusCode, body } = await dockerRequest(
          'GET',
          `/containers/${containerName}/json`,
        );
        if (statusCode === 200) {
          const info = JSON.parse(body);
          result.containerState = {
            status: info.State?.Status,
            running: info.State?.Running,
            health: info.State?.Health?.Status,
            startedAt: info.State?.StartedAt,
            restartCount: info.RestartCount,
          };
        } else {
          result.containerState = { error: `Docker API returned ${statusCode}` };
        }
      } catch (err) {
        result.containerState = {
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // 2. VPN status via gluetun control server
      const host = GLUETUN_HOSTS[GLUETUN_CONTAINERS.indexOf(containerName)] || containerName;
      try {
        const vpnRes = await fetchGluetunApi(host, '/v1/vpn/status');
        if (vpnRes.ok) {
          result.vpnStatus = await vpnRes.json();
        } else {
          result.vpnStatus = { error: `Control server returned ${vpnRes.status}` };
        }
      } catch (err) {
        result.vpnStatus = {
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // 3. Public IP via gluetun control server
      try {
        const ipRes = await fetchGluetunApi(host, '/v1/publicip/ip');
        if (ipRes.ok) {
          result.publicIp = await ipRes.json();
        } else {
          result.publicIp = { error: `Control server returned ${ipRes.status}` };
        }
      } catch (err) {
        result.publicIp = {
          error: err instanceof Error ? err.message : String(err),
        };
      }

      return result;
    }),
  );

  // Return array for multi, single object for specific container query
  if (specificContainer) {
    res.json(results[0] || { error: 'Container not found' });
  } else {
    res.json(results);
  }
});

// ---------------------------------------------------------------------------
// GET /manager/workers/status -- health of all workers
// ---------------------------------------------------------------------------

app.get('/manager/workers/status', async (_req, res) => {
  const results = await Promise.all(
    GLUETUN_CONTAINERS.map(async (gluetunHost, idx) => {
      const workerName = WORKER_CONTAINERS[idx] || `worker-${idx + 1}`;
      try {
        const response = await fetch(`http://${gluetunHost}:3001/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          return { worker: workerName, gluetun: gluetunHost, ...data };
        }
        return {
          worker: workerName,
          gluetun: gluetunHost,
          status: 'error',
          error: `HTTP ${response.status}`,
        };
      } catch (err) {
        return {
          worker: workerName,
          gluetun: gluetunHost,
          status: 'unreachable',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
  res.json(results);
});

// ---------------------------------------------------------------------------
// GET /manager/infrastructure/status -- status of manager, ytdl, redis
// ---------------------------------------------------------------------------

app.get('/manager/infrastructure/status', async (_req, res) => {
  const startTime = Date.now();
  const results = await Promise.all(
    INFRA_CONTAINERS.map(async ({ name, role }) => {
      const result: any = {
        container: name,
        role,
        timestamp: new Date().toISOString(),
      };

      // Container state via Docker API
      try {
        const { statusCode, body } = await dockerRequest(
          'GET',
          `/containers/${name}/json`,
        );
        if (statusCode === 200) {
          const info = JSON.parse(body);
          result.containerState = {
            status: info.State?.Status,
            running: info.State?.Running,
            health: info.State?.Health?.Status || null,
            startedAt: info.State?.StartedAt,
            restartCount: info.RestartCount,
            image: info.Config?.Image || null,
          };
        } else {
          result.containerState = { error: `Docker API returned ${statusCode}` };
        }
      } catch (err) {
        result.containerState = {
          error: err instanceof Error ? err.message : String(err),
        };
      }

      return result;
    }),
  );

  // Add manager self-report (since we know we're running)
  const managerEntry = results.find((r) => r.container === MANAGER_CONTAINER);
  if (managerEntry) {
    managerEntry.self = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      nodeVersion: process.version,
    };
  }

  res.json(results);
});

// ---------------------------------------------------------------------------
// POST /manager/workers/simulate-block -- toggle simulated YouTube block
// GET  /manager/workers/simulate-block -- get current simulate-block status
// ---------------------------------------------------------------------------

app.post('/manager/workers/simulate-block', async (req, res) => {
  const { worker: workerParam, enabled } = req.body;

  if (!workerParam) {
    return res.status(400).json({ error: 'Missing "worker" parameter (e.g. "gluetun-1-local")' });
  }

  const idx = GLUETUN_CONTAINERS.indexOf(workerParam);
  if (idx === -1) {
    return res.status(400).json({
      error: `Invalid worker. Must be one of: ${GLUETUN_CONTAINERS.join(', ')}`,
    });
  }

  const gluetunHost = GLUETUN_CONTAINERS[idx]!;
  try {
    const response = await fetch(`http://${gluetunHost}:3001/simulate-block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({
      error: `Failed to reach worker at ${gluetunHost}: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

app.get('/manager/workers/simulate-block', async (_req, res) => {
  const results = await Promise.all(
    GLUETUN_CONTAINERS.map(async (gluetunHost, idx) => {
      const workerName = WORKER_CONTAINERS[idx] || `worker-${idx + 1}`;
      try {
        const response = await fetch(`http://${gluetunHost}:3001/simulate-block`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          return { worker: workerName, gluetun: gluetunHost, ...data as object };
        }
        return { worker: workerName, gluetun: gluetunHost, simulateBlock: false, error: `HTTP ${response.status}` };
      } catch (err) {
        return { worker: workerName, gluetun: gluetunHost, simulateBlock: false, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
  res.json(results);
});

// ---------------------------------------------------------------------------
// POST /manager/gluetun/restart -- soft or hard restart a specific container
// ---------------------------------------------------------------------------

app.post('/manager/gluetun/restart', async (req, res) => {
  const { container, mode = 'soft' } = req.body;
  const containerName = validateContainer(container);

  if (!containerName) {
    return res.status(400).json({
      success: false,
      error: `Invalid container. Must be one of: ${GLUETUN_CONTAINERS.join(', ')}`,
    });
  }

  const host = GLUETUN_HOSTS[GLUETUN_CONTAINERS.indexOf(containerName)] || containerName;

  if (mode === 'hard') {
    console.log(`[manager] Hard restarting ${containerName}...`);
    try {
      const { statusCode, body } = await dockerRequest(
        'POST',
        `/containers/${containerName}/restart?t=30`,
      );
      if (statusCode !== 204) {
        return res
          .status(500)
          .json({ success: false, error: `Docker API returned ${statusCode}: ${body}` });
      }
      console.log(`[manager] Container ${containerName} restarted`);

      // Also restart the paired worker (shares gluetun's network namespace)
      const pairedWorker = getPairedWorker(containerName);
      if (pairedWorker) {
        console.log(`[manager] Restarting paired worker ${pairedWorker}...`);
        const workerResult = await dockerRequest(
          'POST',
          `/containers/${pairedWorker}/restart?t=10`,
        );
        if (workerResult.statusCode === 204) {
          console.log(`[manager] Worker ${pairedWorker} restarted`);
        } else {
          console.warn(
            `[manager] Failed to restart ${pairedWorker}: ${workerResult.statusCode} ${workerResult.body}`,
          );
        }
      }

      return res.json({
        success: true,
        message: `Container ${containerName}${pairedWorker ? ` and ${pairedWorker}` : ''} restarted. VPN will reconnect in 15-45 seconds.`,
        mode: 'hard',
        container: containerName,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Soft restart: toggle OpenVPN via gluetun control API
  try {
    console.log(`[manager] Soft restarting VPN on ${containerName} via ${host}:8000...`);

    const stopRes = await fetchGluetunApi(host, '/v1/openvpn/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'stopped' }),
    });
    if (!stopRes.ok) {
      throw new Error(`Failed to stop VPN: ${stopRes.status} ${await stopRes.text()}`);
    }

    await new Promise((r) => setTimeout(r, 2000));

    const startRes = await fetchGluetunApi(host, '/v1/openvpn/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'running' }),
    });
    if (!startRes.ok) {
      throw new Error(`Failed to start VPN: ${startRes.status} ${await startRes.text()}`);
    }

    res.json({
      success: true,
      message: `VPN on ${containerName} restarted. May take 10-30 seconds to reconnect.`,
      mode: 'soft',
      container: containerName,
    });
  } catch (err) {
    console.error(`[manager] Error restarting VPN on ${containerName}:`, err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ---------------------------------------------------------------------------
// POST /manager/gluetun/stop-vpn -- stop VPN on a specific container (testing)
// ---------------------------------------------------------------------------

app.post('/manager/gluetun/stop-vpn', async (req, res) => {
  const { container } = req.body;
  const containerName = validateContainer(container);

  if (!containerName) {
    return res.status(400).json({
      success: false,
      error: `Invalid container. Must be one of: ${GLUETUN_CONTAINERS.join(', ')}`,
    });
  }

  const host = GLUETUN_HOSTS[GLUETUN_CONTAINERS.indexOf(containerName)] || containerName;

  try {
    console.log(`[manager] Stopping VPN on ${containerName} via ${host}:8000 (test/debug)...`);
    const stopRes = await fetchGluetunApi(host, '/v1/openvpn/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'stopped' }),
    });
    if (!stopRes.ok) {
      throw new Error(`Failed to stop VPN: ${stopRes.status} ${await stopRes.text()}`);
    }
    res.json({
      success: true,
      message: `VPN on ${containerName} stopped. Use Soft/Hard Restart to reconnect.`,
      container: containerName,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ---------------------------------------------------------------------------
// POST /manager/gluetun/stop-container -- stop a specific gluetun container (testing)
// ---------------------------------------------------------------------------

app.post('/manager/gluetun/stop-container', async (req, res) => {
  const { container } = req.body;
  const containerName = validateContainer(container);

  if (!containerName) {
    return res.status(400).json({
      success: false,
      error: `Invalid container. Must be one of: ${GLUETUN_CONTAINERS.join(', ')}`,
    });
  }

  try {
    console.log(`[manager] Stopping ${containerName} via Docker API (test/debug)...`);
    const { statusCode, body } = await dockerRequest(
      'POST',
      `/containers/${containerName}/stop`,
    );
    if (statusCode === 204 || statusCode === 304) {
      res.json({
        success: true,
        message: `Container ${containerName} stopped. Use Hard Restart to bring it back.`,
        container: containerName,
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Docker API returned ${statusCode}: ${body}`,
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ---------------------------------------------------------------------------
// GET /manager/gluetun/logs -- logs for a specific gluetun container
// ---------------------------------------------------------------------------

app.get('/manager/gluetun/logs', async (req, res) => {
  const container = req.query.container as string | undefined;
  const containerName = container ? validateContainer(container) : GLUETUN_CONTAINERS[0];

  if (!containerName) {
    return res.status(400).json({
      success: false,
      error: `Invalid container. Must be one of: ${GLUETUN_CONTAINERS.join(', ')}`,
    });
  }

  const { tail = '100' } = req.query;
  const tailLines = Math.min(Math.max(parseInt(tail as string) || 100, 10), 500);

  try {
    const logs = await fetchDockerLogs(containerName, tailLines);
    res.json({ success: true, container: containerName, lines: tailLines, logs });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      hint: 'Is /var/run/docker.sock mounted?',
    });
  }
});

// ---------------------------------------------------------------------------
// Reverse proxy -- forward everything else to ytdl primary (direct bridge)
// ---------------------------------------------------------------------------

app.use((req, res) => {
  const url = new URL(req.url, YTDL_TARGET);

  // Build headers, stripping hop-by-hop headers
  const fwdHeaders = { ...req.headers, host: `${YTDL_HOST}:${YTDL_PORT}` };
  delete fwdHeaders['content-length'];
  delete fwdHeaders['transfer-encoding'];

  // Re-serialize parsed body (express.json() consumes the stream)
  let bodyBuf: Buffer | null = null;
  if (req.body && Object.keys(req.body).length > 0) {
    bodyBuf = Buffer.from(JSON.stringify(req.body));
    fwdHeaders['content-length'] = String(bodyBuf.length);
  }

  const proxyOpts: http.RequestOptions = {
    hostname: YTDL_HOST,
    port: YTDL_PORT,
    path: url.pathname + url.search,
    method: req.method,
    headers: fwdHeaders,
  };

  const proxyReq = http.request(proxyOpts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', async (err) => {
    console.error(`[manager] Proxy error: ${err.message}`);

    if (!res.headersSent) {
      res.status(502).json({
        error: 'ytdl service unreachable',
        reason: err.message,
        hint: 'The ytdl primary may be down or restarting.',
      });
    }
  });

  if (bodyBuf) {
    proxyReq.end(bodyBuf);
  } else {
    req.pipe(proxyReq, { end: true });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[manager] Running on port ${PORT}`);
  console.log(`[manager] Proxying to ytdl at ${YTDL_TARGET}`);
  console.log(`[manager] Gluetun containers: ${GLUETUN_CONTAINERS.join(', ')}`);
  console.log(`[manager] Worker containers: ${WORKER_CONTAINERS.join(', ')}`);
});
