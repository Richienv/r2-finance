import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Public, read-only API GET endpoints (the agent + R2·OS surface). GETs always
// pass; this list only matters so their (rare) non-GET calls aren't key-gated.
const PUBLIC_API_PATHS = [
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

// Web routes reachable without a session.
const AUTH_PAGES = ['/login', '/signup'];

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('r2_session')?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── API: unchanged Hermes key-gate (mutations on non-public paths) ──
  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    if (isPublic || !isMutation) return NextResponse.next();

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

  // ── Web pages: require a valid session, else redirect to /login ──
  if (AUTH_PAGES.includes(pathname)) return NextResponse.next();
  if (await hasValidSession(req)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

// Run on everything except Next static assets + favicon.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
