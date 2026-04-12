import { NextRequest, NextResponse } from 'next/server';
import { getAlertManagers, addAlertManager, removeAlertManager } from '@/lib/store';

export async function GET() {
  return NextResponse.json(getAlertManagers());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, url, proxy, noProxy } = body;
  if (!name || !url) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }
  if (proxy) {
    try {
      new URL(proxy);
    } catch {
      return NextResponse.json({ error: 'Invalid proxy URL format' }, { status: 400 });
    }
  }
  const am = addAlertManager({ name, url, proxy: proxy || undefined, noProxy: !!noProxy });
  return NextResponse.json(am, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const deleted = removeAlertManager(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
