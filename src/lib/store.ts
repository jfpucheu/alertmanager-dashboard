import fs from 'fs';
import path from 'path';
import { AlertManager } from '@/types/alertmanager';

const DATA_FILE = path.join(process.cwd(), 'data', 'alertmanagers.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

export function getAlertManagers(): AlertManager[] {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

export function addAlertManager(data: { name: string; url: string }): AlertManager {
  const list = getAlertManagers();
  const newAM: AlertManager = {
    id: crypto.randomUUID(),
    name: data.name,
    url: data.url.replace(/\/$/, ''),
    createdAt: new Date().toISOString(),
  };
  list.push(newAM);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  return newAM;
}

export function removeAlertManager(id: string): boolean {
  const list = getAlertManagers();
  const filtered = list.filter((am) => am.id !== id);
  if (filtered.length === list.length) return false;
  fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
  return true;
}
