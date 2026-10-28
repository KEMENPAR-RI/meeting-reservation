'use server';

import { refresh } from 'next/cache';
import { headers } from 'next/headers';

import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth/session';
import {
  findBookingById,
  findOverlap,
  lockBookingWrites,
  type OverlappingSlot,
} from '@/lib/booking/queries';
import { formatTimeRange, getBookingStatus } from '@/lib/booking/time';
import { checkOfficeAccess } from '@/lib/office-access';
import { generateAttendanceToken } from '@/lib/booking/attendance-token';
import type { BookingFormState, CancelBookingResult } from '@/lib/booking/types';
import {
  isBookingId,
  parseBookingInput,
  readBookingValues,
  type BookingValues,
} from '@/lib/booking/validation';

const PRISMA_RECORD_NOT_FOUND = 'P2025';

// Lock-first write tx (ADR 0001); RC so the overlap check sees the previous holder's commit.
const BOOKING_TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5000,
  timeout: 10000,
};

export async function createBooking(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  if (!checkOfficeAccess(await headers()).allowed) {
    return { status: 'error', message: 'Tidak diizinkan.', values: readBookingValues(formData) };
  }

  const parsed = parseBookingInput(formData);
  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Periksa kembali isian formulir.',
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    };
  }

  const { startsAt, endsAt, bookerName, division, agenda } = parsed.data;

  try {
    const clash = await prisma.$transaction(async (tx) => {
      await lockBookingWrites(tx);
      const found = await findOverlap(startsAt, endsAt, undefined, tx);
      if (found) return found;

      // Explicit allowlist; never spread form data.
      await tx.booking.create({
        data: { startsAt, endsAt, bookerName, division, agenda, attendanceToken: generateAttendanceToken() },
        select: { id: true },
      });
      return null;
    }, BOOKING_TX_OPTIONS);
    if (clash) return overlapError(clash, readBookingValues(formData));
  } catch (error) {
    console.error('[createBooking] failed to save booking', error);
    return {
      status: 'error',
      message: 'Booking gagal disimpan. Silakan coba lagi.',
      values: readBookingValues(formData),
    };
  }

  refresh();
  return { status: 'success', message: 'Booking berhasil disimpan.' };
}

// `id` is bound on the client: treat it as unknown at runtime.
export async function updateBooking(
  id: string,
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = readBookingValues(formData);
  const fail = (message: string): BookingFormState => ({ status: 'error', message, values });

  if (!checkOfficeAccess(await headers()).allowed) return fail('Tidak diizinkan.');
  if (!(await isAdmin())) return fail('Tidak diizinkan.');
  if (!isBookingId(id)) return fail('Booking tidak valid.');

  let existing;
  try {
    existing = await findBookingById(id);
  } catch (error) {
    console.error('[updateBooking] failed to load booking', error);
    return fail('Booking gagal diperbarui. Silakan coba lagi.');
  }
  if (!existing) return fail('Booking tidak ditemukan.');

  const now = new Date();
  if (getBookingStatus(existing.startsAt, existing.endsAt, now) === 'done') {
    return fail('Booking yang sudah selesai tidak bisa diubah.');
  }

  const parsed = parseBookingInput(formData, now, { originalStartsAt: existing.startsAt });
  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Periksa kembali isian formulir.',
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    };
  }

  const { startsAt, endsAt, bookerName, division, agenda } = parsed.data;

  try {
    const clash = await prisma.$transaction(async (tx) => {
      await lockBookingWrites(tx);
      const found = await findOverlap(startsAt, endsAt, id, tx);
      if (found) return found;

      // Explicit allowlist; never spread form data.
      await tx.booking.update({
        where: { id },
        data: { startsAt, endsAt, bookerName, division, agenda },
        select: { id: true },
      });
      return null;
    }, BOOKING_TX_OPTIONS);
    if (clash) return overlapError(clash, values);
  } catch (error) {
    // Deleted between the lookup and the update.
    if (isRecordNotFound(error)) return fail('Booking tidak ditemukan.');
    console.error('[updateBooking] failed to update booking', error);
    return fail('Booking gagal diperbarui. Silakan coba lagi.');
  }

  refresh();
  return { status: 'success', message: 'Booking berhasil diperbarui.' };
}

// `id` comes from the client: treat it as unknown at runtime.
export async function cancelBooking(id: string): Promise<CancelBookingResult> {
  if (!checkOfficeAccess(await headers()).allowed) return { ok: false, message: 'Tidak diizinkan.' };
  // Authorization is enforced here; hiding the button is UX only.
  if (!(await isAdmin())) return { ok: false, message: 'Tidak diizinkan.' };
  if (!isBookingId(id)) return { ok: false, message: 'Booking tidak valid.' };

  try {
    // Finished bookings are kept for the reservation log; same rule as updateBooking.
    const existing = await findBookingById(id);
    if (existing && getBookingStatus(existing.startsAt, existing.endsAt, new Date()) === 'done') {
      return { ok: false, message: 'Booking yang sudah selesai tidak bisa dibatalkan.' };
    }
    // Idempotent: deleting an already-removed booking still succeeds.
    await prisma.booking.deleteMany({ where: { id } });
  } catch (error) {
    console.error('[cancelBooking] failed to delete booking', error);
    return { ok: false, message: 'Gagal membatalkan booking.' };
  }

  refresh();
  return { ok: true };
}

function overlapError(clash: OverlappingSlot | null, values: BookingValues): BookingFormState {
  const slot = clash ? ` (${formatTimeRange(clash.startsAt, clash.endsAt)})` : '';
  return {
    status: 'error',
    message: 'Jadwal bentrok dengan booking lain.',
    fieldErrors: { startTime: `Ruangan sudah dibooking pada jam tersebut${slot}.` },
    values,
  };
}

// Prisma 7 surfaces a missing update target as PrismaClientKnownRequestError code P2025.
function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Error && (error as { code?: unknown }).code === PRISMA_RECORD_NOT_FOUND
  );
}
