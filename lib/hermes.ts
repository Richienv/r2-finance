import { prisma } from '@/lib/prisma';
import {
  CATEGORIES,
  type Category,
  IDR_PER_RMB,
  DAILY_FREE_BUDGET,
  WEEKLY_BUDGET,
  MONTHLY_FREE,
  MONTHLY_ALLOWANCE_RMB,
  FIXED_COSTS,
  PAYDAY_DAY,
} from '@/lib/constants';
import { cstDateString, currentMonthKey, daysUntilPayday } from '@/lib/date';
import { ensureDailyBudget } from '@/lib/rolling-budget';
import { getMonthExpenses, getWeekExpenses, sumRMB } from '@/lib/queries';
import { rmbToIdr } from '@/lib/money';

/** Lowercase agent-facing categories ↔ uppercase Expense enum. */
export const AGENT_CATEGORIES = ['food', 'snacks', 'personal', 'other'] as const;

/** Keyword hints so Ren can self-categorize. */
export const CATEGORY_KEYWORDS: Record<(typeof AGENT_CATEGORIES)[number], string[]> = {
  food: [
    'makan', 'lunch', 'dinner', 'breakfast', 'coffee', 'kopi', 'ngopi',
    'snack', 'eat', 'food', 'restoran', 'nasi', 'ayam',
  ],
  snacks: ['indomie', 'chips', 'choki', 'jajan', 'cemilan'],
  personal: ['shopee', 'baju', 'clothes', 'shoes', 'gadget', 'gym', 'supplement', 'skincare'],
  other: [],
};

/** Map any case/alias of a category to the canonical uppercase enum, or null. */
export function normalizeCategory(input: string | undefined | null): Category | null {
  if (!input) return null;
  const up = input.trim().toUpperCase();
  return (CATEGORIES as readonly string[]).includes(up) ? (up as Category) : null;
}

/** Classify a free-text note into a category by keyword match. */
export function classifyCategory(text: string): Category {
  const t = text.toLowerCase();
  for (const cat of ['food', 'snacks', 'personal'] as const) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => t.includes(kw))) {
      return cat.toUpperCase() as Category;
    }
  }
  return 'OTHER';
}

export type ParsedExpense = {
  amount: number; // in the detected currency
  currency: 'RMB' | 'IDR';
  category: Category;
  note: string;
};

/**
 * Best-effort natural-language parse (fallback path). Prefer structured input.
 * Extracts an amount, detects currency (default RMB; idr/rp → IDR), and
 * keyword-classifies the rest as the category. Remaining text becomes the note.
 */
