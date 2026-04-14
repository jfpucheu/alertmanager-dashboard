import { NextRequest, NextResponse } from 'next/server';
import { getAlertManagers, addAlertManager, updateAlertManager, removeAlertManager, validateAlertManagerInput } from '@/lib/store';

export async function GET() {
  return NextResponse.json(await getAlertManagers());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, url, proxy, noProxy, insecure } = body;
  const err = validateAlertManagerInput({ name, url, proxy, noProxy, insecure });
  if (err) return NextResponse.json({ error: err.message }, { status: 400 });

  const am = await addAlertManager({ name, url, proxy: proxy || undefined, noProxy: !!noProxy, insecure: !!insecure });
  return NextResponse.json(am, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const body = await req.json();
  const { name, url, proxy, noProxy, insecure } = body;
  const err = validateAlertManagerInput({ name, url, proxy, noProxy, insecure });
  if (err) return NextResponse.json({ error: err.message }, { status: 400 });

  const am = await updateAlertManager(id, { name, url, proxy: proxy || undefined, noProxy: !!noProxy, insecure: !!insecure });
  if (!am) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(am);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const deleted = await removeAlertManager(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
