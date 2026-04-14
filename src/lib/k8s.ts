/**
 * Kubernetes ConfigMap storage backend.
 * Reads credentials from the pod's service account (auto-mounted at runtime).
 */

import fs from 'fs';
import https from 'https';

const SA_DIR = '/var/run/secrets/kubernetes.io/serviceaccount';
const TOKEN_FILE = `${SA_DIR}/token`;
const CA_FILE    = `${SA_DIR}/ca.crt`;
const NS_FILE    = `${SA_DIR}/namespace`;

const K8S_HOST = process.env.KUBERNETES_SERVICE_HOST;
const K8S_PORT = process.env.KUBERNETES_SERVICE_PORT ?? '443';

export function isInCluster(): boolean {
  return !!(K8S_HOST && fs.existsSync(TOKEN_FILE));
}

function readToken(): string {
  return fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
}

function readNamespace(): string {
  return (
    process.env.K8S_NAMESPACE ??
    (fs.existsSync(NS_FILE) ? fs.readFileSync(NS_FILE, 'utf-8').trim() : 'default')
  );
}

const CONFIGMAP_NAME = process.env.K8S_CONFIGMAP_NAME ?? 'alertmanager-dashboard';

// ── HTTP helper ────────────────────────────────────────────────────────────────

interface K8sResponse {
  status: number;
  body: Record<string, unknown>;
}

function k8sRequest(
  method: string,
  path: string,
  body?: object,
  contentType = 'application/json',
): Promise<K8sResponse> {
  return new Promise((resolve, reject) => {
    const token = readToken();
    const data  = body ? JSON.stringify(body) : undefined;

    const options: https.RequestOptions = {
      hostname: K8S_HOST,
      port:     parseInt(K8S_PORT),
      path,
      method,
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': contentType,
        Accept:         'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      ca: fs.existsSync(CA_FILE) ? fs.readFileSync(CA_FILE) : undefined,
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(raw); } catch { /* empty body */ }
        resolve({ status: res.statusCode ?? 0, body: parsed });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── ConfigMap helpers ──────────────────────────────────────────────────────────

function cmPath(namespace: string): string {
  return `/api/v1/namespaces/${namespace}/configmaps/${CONFIGMAP_NAME}`;
}

/** Fetch all keys from the ConfigMap's data field. Returns {} if the CM doesn't exist yet. */
export async function getConfigMapData(): Promise<Record<string, string>> {
  const ns = readNamespace();
  const { status, body } = await k8sRequest('GET', cmPath(ns));

  if (status === 404) return {};   // CM not yet created — that's fine

  if (status < 200 || status >= 300) {
    console.error(`[k8s] GET ConfigMap failed: HTTP ${status}`, JSON.stringify(body));
    throw new Error(`[k8s] GET ConfigMap failed: HTTP ${status}`);
  }

  return (body.data as Record<string, string>) ?? {};
}

/**
 * Write a single key into the ConfigMap.
 * Strategy: GET → merge → PUT (creates the CM via POST if it doesn't exist).
 * Using GET + PUT avoids Content-Type pitfalls with PATCH merge strategies.
 */
export async function setConfigMapKey(key: string, value: string): Promise<void> {
  const ns   = readNamespace();
  const path = cmPath(ns);

  // 1. Read current state
  const getResp = await k8sRequest('GET', path);

  if (getResp.status !== 200 && getResp.status !== 404) {
    console.error(`[k8s] GET ConfigMap failed: HTTP ${getResp.status}`, JSON.stringify(getResp.body));
    throw new Error(`[k8s] GET ConfigMap failed: HTTP ${getResp.status}`);
  }

  const existingData = (getResp.body.data as Record<string, string>) ?? {};

  const cm = {
    apiVersion: 'v1',
    kind:       'ConfigMap',
    metadata:   { name: CONFIGMAP_NAME, namespace: ns },
    data:       { ...existingData, [key]: value },
  };

  // 2a. ConfigMap exists → replace it
  if (getResp.status === 200) {
    const putResp = await k8sRequest('PUT', path, cm);
    if (putResp.status < 200 || putResp.status >= 300) {
      console.error(`[k8s] PUT ConfigMap failed: HTTP ${putResp.status}`, JSON.stringify(putResp.body));
      throw new Error(`[k8s] PUT ConfigMap failed: HTTP ${putResp.status}`);
    }
    return;
  }

  // 2b. ConfigMap doesn't exist → create it
  const postResp = await k8sRequest('POST', `/api/v1/namespaces/${ns}/configmaps`, cm);
  if (postResp.status < 200 || postResp.status >= 300) {
    console.error(`[k8s] POST ConfigMap failed: HTTP ${postResp.status}`, JSON.stringify(postResp.body));
    throw new Error(`[k8s] POST ConfigMap failed: HTTP ${postResp.status}`);
  }
}
