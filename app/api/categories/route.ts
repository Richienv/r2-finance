import { ok, preflight } from '@/lib/http';
import { AGENT_CATEGORIES, CATEGORY_KEYWORDS } from '@/lib/hermes';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  return ok({
    categories: [...AGENT_CATEGORIES],
    keywords: CATEGORY_KEYWORDS,
    default: 'other',
    note: 'Pick the best category from keywords; fall back to "other".',
  });
}
