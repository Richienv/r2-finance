'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { currentMonthKey } from '@/lib/date';

export async function upsertSettings(input: {
  allowanceIDR: number;
  allowanceRMB: number;
  idrPerRmb: number;
  paydayDay: number;
}) {
  const month = currentMonthKey();
  await prisma.monthlySettings.upsert({
    where: { month },
    create: { month, ...input },
    update: { ...input },
  });
  revalidatePath('/');
  revalidatePath('/month');
  revalidatePath('/settings');
}

export async function resetMonth() {
  const month = currentMonthKey();
  await prisma.expense.deleteMany({ where: { date: { startsWith: month } } });
  revalidatePath('/');
  revalidatePath('/week');
  revalidatePath('/month');
}

export async function addFixedCost(input: { name: string; amountRMB: number; billingDay?: number }) {
  await prisma.fixedCost.create({ data: { ...input, active: true } });
  revalidatePath('/settings');
}

export async function deleteFixedCost(id: string) {
  await prisma.fixedCost.update({ where: { id }, data: { active: false } });
  revalidatePath('/settings');
}
