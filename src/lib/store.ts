import fs from 'fs';
import path from 'path';
import { AlertManager, GlobalConfig, Assignment, AssignmentMap } from '@/types/alertmanager';
import { isInCluster, getConfigMapData, setConfigMapKey } from '@/lib/k8s';

// ── Storage abstraction ────────────────────────────────────────
// In-cluster  → Kubernetes ConfigMap (data stored in etcd)
// Local dev   → JSON files under /data

const DATA_DIR = path.join(process.cwd(), 'data');
const FILES = {
  alertmanagers: path.join(DATA_DIR, 'alertmanagers.json'),
  config:        path.join(DATA_DIR, 'config.json'),
  assignments:   path.join(DATA_DIR, 'assignments.json'),
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Generic read/write ─────────────────────────────────────────

async function readKey<T>(key: string, fallback: T): Promise<T> {
  if (isInCluster()) {
    const data = await getConfigMapData();
    if (!data[key]) return fallback;
    try { return JSON.parse(data[key]); } catch { return fallback; }
  }
  ensureDataDir();
  const file = FILES[key as keyof typeof FILES];
  if (!file || !fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value, null, 2);
  if (isInCluster()) {
    await setConfigMapKey(key, json);
    return;
  }
  ensureDataDir();
  const file = FILES[key as keyof typeof FILES];
  if (file) fs.writeFileSync(file, json);
}

// ── AlertManagers ──────────────────────────────────────────────

export async function getAlertManagers(): Promise<AlertManager[]> {
  return readKey<AlertManager[]>('alertmanagers', []);
}

export async function addAlertManager(data: {
  name: string;
  url: string;
  proxy?: string;
  noProxy?: boolean;
  insecure?: boolean;
}): Promise<AlertManager> {
  const list = await getAlertManagers();
  const newAM: AlertManager = {
    id: crypto.randomUUID(),
    name: data.name,
    url: data.url.replace(/\/$/, ''),
    createdAt: new Date().toISOString(),
    ...(data.proxy ? { proxy: data.proxy } : {}),
    ...(data.noProxy ? { noProxy: true } : {}),
    ...(data.insecure ? { insecure: true } : {}),
  };
  list.push(newAM);
  await writeKey('alertmanagers', list);
  return newAM;
}

export async function removeAlertManager(id: string): Promise<boolean> {
  const list = await getAlertManagers();
  const filtered = list.filter((am) => am.id !== id);
  if (filtered.length === list.length) return false;
  await writeKey('alertmanagers', filtered);
  return true;
}

// ── Global config ──────────────────────────────────────────────

export async function getConfig(): Promise<GlobalConfig> {
  return readKey<GlobalConfig>('config', {});
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  await writeKey('config', config);
}

// ── Assignments ────────────────────────────────────────────────

export async function getAssignments(): Promise<AssignmentMap> {
  return readKey<AssignmentMap>('assignments', {});
}

export async function setAssignment(amId: string, fingerprint: string, name: string): Promise<Assignment> {
  const map = await getAssignments();
  const key = `${amId}::${fingerprint}`;
  const assignment: Assignment = { key, name, assignedAt: new Date().toISOString() };
  map[key] = assignment;
  await writeKey('assignments', map);
  return assignment;
}

export async function removeAssignment(amId: string, fingerprint: string): Promise<boolean> {
  const map = await getAssignments();
  const key = `${amId}::${fingerprint}`;
  if (!map[key]) return false;
  delete map[key];
  await writeKey('assignments', map);
  return true;
}

// ── Proxy resolution ───────────────────────────────────────────

export function resolveProxy(am: AlertManager, config: GlobalConfig): string | undefined {
  if (am.noProxy) return undefined;
  if (am.proxy) return am.proxy;
  return config.proxy || undefined;
}
