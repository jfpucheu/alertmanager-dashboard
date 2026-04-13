import { fetch as undiciFetch, ProxyAgent, Agent, type Dispatcher } from 'undici';
import { Alert, Silence, SilencePayload } from '@/types/alertmanager';
export { getSeverity, countBySeverity } from '@/lib/severity';

function makeDispatcher(proxyUrl?: string, insecure?: boolean): Dispatcher {
  const tls = insecure ? { rejectUnauthorized: false } : undefined;
  if (proxyUrl) {
    return new ProxyAgent({
      uri: proxyUrl,
      // requestTls = TLS options for the target server through the CONNECT tunnel
      // proxyTls   = TLS options for the proxy itself (if proxy is HTTPS)
      ...(tls ? { requestTls: tls, proxyTls: tls } : {}),
    });
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

/** Extend a silence by posting the same payload with updated endsAt (AM accepts id to update). */
export async function extendSilence(
  baseUrl: string,
  silence: Silence,
  extraMs: number,
  proxyUrl?: string,
  insecure?: boolean,
): Promise<{ silenceID: string }> {
  const url = `${baseUrl}/api/v2/silences`;
  const currentEnd = new Date(silence.endsAt).getTime();
  const newEnd = new Date(Math.max(currentEnd, Date.now()) + extraMs).toISOString();
  const payload = {
    id: silence.id,
    matchers: silence.matchers,
    startsAt: silence.startsAt,
    endsAt: newEnd,
    comment: silence.comment,
    createdBy: silence.createdBy,
  };
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
