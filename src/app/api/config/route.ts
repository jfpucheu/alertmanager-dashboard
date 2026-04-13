import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/store';

export async function GET() {
  return NextResponse.json(await getConfig());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { proxy } = body;

  if (proxy !== undefined && proxy !== '' && proxy !== null) {
    try { new URL(proxy); } catch {
      return NextResponse.json({ error: 'Invalid proxy URL format' }, { status: 400 });
    }
  }

  const config = await getConfig();
  config.proxy = proxy || undefined;
  await saveConfig(config);
  return NextResponse.json(config);
}
