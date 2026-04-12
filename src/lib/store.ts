import fs from 'fs';
import path from 'path';
import { AlertManager, GlobalConfig } from '@/types/alertmanager';

const DATA_DIR = path.join(process.cwd(), 'data');
const AM_FILE = path.join(DATA_DIR, 'alertmanagers.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── AlertManagers ──────────────────────────────────────────────

export function getAlertManagers(): AlertManager[] {
  ensureDataDir();
  if (!fs.existsSync(AM_FILE)) fs.writeFileSync(AM_FILE, '[]');
  return JSON.parse(fs.readFileSync(AM_FILE, 'utf-8'));
}

export function addAlertManager(data: {
  name: string;
  url: string;
  proxy?: string;
  noProxy?: boolean;
}): AlertManager {
  const list = getAlertManagers();
  const newAM: AlertManager = {
    id: crypto.randomUUID(),
    name: data.name,
    url: data.url.replace(/\/$/, ''),
    createdAt: new Date().toISOString(),
    ...(data.proxy ? { proxy: data.proxy } : {}),
    ...(data.noProxy ? { noProxy: true } : {}),
  };
  list.push(newAM);
  fs.writeFileSync(AM_FILE, JSON.stringify(list, null, 2));
  return newAM;
}

export function removeAlertManager(id: string): boolean {
  const list = getAlertManagers();
  const filtered = list.filter((am) => am.id !== id);
  if (filtered.length === list.length) return false;
  fs.writeFileSync(AM_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

// ── Global config ──────────────────────────────────────────────

export function getConfig(): GlobalConfig {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveConfig(config: GlobalConfig): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ── Proxy resolution ───────────────────────────────────────────

/** Returns the effective proxy URL for a given AlertManager. */
export function resolveProxy(am: AlertManager, config: GlobalConfig): string | undefined {
  if (am.noProxy) return undefined;
  if (am.proxy) return am.proxy;
  return config.proxy || undefined;
}
