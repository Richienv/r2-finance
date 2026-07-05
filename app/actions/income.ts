'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { IDR_PER_RMB } from '@/lib/constants';
import { INCOME_SOURCES, type IncomeSource } from '@/lib/income';

type AddIncomeInput = {
  amountRMB: number;
  source: IncomeSource;
  note?: string;
  date?: string;
};

export async function addIncome(input: AddIncomeInput) {
  const userId = await requireUserId();
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!INCOME_SOURCES.includes(input.source)) {
    throw new Error('invalid source');
  }
  const date = input.date ?? cstDateString();
  const settings = await prisma.monthlySettings.findUnique({
    where: { userId_month: { userId, month: currentMonthKey() } },
  });
  const rate = settings?.idrPerRmb ?? IDR_PER_RMB;

  await prisma.income.create({
    data: {
      userId,
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
  const userId = await requireUserId();
  const { count } = await prisma.income.deleteMany({ where: { id, userId } });
  if (count === 0) throw new Error('not found');
  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}

export async function getMonthIncome(userId: string, monthKey = currentMonthKey()) {
  return prisma.income.findMany({
    where: { userId, date: { startsWith: monthKey } },
    orderBy: { date: 'desc' },
  });
}
