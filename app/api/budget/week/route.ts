import { NextResponse } from 'next/server';
import { getLast7Days } from '@/lib/rolling-budget';
import { getOwnerUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ownerId = await getOwnerUserId();
  if (!ownerId) return NextResponse.json({ ok: false, error: 'no-owner' }, { status: 503 });
  const days = await getLast7Days(ownerId);
  return NextResponse.json({ days });
}