export function parseNL(text: string): ParsedExpense | null {
  const lower = text.toLowerCase();
  const isIDR = /\b(idr|rp|rupiah)\b/.test(lower);
  // first number, allowing thousands separators and a 'k' suffix (e.g. 25k)
  const m = lower.match(/(\d[\d.,]*)\s*(k)?/);
  if (!m) return null;
  let amount = parseFloat(m[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  if (m[2] === 'k') amount *= 1000;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const category = classifyCategory(lower);
  const note = text.replace(m[0], '').replace(/\b(idr|rp|rupiah|rmb|yuan|cny)\b/gi, '').trim()
    || category.toLowerCase();
  return { amount, currency: isIDR ? 'IDR' : 'RMB', category, note };
}

/** Live IDR↔RMB rate: prefer this month's MonthlySettings, else the constant. */
export async function getRate(userId: string): Promise<number> {
  const settings = await prisma.monthlySettings.findUnique({
    where: { userId_month: { userId, month: currentMonthKey() } },
  });
  return settings?.idrPerRmb ?? IDR_PER_RMB;
}

/** Resolve a structured/NL request into the exact fields the Expense row needs. */
export async function resolveExpense(args: {
  userId: string;
  amount: number;
  currency?: 'RMB' | 'IDR';
  category: Category;
}): Promise<{ amountRMB: number; amountIDR: number; rate: number }> {
  const rate = await getRate(args.userId);
  if (args.currency === 'IDR') {
    const amountRMB = Math.round((args.amount / rate) * 100) / 100;
    return { amountRMB, amountIDR: Math.round(args.amount), rate };
  }
  return { amountRMB: args.amount, amountIDR: rmbToIdr(args.amount, rate), rate };
}

export type LogExpenseBody = {
  amount?: number;
  category?: string;
  note?: string;
  currency?: 'RMB' | 'IDR';
  date?: string;
  text?: string; // NL fallback
};

export type LoggedExpense = {
  expense: {
    id: string;
    date: string;
    amountRMB: number;
    amountIDR: number;
    category: Category;
    note: string | null;
    createdAt: Date;
  };
  dailyRemaining: number;
  warning: string | null;
};

/**
 * Create an Expense from either structured fields (preferred) or an NL `text`
 * fallback, then return the saved row plus the day's remaining budget and an
 * over-budget warning. Throws { code, message } on validation failure.
 */
export async function logExpenseFromInput(userId: string, body: LogExpenseBody): Promise<LoggedExpense> {
  let amount: number;
  let currency: 'RMB' | 'IDR';
  let category: Category;
  let note: string | null;

  if (typeof body.amount === 'number') {
    // structured path
    amount = body.amount;
    currency = body.currency === 'IDR' ? 'IDR' : 'RMB';
    const cat = normalizeCategory(body.category) ?? (body.note ? classifyCategory(body.note) : 'OTHER');
    category = cat;
    note = body.note?.trim() || null;
  } else if (typeof body.text === 'string' && body.text.trim()) {
    // NL fallback
    const parsed = parseNL(body.text);
    if (!parsed) {
      throw { code: 'parse-failed', message: 'Could not extract an amount from text' };
    }
    amount = parsed.amount;
    currency = parsed.currency;
    category = parsed.category;
    note = parsed.note || null;
  } else {
    throw { code: 'bad-input', message: 'Provide { amount, category } or { text }' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw { code: 'invalid-amount', message: 'amount must be > 0' };
  }

  const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : cstDateString();
  const { amountRMB, amountIDR } = await resolveExpense({ userId, amount, currency, category });

  const expense = await prisma.expense.create({
    data: { userId, date, amountRMB, amountIDR, category, note },
  });

  const daily = await ensureDailyBudget(userId, date);
  const dailyRemaining = round(daily.budgetAmount - daily.spent);
  const warning =
    dailyRemaining < 0 ? `over daily budget by ${Math.abs(dailyRemaining)} RMB` : null;

  return { expense: expense as LoggedExpense['expense'], dailyRemaining, warning };
}

const CAT_KEY: Record<string, 'food' | 'personal' | 'snacks' | 'other'> = {
  FOOD: 'food',
  PERSONAL: 'personal',
  SNACKS: 'snacks',
  OTHER: 'other',
};

/** Bucket rows into the agent's lowercase byCategory shape (FIXED excluded). */
export function byCategory(rows: { amountRMB: number; category: string }[]) {
  const out = { food: 0, personal: 0, snacks: 0, other: 0 };
  for (const r of rows) {
    if (r.category === 'FIXED') continue;
    const key = CAT_KEY[r.category] ?? 'other';
    out[key] = Math.round((out[key] + r.amountRMB) * 100) / 100;
  }
  return out;
}

const round = (n: number) => Math.round(n * 100) / 100;

// ── TODAY ────────────────────────────────────────────────────────────────────
export async function getTodayData(userId: string) {
  const today = cstDateString();
  const [daily, monthRows, week] = await Promise.all([
    ensureDailyBudget(userId, today),
    getMonthExpenses(userId),
    getWeekExpenses(userId),
  ]);

  const monthSpent = sumRMB(monthRows, { excludeFixed: true });
  const weekSpent = sumRMB(week.rows, { excludeFixed: true });
  const remainingToday = round(daily.budgetAmount - daily.spent);
  const weeklyRemaining = round(WEEKLY_BUDGET - weekSpent);
  const monthlyRemaining = round(MONTHLY_FREE - monthSpent);

  const cats = byCategory(week.rows);
  const topEntry = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  const topCategoryThisWeek = topEntry && topEntry[1] > 0 ? topEntry[0] : null;

  const onTrack = remainingToday >= 0 && weeklyRemaining >= 0;
  const summary = remainingToday >= 0
    ? `${remainingToday} RMB left today · ${weeklyRemaining} sisa minggu ini · ${onTrack ? 'aman' : 'hati-hati'}`
    : `Over budget ${Math.abs(remainingToday)} RMB hari ini · ${weeklyRemaining} sisa minggu ini`;

  return {
    date: today,
    dailyBudget: round(daily.budgetAmount),
    spentToday: round(daily.spent),
    remainingToday,
    weeklyRemaining,
    monthlyRemaining,
    carryForwardBalance: round(daily.carryover),
    topCategoryThisWeek,
    summary,
  };
}

// ── BUDGET ───────────────────────────────────────────────────────────────────
export async function getBudgetData(userId: string) {
  const rate = await getRate(userId);
  return {
    dailyFree: DAILY_FREE_BUDGET,
    monthlyVariable: MONTHLY_FREE,
    monthlyTotal: MONTHLY_ALLOWANCE_RMB,
    fixedCosts: FIXED_COSTS.total,
    rates: { IDR_per_RMB: rate },
    categories: [...AGENT_CATEGORIES],
  };
}

// ── WEEK ─────────────────────────────────────────────────────────────────────
export async function getWeekData(userId: string, startDate?: string) {
  const anchor = startDate ? new Date(`${startDate}T00:00:00+08:00`) : new Date();
  const safeAnchor = isNaN(anchor.getTime()) ? new Date() : anchor;
  const { start, days, rows } = await getWeekExpenses(userId, safeAnchor);
  const today = cstDateString();

  const free = rows.filter((r) => r.category !== 'FIXED');
  const totalSpent = round(sumRMB(rows, { excludeFixed: true }));
  const daysElapsed = Math.max(1, days.filter((d) => d <= today).length || 7);
  const avgDaily = round(totalSpent / daysElapsed);

  // per-day overspend vs the base daily budget
  const perDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const r of free) perDay[r.date] = (perDay[r.date] ?? 0) + r.amountRMB;
  const daysOverBudget = Object.values(perDay).filter((v) => v > DAILY_FREE_BUDGET).length;

  let biggest: { amount: number; note: string; date: string } | null = null;
  for (const r of free) {
    if (!biggest || r.amountRMB > biggest.amount) {
      biggest = { amount: round(r.amountRMB), note: r.note?.trim() || r.category, date: r.date };
    }
  }

  return {
    weekStart: start,
    totalSpent,
    byCategory: byCategory(rows),
    avgDaily,
    daysOverBudget,
    biggestExpense: biggest,
  };
}

// ── MONTH ────────────────────────────────────────────────────────────────────
export async function getMonthData(userId: string, month?: string) {
  const key = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonthKey();
  const rows = await getMonthExpenses(userId, key);
  const free = rows.filter((r) => r.category !== 'FIXED');
  const totalSpent = round(sumRMB(rows, { excludeFixed: true }));

  const trendMap: Record<string, number> = {};
  for (const r of free) trendMap[r.date] = (trendMap[r.date] ?? 0) + r.amountRMB;
  const dailyTrend = Object.entries(trendMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, spent]) => ({ date, spent: round(spent) }));

  return {
    month: key,
    totalSpent,
    remaining: round(MONTHLY_FREE - totalSpent),
    byCategory: byCategory(rows),
    dailyTrend,
    daysUntilPayday: daysUntilPayday(new Date(), PAYDAY_DAY),
  };
}

