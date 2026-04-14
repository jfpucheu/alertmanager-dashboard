/**
 * Kubernetes ConfigMap storage backend.
 * Reads credentials from the pod's service account (auto-mounted at runtime).
 * Falls back gracefully when not running inside a cluster.
 */

import fs from 'fs';
import https from 'https';

const SA_DIR = '/var/run/secrets/kubernetes.io/serviceaccount';
const TOKEN_FILE = `${SA_DIR}/token`;
const CA_FILE = `${SA_DIR}/ca.crt`;
const NS_FILE = `${SA_DIR}/namespace`;

const K8S_HOST = process.env.KUBERNETES_SERVICE_HOST;
const K8S_PORT = process.env.KUBERNETES_SERVICE_PORT ?? '443';

export function isInCluster(): boolean {
  return !!(K8S_HOST && fs.existsSync(TOKEN_FILE));
}

function readToken(): string {
  return fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
}

function readNamespace(): string {
  return process.env.K8S_NAMESPACE
    ?? (fs.existsSync(NS_FILE) ? fs.readFileSync(NS_FILE, 'utf-8').trim() : 'default');
}

const CONFIGMAP_NAME = process.env.K8S_CONFIGMAP_NAME ?? 'alertmanager-dashboard';

function k8sRequest(method: string, path: string, body?: object): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const token = readToken();
    const data = body ? JSON.stringify(body) : undefined;
    const options: https.RequestOptions = {
      hostname: K8S_HOST,
      port: parseInt(K8S_PORT),
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      ca: fs.existsSync(CA_FILE) ? fs.readFileSync(CA_FILE) : undefined,
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        const statusCode = res.statusCode ?? 0;
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(raw); } catch { /* keep empty */ }
        if (statusCode >= 400) {
          reject(new Error(`K8s API error ${statusCode}: ${raw}`));
          return;
        }
        resolve({ status: statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function cmPath(namespace: string) {
  return `/api/v1/namespaces/${namespace}/configmaps/${CONFIGMAP_NAME}`;
}

/** Fetch all keys from the ConfigMap's data field. */
export async function getConfigMapData(): Promise<Record<string, string>> {
  const ns = readNamespace();
  const { body } = await k8sRequest('GET', cmPath(ns));
  return (body.data as Record<string, string>) ?? {};
}

/** Patch a single key in the ConfigMap (creates the CM if it doesn't exist). */
export async function setConfigMapKey(key: string, value: string): Promise<void> {
  const ns = readNamespace();
  const path = cmPath(ns);

  // Try PATCH first (strategic merge)
  const patch = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: { name: CONFIGMAP_NAME, namespace: ns },
    data: { [key]: value },
  };

  try {
    await k8sRequest('PATCH', path, patch);
  } catch (err) {
    // PATCH returns 404 when the ConfigMap doesn't exist yet → create it
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('404')) {
      await k8sRequest('POST', `/api/v1/namespaces/${ns}/configmaps`, patch);
    } else {
      throw err;
    }
  }
}
