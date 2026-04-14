import { AlertManager, GlobalConfig, Assignment, AssignmentMap } from '@/types/alertmanager';
import { getStorageBackend } from '@/lib/storage';

// ── AlertManager input type ────────────────────────────────────

export interface AlertManagerInput {
  name: string;
  url: string;
  proxy?: string;
  noProxy?: boolean;
  insecure?: boolean;
}

// ── Validation ─────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function validateAlertManagerInput(data: AlertManagerInput): ValidationError | null {
  if (!data.name?.trim()) return { field: 'name', message: 'name is required' };
  if (!data.url?.trim()) return { field: 'url', message: 'url is required' };
  try { new URL(data.url); } catch {
    return { field: 'url', message: 'Invalid URL format' };
  }
  if (data.proxy) {
    try { new URL(data.proxy); } catch {
      return { field: 'proxy', message: 'Invalid proxy URL format' };
    }
  }
  return null;
}

// ── AlertManagers ──────────────────────────────────────────────

export async function getAlertManagers(): Promise<AlertManager[]> {
  return getStorageBackend().get<AlertManager[]>('alertmanagers', []);
}

export async function addAlertManager(data: AlertManagerInput): Promise<AlertManager> {
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
  await getStorageBackend().set('alertmanagers', list);
  return newAM;
}

export async function updateAlertManager(id: string, data: AlertManagerInput): Promise<AlertManager | null> {
  const list = await getAlertManagers();
  const idx = list.findIndex((am) => am.id === id);
  if (idx === -1) return null;
  const updated: AlertManager = {
    ...list[idx],
    name: data.name,
    url: data.url.replace(/\/$/, ''),
    proxy: data.proxy || undefined,
    noProxy: data.noProxy || undefined,
    insecure: data.insecure || undefined,
  };
  list[idx] = updated;
  await getStorageBackend().set('alertmanagers', list);
  return updated;
}

export async function removeAlertManager(id: string): Promise<boolean> {
  const list = await getAlertManagers();
  const filtered = list.filter((am) => am.id !== id);
  if (filtered.length === list.length) return false;
  await getStorageBackend().set('alertmanagers', filtered);
  return true;
}

// ── Global config ──────────────────────────────────────────────

export async function getConfig(): Promise<GlobalConfig> {
  return getStorageBackend().get<GlobalConfig>('config', {});
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  await getStorageBackend().set('config', config);
}

// ── Assignments ────────────────────────────────────────────────

export async function getAssignments(): Promise<AssignmentMap> {
  return getStorageBackend().get<AssignmentMap>('assignments', {});
}

export async function setAssignment(amId: string, fingerprint: string, name: string): Promise<Assignment> {
  const map = await getAssignments();
  const key = `${amId}::${fingerprint}`;
  const assignment: Assignment = { key, name, assignedAt: new Date().toISOString() };
  map[key] = assignment;
  await getStorageBackend().set('assignments', map);
  return assignment;
}

export async function removeAssignment(amId: string, fingerprint: string): Promise<boolean> {
  const map = await getAssignments();
  const key = `${amId}::${fingerprint}`;
  if (!map[key]) return false;
  delete map[key];
  await getStorageBackend().set('assignments', map);
  return true;
}

// ── Proxy resolution ───────────────────────────────────────────

export function resolveProxy(am: AlertManager, config: GlobalConfig): string | undefined {
  if (am.noProxy) return undefined;
  if (am.proxy) return am.proxy;
  return config.proxy || undefined;
}
