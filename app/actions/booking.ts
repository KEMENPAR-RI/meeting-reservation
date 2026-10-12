'use server';

import { refresh } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth/session';
import {
  deleteOldBookings,
  findBookingById,
  findOverlap,
  type OverlappingSlot,
} from '@/lib/booking/queries';
import { formatTimeRange, getBookingStatus } from '@/lib/booking/time';
import type { BookingFormState, CancelBookingResult } from '@/lib/booking/types';
import {
  isBookingId,
  parseBookingInput,
  readBookingValues,
  type BookingValues,
} from '@/lib/booking/validation';

const OVERLAP_CONSTRAINT = 'bookings_no_overlap';
const PG_EXCLUSION_VIOLATION = '23P01';
const PRISMA_RECORD_NOT_FOUND = 'P2025';

export async function createBooking(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
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

  // Best-effort; must never block or fail a booking.
  await deleteOldBookings(new Date()).catch((error) => console.error('[cleanup]', error));

  try {
    const clash = await findOverlap(startsAt, endsAt);
    if (clash) return overlapError(clash, readBookingValues(formData));

    // Explicit allowlist; never spread form data.
    await prisma.booking.create({
      data: { startsAt, endsAt, bookerName, division, agenda },
      select: { id: true },
    });
  } catch (error) {
    // Race guard: a concurrent insert hit the exclusion constraint.
    if (isOverlapViolation(error)) {
      const clash = await findOverlap(startsAt, endsAt).catch(() => null);
      return overlapError(clash, readBookingValues(formData));
    }
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
    const clash = await findOverlap(startsAt, endsAt, id);
    if (clash) return overlapError(clash, values);

    // Explicit allowlist; never spread form data.
    await prisma.booking.update({
      where: { id },
      data: { startsAt, endsAt, bookerName, division, agenda },
      select: { id: true },
    });
  } catch (error) {
    if (isOverlapViolation(error)) {
      const clash = await findOverlap(startsAt, endsAt, id).catch(() => null);
      return overlapError(clash, values);
    }
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
  // Authorization is enforced here; hiding the button is UX only.
  if (!(await isAdmin())) return { ok: false, message: 'Tidak diizinkan.' };
  if (!isBookingId(id)) return { ok: false, message: 'Booking tidak valid.' };

  try {
    // Idempotent: deleting an already-removed booking still succeeds.
    await prisma.booking.deleteMany({ where: { id } });
  } catch (error) {
    console.error('[cancelBooking] failed to delete booking', error);
    return { ok: false, message: 'Gagal membatalkan booking.' };
  }

  await deleteOldBookings(new Date()).catch((error) => console.error('[cleanup]', error));

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

// Prisma 7 + driver adapter surfaces unmapped PG errors as P2039 with
// meta.driverAdapterError.cause = { kind: 'postgres', code, message, ... }.
function isOverlapViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as { meta?: { driverAdapterError?: { cause?: Record<string, unknown> } } })
    .meta?.driverAdapterError?.cause;

  const codes = [cause?.code, cause?.originalCode];
  if (codes.includes(PG_EXCLUSION_VIOLATION)) return true;

  const text = [error.message, cause?.message, cause?.originalMessage]
    .filter((s): s is string => typeof s === 'string')
    .join(' ');
  return text.includes(OVERLAP_CONSTRAINT);
}

// Prisma 7 surfaces a missing update target as PrismaClientKnownRequestError code P2025.
function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Error && (error as { code?: unknown }).code === PRISMA_RECORD_NOT_FOUND
  );
}
