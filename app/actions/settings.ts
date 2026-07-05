'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { currentMonthKey } from '@/lib/date';

export async function upsertSettings(input: {
  allowanceIDR: number;
  allowanceRMB: number;
  idrPerRmb: number;
  paydayDay: number;
}) {
  const userId = await requireUserId();
  const month = currentMonthKey();
  await prisma.monthlySettings.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, ...input },
    update: { ...input },
  });
  revalidatePath('/');
  revalidatePath('/month');
  revalidatePath('/settings');
}

export async function resetMonth() {
  const userId = await requireUserId();
  const month = currentMonthKey();
  await prisma.expense.deleteMany({ where: { userId, date: { startsWith: month } } });
  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}

export async function addFixedCost(input: { name: string; amountRMB: number; billingDay?: number }) {
  const userId = await requireUserId();
  await prisma.fixedCost.create({ data: { userId, ...input, active: true } });
  revalidatePath('/settings');
}

export async function deleteFixedCost(id: string) {
  const userId = await requireUserId();
  const { count } = await prisma.fixedCost.updateMany({ where: { id, userId }, data: { active: false } });
  if (count === 0) throw new Error('not found');
  revalidatePath('/settings');
}
