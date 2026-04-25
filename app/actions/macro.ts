'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { IDR_PER_RMB } from '@/lib/constants';
import {
  MACRO_TYPES,
  isValidMacroCategory,
  type MacroType,
} from '@/lib/macro';

type AddMacroInput = {
  type: MacroType;
  amountRMB: number;
  category: string;
  note?: string;
  date?: string;
};

export async function addMacro(input: AddMacroInput) {
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!MACRO_TYPES.includes(input.type)) {
    throw new Error('invalid type');
  }
  if (!isValidMacroCategory(input.type, input.category)) {
    throw new Error('invalid category');
  }
  const date = input.date ?? cstDateString();
  const settings = await prisma.monthlySettings.findUnique({
    where: { month: currentMonthKey() },
  });
  const rate = settings?.idrPerRmb ?? IDR_PER_RMB;

  await prisma.macro.create({
    data: {
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
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!MACRO_TYPES.includes(input.type)) {
    throw new Error('invalid type');
  }
  if (!isValidMacroCategory(input.type, input.category)) {
    throw new Error('invalid category');
  }
  const settings = await prisma.monthlySettings.findUnique({
    where: { month: currentMonthKey() },
  });
  const rate = settings?.idrPerRmb ?? IDR_PER_RMB;

  await prisma.macro.update({
    where: { id: input.id },
    data: {
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

export async function deleteMacro(id: string) {
  await prisma.macro.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/macro');
}

export async function getMacros() {
  return prisma.macro.findMany({
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getMacroBalance() {
  const rows = await prisma.macro.findMany({
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
