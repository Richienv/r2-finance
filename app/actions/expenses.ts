'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { IDR_PER_RMB, type Category, CATEGORIES } from '@/lib/constants';

async function rateFor(userId: string): Promise<number> {
  const settings = await prisma.monthlySettings.findUnique({
    where: { userId_month: { userId, month: currentMonthKey() } },
  });
  return settings?.idrPerRmb ?? IDR_PER_RMB;
}

type AddExpenseInput = {
  amountRMB: number;
  category: Category;
  note?: string;
  date?: string; // YYYY-MM-DD, default today CST
};

export async function addExpense(input: AddExpenseInput) {
  const userId = await requireUserId();
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!CATEGORIES.includes(input.category)) {
    throw new Error('invalid category');
  }
  const date = input.date ?? cstDateString();
  const rate = await rateFor(userId);

  await prisma.expense.create({
    data: {
      userId,
      date,
      amountRMB: input.amountRMB,
      amountIDR: rmbToIdr(input.amountRMB, rate),
      category: input.category,
      note: input.note?.trim() || null,
    },
  });

  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}

export async function deleteExpense(id: string) {
  const userId = await requireUserId();
  const { count } = await prisma.expense.deleteMany({ where: { id, userId } });
  if (count === 0) throw new Error('not found');
  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}

type UpdateExpenseInput = {
  id: string;
  amountRMB: number;
  note?: string;
};

export async function updateExpense(input: UpdateExpenseInput) {
  const userId = await requireUserId();
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  const rate = await rateFor(userId);
  const { count } = await prisma.expense.updateMany({
    where: { id: input.id, userId },
    data: {
      amountRMB: input.amountRMB,
      amountIDR: rmbToIdr(input.amountRMB, rate),
      note: input.note?.trim() || null,
    },
  });
  if (count === 0) throw new Error('not found');
  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}
