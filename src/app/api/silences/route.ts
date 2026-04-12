import { NextRequest, NextResponse } from 'next/server';
import { getAlertManagers } from '@/lib/store';
import { createSilence } from '@/lib/alertmanager';
import { SilencePayload } from '@/types/alertmanager';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { alertManagerId, silence } = body as {
    alertManagerId: string;
    silence: SilencePayload;
  };

  if (!alertManagerId || !silence) {
    return NextResponse.json({ error: 'alertManagerId and silence are required' }, { status: 400 });
  }

  const alertManagers = getAlertManagers();
  const am = alertManagers.find((a) => a.id === alertManagerId);
  if (!am) {
    return NextResponse.json({ error: 'AlertManager not found' }, { status: 404 });
  }

  try {
    const result = await createSilence(am.url, silence);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create silence' },
      { status: 500 }
    );
  }
}
