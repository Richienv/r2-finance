'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { IDR_PER_RMB, type Category, CATEGORIES } from '@/lib/constants';

type AddExpenseInput = {
  amountRMB: number;
  category: Category;
  note?: string;
  date?: string; // YYYY-MM-DD, default today CST
};

export async function addExpense(input: AddExpenseInput) {
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  if (!CATEGORIES.includes(input.category)) {
    throw new Error('invalid category');
  }
  const date = input.date ?? cstDateString();

  const settings = await prisma.monthlySettings.findUnique({
    where: { month: currentMonthKey() },
  });
  const rate = settings?.idrPerRmb ?? IDR_PER_RMB;

  await prisma.expense.create({
    data: {
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
  await prisma.expense.delete({ where: { id } });
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
  if (!Number.isFinite(input.amountRMB) || input.amountRMB <= 0) {
    throw new Error('amountRMB must be > 0');
  }
  const settings = await prisma.monthlySettings.findUnique({
    where: { month: currentMonthKey() },
  });
  const rate = settings?.idrPerRmb ?? IDR_PER_RMB;
  await prisma.expense.update({
    where: { id: input.id },
    data: {
      amountRMB: input.amountRMB,
      amountIDR: rmbToIdr(input.amountRMB, rate),
      note: input.note?.trim() || null,
    },
  });
  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}
