import { fetch as undiciFetch, ProxyAgent, Agent, type Dispatcher } from 'undici';
import { Alert, Silence, SilencePayload } from '@/types/alertmanager';
export { getSeverity, countBySeverity } from '@/lib/severity';

export const DEFAULT_TIMEOUT_MS = 8000;

function makeDispatcher(proxyUrl?: string, insecure?: boolean): Dispatcher {
  const tls = insecure ? { rejectUnauthorized: false } : undefined;
  if (proxyUrl) {
    return new ProxyAgent({
      uri: proxyUrl,
      ...(tls ? { requestTls: tls, proxyTls: tls } : {}),
    });
  }
  return new Agent({ ...(tls ? { connect: tls } : {}) });
}

/** Central fetch helper for all Alertmanager API calls. */
async function amFetch(
  url: string,
  options: { method?: string; body?: string; timeoutMs?: number; proxyUrl?: string; insecure?: boolean },
): Promise<Response> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, proxyUrl, insecure } = options;
  const res = await undiciFetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
    dispatcher: makeDispatcher(proxyUrl, insecure),
  });
  return res as unknown as Response;
}

export async function fetchAlerts(
  baseUrl: string,
  proxyUrl?: string,
  insecure?: boolean,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Alert[]> {
  const url = `${baseUrl}/api/v2/alerts?active=true&silenced=false&inhibited=false`;
  const res = await amFetch(url, { proxyUrl, insecure, timeoutMs });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json() as Promise<Alert[]>;
}

export async function fetchSilences(
  baseUrl: string,
  proxyUrl?: string,
  insecure?: boolean,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Silence[]> {
  const url = `${baseUrl}/api/v2/silences`;
  const res = await amFetch(url, { proxyUrl, insecure, timeoutMs });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json() as Promise<Silence[]>;
}

export async function expireSilence(
  baseUrl: string,
  silenceId: string,
  proxyUrl?: string,
  insecure?: boolean,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> {
  const url = `${baseUrl}/api/v2/silence/${silenceId}`;
  const res = await amFetch(url, { method: 'DELETE', proxyUrl, insecure, timeoutMs });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
}

export async function extendSilence(
  baseUrl: string,
  silence: Silence,
  extraMs: number,
  proxyUrl?: string,
  insecure?: boolean,
  timeoutMs = DEFAULT_TIMEOUT_MS,
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
  const res = await amFetch(url, { method: 'POST', body: JSON.stringify(payload), proxyUrl, insecure, timeoutMs });
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
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ silenceID: string }> {
  const url = `${baseUrl}/api/v2/silences`;
  const res = await amFetch(url, { method: 'POST', body: JSON.stringify(payload), proxyUrl, insecure, timeoutMs });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return res.json() as Promise<{ silenceID: string }>;
}
