import { NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET() {
  try {
    const DAILY_FREE_BUDGET = 37
    const today = new Date()
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate()
    const daysLeft = daysInMonth - today.getDate()
    const remaining = daysLeft * DAILY_FREE_BUDGET

    const summary = {
      metric: remaining.toString(),
      unit: 'RMB',
      label: 'free budget left',
      alert: remaining < 100,
      alertMessage: remaining < 100 ? 'Budget running low' : '',
      urgency: remaining < 100 ? 'warning' : 'info',
    }

    return NextResponse.json(summary, { headers: corsHeaders })
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
    )
  }
}
