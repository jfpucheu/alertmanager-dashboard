import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/store';
import { GlobalConfig } from '@/types/alertmanager';

export async function GET() {
  return NextResponse.json(await getConfig());
}

export async function PUT(req: NextRequest) {
  const body: GlobalConfig = await req.json();
  const { proxy, ldap, title, logoUrl, refreshInterval } = body;

  if (proxy) {
    try { new URL(proxy); } catch {
      return NextResponse.json({ error: 'Invalid proxy URL format' }, { status: 400 });
    }
  }

  if (ldap?.url) {
    try { new URL(ldap.url); } catch {
      return NextResponse.json({ error: 'Invalid LDAP URL format' }, { status: 400 });
    }
  }

  const config = await getConfig();
  config.proxy           = proxy || undefined;
  config.ldap            = ldap?.url ? ldap : undefined;
  config.title           = title || undefined;
  config.logoUrl         = logoUrl || undefined;
  config.refreshInterval = typeof refreshInterval === 'number' ? refreshInterval : undefined;
  await saveConfig(config);
  return NextResponse.json(config);
}
