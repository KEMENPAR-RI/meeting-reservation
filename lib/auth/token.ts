import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Pure helpers (Node crypto only) so they can be unit-tested without Next.

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const TOKEN_VERSION = 'v1';
const EXP_PATTERN = /^\d{1,15}$/;
const PASSWORD_INPUT_MAX = 200;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

// Format: v1.<expMs>.<sig>; the expiry is part of the signed message.
export function signSessionToken(expMs: number, secret: string): string {
  const payload = `${TOKEN_VERSION}.${Math.trunc(expMs)}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string, secret: string, nowMs: number): boolean {
  try {
    if (typeof token !== 'string' || typeof secret !== 'string' || !secret) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [version, expRaw, sig] = parts;
    if (version !== TOKEN_VERSION || !EXP_PATTERN.test(expRaw)) return false;

    const expected = Buffer.from(sign(`${version}.${expRaw}`, secret));
    const actual = Buffer.from(sig);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

    // Reject expired tokens and any expiry beyond one TTL from now.
    const expMs = Number(expRaw);
    return nowMs < expMs && expMs <= nowMs + SESSION_TTL_MS;
  } catch {
    return false;
  }
}

// Hash both sides so the comparison is always 32 bytes.
export function passwordMatches(input: unknown, expected: string): boolean {
  try {
    if (typeof input !== 'string' || input.length > PASSWORD_INPUT_MAX) return false;
    if (typeof expected !== 'string' || !expected) return false;
    return timingSafeEqual(sha256(input), sha256(expected));
  } catch {
    return false;
  }
}
