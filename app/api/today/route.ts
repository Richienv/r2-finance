import { ok, fail, preflight } from '@/lib/http';
import { getTodayData } from '@/lib/hermes';
import { getOwnerUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  try {
    const ownerId = await getOwnerUserId();
    if (!ownerId) return fail('no-owner', 'Owner account not set up yet', 503);
    return ok(await getTodayData(ownerId));
  } catch (e) {
    return fail('today-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
