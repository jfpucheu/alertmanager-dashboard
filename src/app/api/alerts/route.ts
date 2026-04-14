import { NextRequest, NextResponse } from 'next/server';
import { getAlertManagers, getConfig, resolveProxy } from '@/lib/store';
import { fetchAlerts, countBySeverity } from '@/lib/alertmanager';
import { AlertManagerStatus } from '@/types/alertmanager';

const EMPTY = { critical: 0, error: 0, warning: 0, info: 0, none: 0 };

export async function GET(req: NextRequest) {
  const amId = new URL(req.url).searchParams.get('amId');
  const [alertManagers, config] = await Promise.all([getAlertManagers(), getConfig()]);
  const targets = amId ? alertManagers.filter((am) => am.id === amId) : alertManagers;

  const results: AlertManagerStatus[] = await Promise.all(
    targets.map(async (am) => {
      const proxy = resolveProxy(am, config);
      try {
        const alerts = await fetchAlerts(am.url, proxy, am.insecure);
        return { alertManager: am, alerts, severityCounts: countBySeverity(alerts), reachable: true };
      } catch (err) {
        return {
          alertManager: am,
          alerts: [],
          severityCounts: { ...EMPTY },
          reachable: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    })
  );

  return NextResponse.json(results);
}
