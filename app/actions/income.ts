'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { IDR_PER_RMB } from '@/lib/constants';

export const INCOME_SOURCES = ['SALARY', 'BONUS', 'SIDE', 'OTHER'] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];

type AddIncomeInput = {
  amountRMB: number;
  source: IncomeSource;
  note?: string;
  date?: string;
};

export async function addIncome(input: AddIncomeInput) {
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!INCOME_SOURCES.includes(input.source)) {
    throw new Error('invalid source');
  }
  const date = input.date ?? cstDateString();
  const settings = await prisma.monthlySettings.findUnique({
    where: { month: currentMonthKey() },
  });
  const rate = settings?.idrPerRmb ?? IDR_PER_RMB;

  await prisma.income.create({
    data: {
      date,
      amountRMB: input.amountRMB,
      amountIDR: rmbToIdr(input.amountRMB, rate),
      source: input.source,
      note: input.note?.trim() || null,
    },
  });

  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}

export async function deleteIncome(id: string) {
  await prisma.income.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}

export async function getMonthIncome(monthKey = currentMonthKey()) {
  return prisma.income.findMany({
    where: { date: { startsWith: monthKey } },
    orderBy: { date: 'desc' },
  });
}
