import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public, read-only GET endpoints. NOTE: GET requests always pass below
// (non-mutating), so this list only matters for paths where we'd want
// *mutations* to be unauthenticated too. We deliberately keep mutation routes
// (/api/hermes/*, /api/expenses POST|PATCH|DELETE) OUT of this list so they
// stay key-protected, while their GETs remain public.
const PUBLIC_PATHS = [
  '/api/summary',
  '/api/hub',
  '/api/export',
  '/api/today',
  '/api/budget',
  '/api/week',
  '/api/month',
  '/api/categories',
  '/api/hermes/health',
  '/api/cron',
];

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);

  // Public paths and all read-only methods pass straight through.
  if (isPublic || !isMutation) return NextResponse.next();

  // Trim both sides: pasted Vercel env vars often carry an invisible trailing
  // newline, which makes an exact compare 401 even with the right key.
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const key = (req.headers.get('x-api-key') ?? bearer ?? '').trim();
  const expected = (process.env.R2_FINANCE_API_KEY ?? '').trim();

  if (!key || !expected || key !== expected) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized', message: 'Invalid or missing x-api-key' },
      { status: 401 },
    );
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
