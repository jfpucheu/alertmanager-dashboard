/**
 * StorageBackend — abstraction interface for key/value persistence.
 *
 * Implementations:
 *   - FileStorageBackend  : JSON files under /data (local dev)
 *   - K8sStorageBackend   : Kubernetes ConfigMap (in-cluster)
 *   - MemoryStorageBackend: in-memory map (tests / CI)
 */

import fs from 'fs';
import path from 'path';
import { isInCluster, getConfigMapData, setConfigMapKey } from '@/lib/k8s';

export interface StorageBackend {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
}

// ── File backend ───────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data');
const FILES: Record<string, string> = {
  alertmanagers: path.join(DATA_DIR, 'alertmanagers.json'),
  config:        path.join(DATA_DIR, 'config.json'),
  assignments:   path.join(DATA_DIR, 'assignments.json'),
};

export class FileStorageBackend implements StorageBackend {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  async get<T>(key: string, fallback: T): Promise<T> {
    this.ensureDataDir();
    const file = FILES[key];
    if (!file || !fs.existsSync(file)) return fallback;
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.ensureDataDir();
    const file = FILES[key];
    if (file) fs.writeFileSync(file, JSON.stringify(value, null, 2));
  }
}

// ── Kubernetes ConfigMap backend ───────────────────────────────

export class K8sStorageBackend implements StorageBackend {
  async get<T>(key: string, fallback: T): Promise<T> {
    const data = await getConfigMapData();
    if (!data[key]) return fallback;
    try { return JSON.parse(data[key]); } catch { return fallback; }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await setConfigMapKey(key, JSON.stringify(value, null, 2));
  }
}

// ── In-memory backend (for tests) ─────────────────────────────

export class MemoryStorageBackend implements StorageBackend {
  private store = new Map<string, string>();

  async get<T>(key: string, fallback: T): Promise<T> {
    const raw = this.store.get(key);
    if (raw === undefined) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  /** Reset state between tests */
  clear() { this.store.clear(); }
}

// ── Singleton resolution ───────────────────────────────────────

let _backend: StorageBackend | null = null;

export function getStorageBackend(): StorageBackend {
  if (!_backend) {
    _backend = isInCluster() ? new K8sStorageBackend() : new FileStorageBackend();
  }
  return _backend;
}

/** Override the backend (useful for tests) */
export function setStorageBackend(backend: StorageBackend) {
  _backend = backend;
}
