import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// One-time schema migration applied over the (pooled) runtime connection,
// because `prisma db push` can't run against Neon's pgbouncer endpoint in CI.
// Idempotent: safe to run more than once. Gated by R2_FINANCE_API_KEY
// (middleware also requires the key for POSTs on this non-public path).
const STATEMENTS: string[] = [
  `DROP INDEX IF EXISTS "Expense_date_idx"`,
  `DROP INDEX IF EXISTS "Expense_category_idx"`,
  `DROP INDEX IF EXISTS "MonthlySettings_month_key"`,
  `DROP INDEX IF EXISTS "Income_date_idx"`,
  `DROP INDEX IF EXISTS "Income_source_idx"`,
  `DROP INDEX IF EXISTS "DailyBudget_date_key"`,
  `DROP INDEX IF EXISTS "Macro_date_idx"`,
  `DROP INDEX IF EXISTS "Macro_type_idx"`,
  `DROP INDEX IF EXISTS "ActivityLog_actor_createdAt_idx"`,
  `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  `ALTER TABLE "MonthlySettings" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  `ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  `ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  `ALTER TABLE "DailyBudget" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  `ALTER TABLE "Macro" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  `ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  `CREATE TABLE IF NOT EXISTS "User" (
     "id" TEXT NOT NULL,
     "email" TEXT NOT NULL,
     "passwordHash" TEXT NOT NULL,
     "name" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "User_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE INDEX IF NOT EXISTS "Expense_userId_date_idx" ON "Expense"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Expense_userId_category_idx" ON "Expense"("userId", "category")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MonthlySettings_userId_month_key" ON "MonthlySettings"("userId", "month")`,
  `CREATE INDEX IF NOT EXISTS "FixedCost_userId_idx" ON "FixedCost"("userId")`,
  `CREATE INDEX IF NOT EXISTS "Income_userId_date_idx" ON "Income"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Income_userId_source_idx" ON "Income"("userId", "source")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DailyBudget_userId_date_key" ON "DailyBudget"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Macro_userId_date_idx" ON "Macro"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Macro_userId_type_idx" ON "Macro"("userId", "type")`,
  `CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt")`,
  // Foreign keys — Postgres has no "IF NOT EXISTS"; wrap so re-runs are no-ops.
  `DO $fk$ BEGIN ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $fk$`,
  `DO $fk$ BEGIN ALTER TABLE "MonthlySettings" ADD CONSTRAINT "MonthlySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $fk$`,
  `DO $fk$ BEGIN ALTER TABLE "FixedCost" ADD CONSTRAINT "FixedCost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $fk$`,
  `DO $fk$ BEGIN ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $fk$`,
  `DO $fk$ BEGIN ALTER TABLE "DailyBudget" ADD CONSTRAINT "DailyBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $fk$`,
  `DO $fk$ BEGIN ALTER TABLE "Macro" ADD CONSTRAINT "Macro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $fk$`,
  `DO $fk$ BEGIN ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $fk$`,
];

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const key = (req.headers.get('x-api-key') ?? bearer ?? '').trim();
  const expected = (process.env.R2_FINANCE_API_KEY ?? '').trim();
  return !!key && !!expected && key === expected;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const results: { i: number; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < STATEMENTS.length; i++) {
    try {
      await prisma.$executeRawUnsafe(STATEMENTS[i]);
      results.push({ i, ok: true });
    } catch (e) {
      results.push({ i, ok: false, error: e instanceof Error ? e.message.split('\n').slice(-1)[0] : 'error' });
    }
  }

  // Verify the User table is now queryable.
  let userTable = false;
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "User" LIMIT 1');
    userTable = true;
  } catch { /* still missing */ }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({ ok: failed.length === 0, userTable, applied: results.length, failed });
}
