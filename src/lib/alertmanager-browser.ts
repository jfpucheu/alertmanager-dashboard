/**
 * Browser-direct mode: the browser calls alertmanager APIs without going
 * through the Next.js server. No proxy or TLS-override support — the browser
 * uses its own network stack. Alertmanager must have CORS configured.
 *
 * Alertmanager flag: --web.cors.origin='https://your-dashboard.example.com'
 */
import type { Alert, Silence, SilencePayload } from '@/types/alertmanager';
export { countBySeverity } from '@/lib/severity';

export async function fetchAlertsDirect(baseUrl: string): Promise<Alert[]> {
  const res = await fetch(
    `${baseUrl}/api/v2/alerts?active=true&silenced=false&inhibited=false`,
    { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchSilencesDirect(baseUrl: string): Promise<Silence[]> {
  const res = await fetch(
    `${baseUrl}/api/v2/silences`,
    { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export async function expireSilenceDirect(baseUrl: string, silenceId: string): Promise<void> {
  const res = await fetch(
    `${baseUrl}/api/v2/silence/${silenceId}`,
    { method: 'DELETE', signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
}

export async function extendSilenceDirect(
  baseUrl: string,
  silence: Silence,
  extraMs: number,
): Promise<{ silenceID: string }> {
  const currentEnd = new Date(silence.endsAt).getTime();
  const newEnd = new Date(Math.max(currentEnd, Date.now()) + extraMs).toISOString();
  const res = await fetch(`${baseUrl}/api/v2/silences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: silence.id,
      matchers: silence.matchers,
      startsAt: silence.startsAt,
      endsAt: newEnd,
      comment: silence.comment,
      createdBy: silence.createdBy,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export async function createSilenceDirect(
  baseUrl: string,
  payload: SilencePayload,
): Promise<{ silenceID: string }> {
  const res = await fetch(`${baseUrl}/api/v2/silences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}
