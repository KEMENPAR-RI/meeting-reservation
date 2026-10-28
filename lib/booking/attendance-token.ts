import { randomBytes } from 'node:crypto';

import { prisma } from '@/lib/prisma';

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

// 128-bit random, lowercase hex (column is CHAR(32) ascii_bin).
export function generateAttendanceToken(): string {
  return randomBytes(16).toString('hex');
}

export function isAttendanceToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

// Lazily assigns a token to legacy bookings; race-safe (only fills NULL). null = booking missing.
export async function ensureAttendanceToken(bookingId: string): Promise<string | null> {
  await prisma.booking.updateMany({
    where: { id: bookingId, attendanceToken: null },
    data: { attendanceToken: generateAttendanceToken() },
  });
  const found = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { attendanceToken: true },
  });
  return found?.attendanceToken ?? null;
}
