import { NextRequest, NextResponse } from 'next/server';
import { getAssignments, setAssignment, removeAssignment } from '@/lib/store';

export async function GET() {
  return NextResponse.json(getAssignments());
}

export async function POST(req: NextRequest) {
  const { amId, fingerprint, name } = await req.json();
  if (!amId || !fingerprint || !name?.trim()) {
    return NextResponse.json({ error: 'amId, fingerprint and name are required' }, { status: 400 });
  }
  const assignment = setAssignment(amId, fingerprint, name.trim());
  return NextResponse.json(assignment);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amId = searchParams.get('amId');
  const fingerprint = searchParams.get('fingerprint');
  if (!amId || !fingerprint) {
    return NextResponse.json({ error: 'amId and fingerprint are required' }, { status: 400 });
  }
  removeAssignment(amId, fingerprint);
  return NextResponse.json({ success: true });
}
