import { ProxyAgent } from 'undici';
import { Alert, SilencePayload } from '@/types/alertmanager';
export { getSeverity, countBySeverity } from '@/lib/severity';

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
