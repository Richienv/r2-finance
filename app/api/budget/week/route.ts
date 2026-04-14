import { NextResponse } from 'next/server';
import { getLast7Days } from '@/lib/rolling-budget';

export const dynamic = 'force-dynamic';

export async function GET() {
  const days = await getLast7Days();
  return NextResponse.json({ days });
}
