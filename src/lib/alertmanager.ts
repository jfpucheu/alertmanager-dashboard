import { fetch as undiciFetch, ProxyAgent, Agent, type Dispatcher } from 'undici';
import { Alert, Silence, SilencePayload } from '@/types/alertmanager';
export { getSeverity, countBySeverity } from '@/lib/severity';

function makeDispatcher(proxyUrl?: string, insecure?: boolean): Dispatcher {
  const tls = insecure ? { rejectUnauthorized: false } : undefined;
  if (proxyUrl) {
    return new ProxyAgent({ uri: proxyUrl, ...(tls ? { connect: tls } : {}) });
  }
  return new Agent({ ...(tls ? { connect: tls } : {}) });
}

export async function fetchAlerts(baseUrl: string, proxyUrl?: string, insecure?: boolean): Promise<Alert[]> {
  const url = `${baseUrl}/api/v2/alerts?active=true&silenced=false&inhibited=false`;
  const res = await undiciFetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    dispatcher: makeDispatcher(proxyUrl, insecure),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json() as Promise<Alert[]>;
}

export async function fetchSilences(baseUrl: string, proxyUrl?: string, insecure?: boolean): Promise<Silence[]> {
  const url = `${baseUrl}/api/v2/silences`;
  const res = await undiciFetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    dispatcher: makeDispatcher(proxyUrl, insecure),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json() as Promise<Silence[]>;
}

export async function expireSilence(baseUrl: string, silenceId: string, proxyUrl?: string, insecure?: boolean): Promise<void> {
  const url = `${baseUrl}/api/v2/silence/${silenceId}`;
  const res = await undiciFetch(url, {
    method: 'DELETE',
    signal: AbortSignal.timeout(8000),
    dispatcher: makeDispatcher(proxyUrl, insecure),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
}

export async function createSilence(
  baseUrl: string,
  payload: SilencePayload,
  proxyUrl?: string,
  insecure?: boolean,
): Promise<{ silenceID: string }> {
  const url = `${baseUrl}/api/v2/silences`;
  const res = await undiciFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
    dispatcher: makeDispatcher(proxyUrl, insecure),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return res.json() as Promise<{ silenceID: string }>;
}
