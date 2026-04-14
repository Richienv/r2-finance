import { NextResponse } from 'next/server';
import { ensureDailyBudget } from '@/lib/rolling-budget';
import { cstDateString } from '@/lib/date';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const today = cstDateString();
    const daily = await ensureDailyBudget(today);

    const spent = Math.round(daily.spent);
    const remaining = Math.round(daily.budgetAmount - daily.spent);
    const isOver = remaining < 0;

    const summary = {
      metric: isOver ? `-${Math.abs(remaining)}` : `+${remaining}`,
      unit: 'RMB',
      label: `${spent} spent today`,
      alert: isOver,
      alertMessage: isOver ? 'over budget today' : '',
      urgency: isOver ? 'warning' : 'info',
    };

    return NextResponse.json(summary, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      {
        metric: '—',
        unit: '',
        label: 'unavailable',
        alert: false,
        alertMessage: '',
        urgency: 'info',
      },
      { headers: corsHeaders }
    );
  }
}
