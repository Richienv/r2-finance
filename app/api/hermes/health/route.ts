import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, preflight } from '@/lib/http';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

function preview(key: string): string {
  if (key.length < 8) return key ? '…'.padStart(key.length, '•') : '';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  const raw = process.env.R2_FINANCE_API_KEY ?? '';
  const expected = raw.trim();
  const keyConfigured = expected.length > 0;

  // Candidate from the caller, if any — lets you confirm a paste matches.
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const candidateRaw = req.headers.get('x-api-key') ?? bearer ?? null;
  const candidate = candidateRaw?.trim() ?? null;
  const keyMatch = candidate !== null ? candidate === expected : null;

  let db = { connected: false, error: null as string | null };
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = { connected: true, error: null };
  } catch (e) {
    db = { connected: false, error: e instanceof Error ? e.message : 'unknown' };
  }

  return ok({
    keyConfigured,
    keyLength: expected.length,
    keyHadWhitespace: raw !== expected,
    keyPreview: keyConfigured ? preview(expected) : '',
    keyMatch,
    db,
    deployedAt: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
