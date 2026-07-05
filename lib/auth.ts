import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'r2_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Sign a session JWT and set it as an httpOnly cookie. Call from a Server Action / Route Handler. */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Resolve the current user's id from the session cookie, or null if unauthenticated. */
export async function getCurrentUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) redirect('/login');
  return id;
}

let ownerIdCache: string | null | undefined;
/**
 * The owner user (email === OWNER_EMAIL). Used by the agent + R2·OS public API
 * endpoints, which always operate on the owner's data. Returns null if no owner
 * account exists yet. Cached per server instance.
 */
export async function getOwnerUserId(): Promise<string | null> {
  if (ownerIdCache !== undefined) return ownerIdCache;
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email) return (ownerIdCache = null);
  const owner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  ownerIdCache = owner?.id ?? null;
  return ownerIdCache;
}

/** Invalidate the owner cache (call right after the owner account is created). */
export function resetOwnerCache(): void {
  ownerIdCache = undefined;
}
