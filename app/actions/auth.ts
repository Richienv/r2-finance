'use server';

import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createSession,
  clearSession,
  getOwnerUserId,
  resetOwnerCache,
} from '@/lib/auth';
import { claimLegacyData } from '@/lib/legacy-claim';

export type AuthResult = { ok: true } | { ok: false; error: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isOwner(email: string): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return !!owner && owner === email;
}

export async function signup(input: { email: string; password: string; name?: string }): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email' };
  if (input.password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: 'An account with this email already exists' };

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(input.password), name: input.name?.trim() || null },
    select: { id: true },
  });

  // First owner login claims all pre-existing (null-userId) data.
  if (isOwner(email)) {
    resetOwnerCache();
    await claimLegacyData(user.id);
  }

  await createSession(user.id);
  return { ok: true };
}

export async function login(input: { email: string; password: string }): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return { ok: false, error: 'Invalid email or password' };
  }

  // Safety net: if the owner logs in and legacy data was never claimed, claim it now.
  if (isOwner(email)) {
    resetOwnerCache();
    const owner = await getOwnerUserId();
    if (owner) await claimLegacyData(owner);
  }

  await createSession(user.id);
  return { ok: true };
}

export async function logout(): Promise<void> {
  clearSession();
}
