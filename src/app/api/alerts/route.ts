import { NextResponse } from 'next/server';
import { getAlertManagers, getConfig, resolveProxy } from '@/lib/store';
import { fetchAlerts, countBySeverity } from '@/lib/alertmanager';
import { AlertManagerStatus } from '@/types/alertmanager';

export async function GET() {
  const [alertManagers, config] = await Promise.all([getAlertManagers(), getConfig()]);

  const results: AlertManagerStatus[] = await Promise.all(
    alertManagers.map(async (am) => {
      const proxy = resolveProxy(am, config);
      try {
        const alerts = await fetchAlerts(am.url, proxy, am.insecure);
        return { alertManager: am, alerts, severityCounts: countBySeverity(alerts), reachable: true };
      } catch (err) {
        return {
          alertManager: am,
          alerts: [],
          severityCounts: { critical: 0, error: 0, warning: 0, info: 0, none: 0 },
          reachable: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    })
  );

  return NextResponse.json(results);
}
