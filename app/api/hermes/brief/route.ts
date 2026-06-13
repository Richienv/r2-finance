import type { NextRequest } from 'next/server';
import { ok, fail, preflight } from '@/lib/http';
import { getBrief } from '@/lib/hermes';
import { logActivity, getActor } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const TYPES = ['today', 'week', 'month', 'warning-check'] as const;
type BriefType = (typeof TYPES)[number];

export function OPTIONS() {
  return preflight();
}

export async function POST(req: NextRequest) {
  let body: { type?: string };
  try {
    body = (await req.json()) as { type?: string };
  } catch {
    return fail('bad-json', 'Request body must be valid JSON', 400);
  }

  const type = body.type as BriefType;
  if (!TYPES.includes(type)) {
    return fail('bad-type', `type must be one of: ${TYPES.join(', ')}`, 400);
  }

  try {
    const text = await getBrief(type);
    await logActivity({ actor: getActor(req), action: 'brief.read', payload: { type } });
    return ok({ type, text });
  } catch (e) {
    return fail('brief-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
