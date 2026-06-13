import { NextResponse } from 'next/server';

/**
 * Permissive CORS + no-store headers for the Hermes/Ren integration.
 * Hermes calls these endpoints cross-origin, so every new endpoint advertises
 * open CORS and disables caching (budget numbers must always be fresh).
 */
export const hermesHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, x-actor, Authorization',
  'Cache-Control': 'no-store, max-age=0',
};

/** Shared OPTIONS preflight handler. */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: hermesHeaders });
}

/** Success envelope: { ok: true, data }. */
export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status, headers: hermesHeaders });
}

/** Error envelope: { ok: false, error: kebab-code, message }. */
export function fail(error: string, message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error, message }, { status, headers: hermesHeaders });
}
