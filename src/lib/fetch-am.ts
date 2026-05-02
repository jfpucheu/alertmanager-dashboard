/**
 * Unified fetch helpers that route to browser-direct or server-proxy
 * depending on each AlertManager's fetchMode.
 */
import { AlertManager, AlertManagerStatus, AMSilences, Silence } from '@/types/alertmanager';
import { fetchAlertsDirect, fetchSilencesDirect, extendSilenceDirect, expireSilenceDirect, countBySeverity } from '@/lib/alertmanager-browser';

const EMPTY = { critical: 0, error: 0, warning: 0, info: 0, none: 0 };

export async function fetchAMAlerts(am: AlertManager): Promise<AlertManagerStatus> {
  if (am.fetchMode === 'browser') {
    try {
      const alerts = await fetchAlertsDirect(am.url);
      return { alertManager: am, alerts, severityCounts: countBySeverity(alerts), reachable: true };
    } catch (err) {
      return { alertManager: am, alerts: [], severityCounts: { ...EMPTY }, reachable: false, error: err instanceof Error ? err.message : 'Error' };
    }
  }
  // server-proxy mode
  const res = await fetch(`/api/alerts?amId=${am.id}`);
  const results: AlertManagerStatus[] = await res.json();
  return results[0] ?? { alertManager: am, alerts: [], severityCounts: { ...EMPTY }, reachable: false };
}

export async function fetchAMSilences(am: AlertManager): Promise<AMSilences> {
  if (am.fetchMode === 'browser') {
    try {
      const silences = await fetchSilencesDirect(am.url);
      return { alertManager: am, silences, reachable: true };
    } catch (err) {
      return { alertManager: am, silences: [], reachable: false, error: err instanceof Error ? err.message : 'Error' };
    }
  }
  const res = await fetch(`/api/silences?amId=${am.id}`);
  const results: AMSilences[] = await res.json();
  return results[0] ?? { alertManager: am, silences: [], reachable: false };
}

export async function extendAMSilence(am: AlertManager, silence: Silence, extraMs: number): Promise<void> {
  if (am.fetchMode === 'browser') {
    await extendSilenceDirect(am.url, silence, extraMs);
    return;
  }
  const res = await fetch('/api/silences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertManagerId: am.id, silence, extraMs }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
}

export async function expireAMSilence(am: AlertManager, silenceId: string): Promise<void> {
  if (am.fetchMode === 'browser') {
    await expireSilenceDirect(am.url, silenceId);
    return;
  }
  const res = await fetch(`/api/silences?amId=${am.id}&silenceId=${silenceId}`, { method: 'DELETE' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
}
