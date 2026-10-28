import { prisma } from '@/lib/prisma';

import { isAttendanceOpen } from './attendance-window';
import type { AttendanceInput } from './validation';

export type RecordAttendanceResult =
  | { ok: true }
  | { ok: false; reason: 'closed' | 'duplicate-name' | 'duplicate-phone' | 'duplicate' | 'gone' | 'error' };

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const PRISMA_FK_VIOLATION = 'P2003';

// Shared by the internal and public paths; the caller has already authorized the request.
// precheck=false (public): duplicates only surface as generic 'duplicate' to avoid leaking who attended.
export async function recordAttendance(
  booking: { id: string; startsAt: Date; endsAt: Date },
  input: AttendanceInput,
  now: Date,
  { precheck = true }: { precheck?: boolean } = {},
): Promise<RecordAttendanceResult> {
  if (!isAttendanceOpen(booking.startsAt, booking.endsAt, now)) return { ok: false, reason: 'closed' };

  const { name, nameKey, division, role, phone } = input;
  try {
    // Pre-checks give per-field messages; the unique indexes still decide races.
    const sameName =
      precheck &&
      (await prisma.attendance.findFirst({
        where: { bookingId: booking.id, nameKey },
        select: { id: true },
      }));
    if (sameName) return { ok: false, reason: 'duplicate-name' };
    if (precheck && phone) {
      const samePhone = await prisma.attendance.findFirst({
        where: { bookingId: booking.id, phone },
        select: { id: true },
      });
      if (samePhone) return { ok: false, reason: 'duplicate-phone' };
    }

    // Explicit allowlist; signature = name (typed signature input was removed).
    await prisma.attendance.create({
      data: { bookingId: booking.id, name, nameKey, division, role, phone, signature: name },
      select: { id: true },
    });
    return { ok: true };
  } catch (error) {
    const code = prismaCode(error);
    if (code === PRISMA_UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate' };
    if (code === PRISMA_FK_VIOLATION) return { ok: false, reason: 'gone' };
    console.error('[recordAttendance] failed to save attendance', error);
    return { ok: false, reason: 'error' };
  }
}

// PrismaClientKnownRequestError code (e.g. P2002), if any.
function prismaCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
