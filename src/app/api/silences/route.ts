import { NextRequest, NextResponse } from 'next/server';
import { getAlertManagers, getConfig, resolveProxy } from '@/lib/store';
import { fetchSilences, createSilence, expireSilence, extendSilence } from '@/lib/alertmanager';
import { SilencePayload, AMSilences, Silence } from '@/types/alertmanager';

export async function GET(req: NextRequest) {
  const amId = new URL(req.url).searchParams.get('amId');
  const [alertManagers, config] = await Promise.all([getAlertManagers(), getConfig()]);
  const targets = amId ? alertManagers.filter((am) => am.id === amId) : alertManagers;

  const results: AMSilences[] = await Promise.all(
    targets.map(async (am) => {
      const proxy = resolveProxy(am, config);
      try {
        const silences = await fetchSilences(am.url, proxy, am.insecure);
        return { alertManager: am, silences, reachable: true };
      } catch (err) {
        return { alertManager: am, silences: [], reachable: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    })
  );
  return NextResponse.json(results);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { alertManagerId: string; silence: Silence; extraMs: number };
  const { alertManagerId, silence, extraMs } = body;
  if (!alertManagerId || !silence || !extraMs) {
    return NextResponse.json({ error: 'alertManagerId, silence and extraMs are required' }, { status: 400 });
  }
  const [alertManagers, config] = await Promise.all([getAlertManagers(), getConfig()]);
  const am = alertManagers.find((a) => a.id === alertManagerId);
  if (!am) return NextResponse.json({ error: 'AlertManager not found' }, { status: 404 });
  const proxy = resolveProxy(am, config);
  try {
    const result = await extendSilence(am.url, silence, extraMs, proxy, am.insecure);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alertManagerId = searchParams.get('amId');
  const silenceId = searchParams.get('silenceId');
  if (!alertManagerId || !silenceId) {
    return NextResponse.json({ error: 'amId and silenceId are required' }, { status: 400 });
  }
  const [alertManagers, config] = await Promise.all([getAlertManagers(), getConfig()]);
  const am = alertManagers.find((a) => a.id === alertManagerId);
  if (!am) return NextResponse.json({ error: 'AlertManager not found' }, { status: 404 });
  const proxy = resolveProxy(am, config);
  try {
    await expireSilence(am.url, silenceId, proxy, am.insecure);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
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
