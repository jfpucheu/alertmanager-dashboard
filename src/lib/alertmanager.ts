import { ProxyAgent } from 'undici';
import { Alert, SeverityCounts, SilencePayload } from '@/types/alertmanager';

function makeDispatcher(proxyUrl?: string): ProxyAgent | undefined {
  if (!proxyUrl) return undefined;
  return new ProxyAgent(proxyUrl);
}

export async function fetchAlerts(baseUrl: string, proxyUrl?: string): Promise<Alert[]> {
  const url = `${baseUrl}/api/v2/alerts?active=true&silenced=false&inhibited=false`;
  const dispatcher = makeDispatcher(proxyUrl);
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
    ...(dispatcher ? { dispatcher } : {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export function getSeverity(alert: Alert): keyof SeverityCounts {
  const s = (alert.labels.severity ?? '').toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'error') return 'error';
  if (s === 'warning') return 'warning';
  if (s === 'info' || s === 'information' || s === 'informing') return 'info';
  return 'none';
}

export function countBySeverity(alerts: Alert[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, error: 0, warning: 0, info: 0, none: 0 };
  for (const alert of alerts) {
    counts[getSeverity(alert)]++;
  }
  return counts;
}

export async function createSilence(
  baseUrl: string,
  payload: SilencePayload,
  proxyUrl?: string
): Promise<{ silenceID: string }> {
  const url = `${baseUrl}/api/v2/silences`;
  const dispatcher = makeDispatcher(proxyUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
    ...(dispatcher ? { dispatcher } : {}),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return res.json();
}
