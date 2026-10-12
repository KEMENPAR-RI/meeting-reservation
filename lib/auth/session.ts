import { io } from 'next/cache';
import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';

import { SESSION_TTL_MS, signSessionToken, verifySessionToken } from './token';

// Server-only by convention: never import from a client component.

export const ADMIN_COOKIE = 'br_admin';

const SECRET_MIN_LENGTH = 32;

// null = not configured; every caller must fail closed.
export function getAuthConfig(): { password: string; secret: string } | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret || secret.length < SECRET_MIN_LENGTH) {
    console.error('[auth] admin auth not configured');
    return null;
  }
  return { password, secret };
}

export async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    // cookies() resolves in the App Shell stage (partialPrefetching), the clock does not; io() defers it.
    await io();
    const now = Date.now();

    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!token) return false;

    const config = getAuthConfig();
    if (!config) return false;

    return verifySessionToken(token, config.secret, now);
  } catch (error) {
    // Let Next.js internal control-flow errors through.
    unstable_rethrow(error);
    console.error('[auth] isAdmin failed', error);
    return false;
  }
}

// Server Actions only.
export async function createSession(): Promise<void> {
  const config = getAuthConfig();
  if (!config) throw new Error('[auth] admin auth not configured');

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, signSessionToken(Date.now() + SESSION_TTL_MS, config.secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

// Server Actions only.
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
