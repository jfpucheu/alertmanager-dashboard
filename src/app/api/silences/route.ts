import { NextRequest, NextResponse } from 'next/server';
import { getAlertManagers, getConfig, resolveProxy } from '@/lib/store';
import { fetchSilences, createSilence } from '@/lib/alertmanager';
import { SilencePayload, AMSilences } from '@/types/alertmanager';

export async function GET() {
  const [alertManagers, config] = await Promise.all([getAlertManagers(), getConfig()]);
  const results: AMSilences[] = await Promise.all(
    alertManagers.map(async (am) => {
      const proxy = resolveProxy(am, config);
      try {
        const all = await fetchSilences(am.url, proxy, am.insecure);
        const silences = all.filter((s) => s.status.state === 'active');
        return { alertManager: am, silences, reachable: true };
      } catch (err) {
        return { alertManager: am, silences: [], reachable: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    })
  );
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { alertManagerId, silence } = body as { alertManagerId: string; silence: SilencePayload };

  if (!alertManagerId || !silence) {
    return NextResponse.json({ error: 'alertManagerId and silence are required' }, { status: 400 });
  }

  const [alertManagers, config] = await Promise.all([getAlertManagers(), getConfig()]);
  const am = alertManagers.find((a) => a.id === alertManagerId);
  if (!am) return NextResponse.json({ error: 'AlertManager not found' }, { status: 404 });

  const proxy = resolveProxy(am, config);
  try {
    const result = await createSilence(am.url, silence, proxy, am.insecure);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create silence' },
      { status: 500 }
    );
  }
}