// ── BRIEF (Indonesian, gen-Z) ────────────────────────────────────────────────
const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export async function getBrief(userId: string, type: 'today' | 'week' | 'month' | 'warning-check'): Promise<string> {
  if (type === 'today') {
    const t = await getTodayData(userId);
    const cat = t.topCategoryThisWeek ? ` — mostly ${t.topCategoryThisWeek}` : '';
    if (t.remainingToday < 0) {
      return `Udah over budget ${Math.abs(t.remainingToday)} RMB hari ini. Spent ${t.spentToday} sejauh ini${cat}. Rem dulu ya.`;
    }
    return `${t.remainingToday} RMB left today. Spent ${t.spentToday} sejauh ini${cat}. On track, aman.`;
  }

  if (type === 'week') {
    const w = await getWeekData(userId);
    const topEntry = Object.entries(w.byCategory).sort((a, b) => b[1] - a[1])[0];
    const top = topEntry && topEntry[1] > 0 ? topEntry[0] : null;
    const over = w.daysOverBudget;
    return `Minggu ini ${w.totalSpent} RMB · ${round(WEEKLY_BUDGET - w.totalSpent)} sisa · ${over} hari over budget.${top ? ` ${top.charAt(0).toUpperCase() + top.slice(1)} dominan.` : ''}`;
  }

  if (type === 'month') {
    const m = await getMonthData(userId);
    const [y, mo] = m.month.split('-').map(Number);
    return `${ID_MONTHS[mo - 1]} ${y}: ${m.remaining} sisa dari ${MONTHLY_FREE} variable budget. ${m.daysUntilPayday} hari lagi sampai payday.`;
  }

  // warning-check
  const t = await getTodayData(userId);
  if (t.remainingToday < 0) {
    return `Heads up: udah over daily budget ${Math.abs(t.remainingToday)} RMB. Tahan dulu jajannya.`;
  }
  if (t.weeklyRemaining < 0) {
    return `Heads up: minggu ini udah over ${Math.abs(t.weeklyRemaining)} RMB.`;
  }
  return 'On budget, aman.';
}
