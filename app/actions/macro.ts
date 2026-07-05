'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { currentMonthKey } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { IDR_PER_RMB } from '@/lib/constants';
import {
  MACRO_TYPES,
  isValidMacroCategory,
  type MacroType,
} from '@/lib/macro';

async function rateFor(userId: string): Promise<number> {
  const settings = await prisma.monthlySettings.findUnique({
    where: { userId_month: { userId, month: currentMonthKey() } },
  });
  return settings?.idrPerRmb ?? IDR_PER_RMB;
}

type AddMacroInput = {
  type: MacroType;
  amountRMB: number;
  category: string;
  note?: string;
  date?: string;
};

export async function addMacro(input: AddMacroInput) {
  const userId = await requireUserId();
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!MACRO_TYPES.includes(input.type)) {
    throw new Error('invalid type');
  }
  if (!isValidMacroCategory(input.type, input.category)) {
    throw new Error('invalid category');
  }
  const date = input.date ?? currentMonthKey() + '-01';
  const rate = await rateFor(userId);

  await prisma.macro.create({
    data: {
      userId,
      date,
      amountRMB: input.amountRMB,
      amountIDR: rmbToIdr(input.amountRMB, rate),
      type: input.type,
      category: input.category,
      note: input.note?.trim() || null,
    },
  });

  revalidatePath('/');
  revalidatePath('/macro');
}

type UpdateMacroInput = {
  id: string;
  type: MacroType;
  amountRMB: number;
  category: string;
  note?: string;
};

export async function updateMacro(input: UpdateMacroInput) {
  const userId = await requireUserId();
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!MACRO_TYPES.includes(input.type)) {
    throw new Error('invalid type');
  }
  if (!isValidMacroCategory(input.type, input.category)) {
    throw new Error('invalid category');
  }
  const rate = await rateFor(userId);

  const { count } = await prisma.macro.updateMany({
    where: { id: input.id, userId },
    data: {
      amountRMB: input.amountRMB,
      amountIDR: rmbToIdr(input.amountRMB, rate),
      type: input.type,
      category: input.category,
      note: input.note?.trim() || null,
    },
  });
  if (count === 0) throw new Error('not found');

  revalidatePath('/');
  revalidatePath('/macro');
}

export async function deleteMacro(id: string) {
  const userId = await requireUserId();
  const { count } = await prisma.macro.deleteMany({ where: { id, userId } });
  if (count === 0) throw new Error('not found');
  revalidatePath('/');
  revalidatePath('/macro');
}

export async function getMacros(userId: string) {
  return prisma.macro.findMany({
    where: { userId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getMacroBalance(userId: string) {
  const rows = await prisma.macro.findMany({
    where: { userId },
    select: { amountRMB: true, type: true },
  });
  let incomeRMB = 0;
  let expenseRMB = 0;
  for (const r of rows) {
    if (r.type === 'INCOME') incomeRMB += r.amountRMB;
    else if (r.type === 'EXPENSE') expenseRMB += r.amountRMB;
  }
  return {
    balanceRMB: incomeRMB - expenseRMB,
    incomeRMB,
    expenseRMB,
  };
}
