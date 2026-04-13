#!/usr/bin/env node
/**
 * Mock Alertmanager server — implements Alertmanager API v2
 *
 * Usage:
 *   node mock/alertmanager.mjs [port] [preset]
 *
 * Presets:  prod (default) | staging | quiet
 * Examples:
 *   node mock/alertmanager.mjs 9093 prod
 *   node mock/alertmanager.mjs 9094 staging
 *   node mock/alertmanager.mjs 9095 quiet
 */

import http from 'http';

const PORT = parseInt(process.argv[2] ?? '9093', 10);
const PRESET = process.argv[3] ?? 'prod';

// ── helpers ────────────────────────────────────────────────────────────────

function ago(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function future(hours) {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function makeAlert({ name, severity, instance, job, summary, description, startMinutesAgo = 10 }) {
  return {
    labels: {
      alertname: name,
      severity,
      instance,
      job,
      env: PRESET,
    },
    annotations: {
      summary,
      description,
    },
    startsAt: ago(startMinutesAgo),
    endsAt: future(1),
    updatedAt: ago(1),
    status: {
      state: 'active',
      silencedBy: [],
      inhibitedBy: [],
    },
    receivers: [{ name: 'default' }],
    fingerprint: Buffer.from(`${name}-${instance}-${PRESET}`).toString('hex').slice(0, 16),
  };
}

// ── presets ────────────────────────────────────────────────────────────────

const PRESETS = {
  prod: [
    makeAlert({
      name: 'KubePodCrashLooping',
      severity: 'critical',
      instance: 'pod/payment-service-7d9f8b-xkp2m',
      job: 'kubelet',
      summary: 'Pod is crash looping',
      description: 'Pod payment-service-7d9f8b-xkp2m in namespace production is restarting 5 times / 10 minutes.',
      startMinutesAgo: 23,
    }),
    makeAlert({
      name: 'NodeMemoryPressure',
      severity: 'critical',
      instance: 'node-01.prod.internal:9100',
      job: 'node-exporter',
      summary: 'Node memory pressure',
      description: 'Node node-01.prod.internal has less than 5% memory available.',
      startMinutesAgo: 8,
    }),
    makeAlert({
      name: 'PostgresReplicationLag',
      severity: 'error',
      instance: 'postgres-replica-02:5432',
      job: 'postgres-exporter',
      summary: 'Postgres replication lag is high',
      description: 'Replication lag on postgres-replica-02 is 45 seconds (threshold: 30s).',
      startMinutesAgo: 15,
    }),
    makeAlert({
      name: 'HighHTTPErrorRate',
      severity: 'error',
      instance: 'api-gateway-prod:8080',
      job: 'api-gateway',
      summary: 'HTTP 5xx error rate above threshold',
      description: 'Error rate for api-gateway-prod is 8.3% over the last 5 minutes (threshold: 5%).',
      startMinutesAgo: 5,
    }),
    makeAlert({
      name: 'KubeDeploymentReplicasMismatch',
      severity: 'warning',
      instance: 'deploy/order-service',
      job: 'kube-state-metrics',
      summary: 'Deployment replicas mismatch',
      description: 'Deployment order-service has 2/3 replicas available.',
      startMinutesAgo: 31,
    }),
    makeAlert({
      name: 'DiskSpaceRunningLow',
      severity: 'warning',
      instance: 'node-03.prod.internal:9100',
      job: 'node-exporter',
      summary: 'Disk space below 20%',
      description: 'Filesystem /data on node-03.prod.internal has 18% free space remaining.',
      startMinutesAgo: 60,
    }),
    makeAlert({
      name: 'SlowDatabaseQueries',
      severity: 'warning',
      instance: 'postgres-primary:5432',
      job: 'postgres-exporter',
      summary: 'Slow queries detected',
      description: 'P95 query latency on postgres-primary is 2.1s (threshold: 1s).',
      startMinutesAgo: 12,
    }),
    makeAlert({
      name: 'CertificateExpiringSoon',
      severity: 'info',
      instance: 'api.example.com',
      job: 'blackbox-exporter',
      summary: 'TLS certificate expiring in 14 days',
      description: 'TLS certificate for api.example.com will expire on 2026-04-26.',
      startMinutesAgo: 120,
    }),
    makeAlert({
      name: 'ScaleUpEvent',
      severity: 'info',
      instance: 'hpa/frontend',
      job: 'kube-state-metrics',
      summary: 'HPA scaled up deployment',
      description: 'HPA frontend scaled deployment from 3 to 5 replicas due to CPU pressure.',
      startMinutesAgo: 3,
    }),
    makeAlert({
      name: 'UnknownSeverityAlert',
      severity: 'debug',
      instance: 'custom-exporter:9999',
      job: 'custom',
      summary: 'Alert with non-standard severity',
      description: 'This alert has a custom severity label that maps to "none".',
      startMinutesAgo: 45,
    }),
  ],

  staging: [
    makeAlert({
      name: 'KubePodNotReady',
      severity: 'warning',
      instance: 'pod/frontend-staging-abc12',
      job: 'kubelet',
      summary: 'Pod not ready',
      description: 'Pod frontend-staging-abc12 has been in a non-ready state for 5 minutes.',
      startMinutesAgo: 7,
    }),
    makeAlert({
      name: 'HighMemoryUsage',
      severity: 'warning',
      instance: 'node-staging-01:9100',
      job: 'node-exporter',
      summary: 'Memory usage above 85%',
      description: 'Memory usage on node-staging-01 is 87%.',
      startMinutesAgo: 20,
    }),
    makeAlert({
      name: 'TestAlertFiring',
      severity: 'info',
      instance: 'alertmanager-staging:9093',
      job: 'alertmanager',
      summary: 'Test alert for staging',
      description: 'This is a test alert to verify alertmanager routing in staging.',
      startMinutesAgo: 2,
    }),
  ],

  quiet: [
    makeAlert({
      name: 'CertificateExpiringSoon',
      severity: 'info',
      instance: 'internal.example.com',
      job: 'blackbox-exporter',
      summary: 'TLS certificate expiring in 29 days',
      description: 'TLS certificate for internal.example.com will expire on 2026-05-11.',
      startMinutesAgo: 300,
    }),
  ],
};

// ── state ──────────────────────────────────────────────────────────────────

const alerts = PRESETS[PRESET] ?? PRESETS.prod;
const silences = [];

// ── server ─────────────────────────────────────────────────────────────────

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);

  // GET /api/v2/alerts
  if (req.method === 'GET' && path === '/api/v2/alerts') {
    const active = url.searchParams.get('active') !== 'false';
    const silenced = url.searchParams.get('silenced') !== 'false';
    let result = [...alerts];
    if (!silenced) result = result.filter((a) => a.status.silencedBy.length === 0);
    if (!active) result = [];
    return json(res, 200, result);
  }

  // GET /api/v2/silences
  if (req.method === 'GET' && path === '/api/v2/silences') {
    return json(res, 200, silences);
  }

  // POST /api/v2/silences
  if (req.method === 'POST' && path === '/api/v2/silences') {
    const body = await readBody(req);
    const id = Math.random().toString(36).slice(2, 10);
    const silence = { ...body, id, status: { state: 'active' } };
    silences.push(silence);
    console.log(`  → Created silence ${id} with ${body.matchers?.length ?? 0} matcher(s)`);
    return json(res, 200, { silenceID: id });
  }

  // DELETE /api/v2/silence/:id
  if (req.method === 'DELETE' && path.startsWith('/api/v2/silence/')) {
    const id = path.split('/').pop();
    const idx = silences.findIndex((s) => s.id === id);
    if (idx === -1) return json(res, 404, { error: `Silence ${id} not found` });
    silences[idx] = { ...silences[idx], status: { state: 'expired' } };
    console.log(`  → Expired silence ${id}`);
    return json(res, 200, {});
  }

  // GET /api/v2/status (bonus — for health checks)
  if (req.method === 'GET' && path === '/api/v2/status') {
    return json(res, 200, {
      cluster: { name: `mock-${PRESET}`, status: 'ready', peers: [] },
      versionInfo: { version: '0.27.0-mock', branch: 'main' },
      config: { original: '' },
      uptime: new Date(Date.now() - 3600_000).toISOString(),
    });
  }

  json(res, 404, { error: `Not found: ${path}` });
});

server.listen(PORT, () => {
  const counts = Object.fromEntries(
    ['critical', 'error', 'warning', 'info', 'none'].map((s) => [
      s,
      alerts.filter((a) => {
        const v = (a.labels.severity ?? '').toLowerCase();
        if (s === 'none') return !['critical','error','warning','info','information','informing'].includes(v);
        if (s === 'info') return ['info','information','informing'].includes(v);
        return v === s;
      }).length,
    ])
  );
  console.log(`\n🔔 Mock Alertmanager (${PRESET}) listening on http://localhost:${PORT}`);
  console.log(`   Alerts: ${alerts.length} total —`, Object.entries(counts).map(([k,v]) => `${k}:${v}`).join('  '));
  console.log(`   GET    /api/v2/alerts`);
  console.log(`   GET    /api/v2/silences`);
  console.log(`   POST   /api/v2/silences`);
  console.log(`   DELETE /api/v2/silence/:id\n`);
});
