import { NextResponse } from 'next/server';
import { getMonthExpenses, sumRMB } from '@/lib/queries';
import { VARIABLE_BUDGET } from '@/lib/constants';
import { remainingFree } from '@/lib/budget';

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
    const monthRows = await getMonthExpenses();
    const spentFree = sumRMB(monthRows, { excludeFixed: true });
    const remaining = Math.max(0, remainingFree(VARIABLE_BUDGET.freeSpending, spentFree));

    const summary = {
      metric: Math.round(remaining).toString(),
      unit: 'RMB',
      label: 'free budget left',
      alert: remaining < 100,
      alertMessage: remaining < 100 ? 'Budget running low' : '',
      urgency: remaining < 100 ? 'warning' : 'info',
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
