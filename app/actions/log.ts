'use server';

import { refresh } from 'next/cache';
import { headers } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth/session';
import { findBookingById } from '@/lib/booking/queries';
import { getBookingStatus } from '@/lib/booking/time';
import { RESET_CONFIRMATION, type BookingFormState } from '@/lib/booking/types';
import { isBookingId, parseBookingText, readBookingTextValues } from '@/lib/booking/validation';
import { checkOfficeAccess } from '@/lib/office-access';

export type LogActionResult = { ok: boolean; message?: string; count?: number };

// `id` comes from the client: treat it as unknown at runtime.
export async function deletePastBooking(id: string): Promise<LogActionResult> {
  if (!checkOfficeAccess(await headers()).allowed) return { ok: false, message: 'Tidak diizinkan.' };
  // Authorization is enforced here; hiding the button is UX only.
  if (!(await isAdmin())) return { ok: false, message: 'Tidak diizinkan.' };
  if (!isBookingId(id)) return { ok: false, message: 'Booking tidak valid.' };

  try {
    const existing = await findBookingById(id);
    // Idempotent: an already-removed booking still succeeds; refresh drops the stale row.
    if (!existing) {
      refresh();
      return { ok: true };
    }
    const now = new Date();
    if (getBookingStatus(existing.startsAt, existing.endsAt, now) !== 'done') {
      return { ok: false, message: 'Hanya booking yang sudah selesai yang bisa dihapus dari log.' };
    }
    // Re-check endsAt in the delete itself so a concurrent edit can't slip an active booking through.
    const { count } = await prisma.booking.deleteMany({ where: { id, endsAt: { lte: now } } });
    if (count === 0) {
      refresh();
      return { ok: false, message: 'Hanya booking yang sudah selesai yang bisa dihapus dari log.' };
    }
  } catch (error) {
    console.error('[deletePastBooking] failed to delete booking', error);
    return { ok: false, message: 'Gagal menghapus booking dari log.' };
  }

  refresh();
  return { ok: true };
}

// Text-only edit for finished bookings; same shape as updateBooking. `id` is bound on the client.
export async function updatePastBookingText(
  id: string,
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = readBookingTextValues(formData);
  const fail = (message: string): BookingFormState => ({ status: 'error', message, values });

  if (!checkOfficeAccess(await headers()).allowed) return fail('Tidak diizinkan.');
  if (!(await isAdmin())) return fail('Tidak diizinkan.');
  if (!isBookingId(id)) return fail('Booking tidak valid.');

  let existing;
  try {
    existing = await findBookingById(id);
  } catch (error) {
    console.error('[updatePastBookingText] failed to load booking', error);
    return fail('Booking gagal diperbarui. Silakan coba lagi.');
  }
  if (!existing) return fail('Booking tidak ditemukan.');

  const now = new Date();
  if (getBookingStatus(existing.startsAt, existing.endsAt, now) !== 'done') {
    return fail('Gunakan edit biasa untuk booking yang belum selesai.');
  }

  const parsed = parseBookingText(formData);
  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Periksa kembali isian formulir.',
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    };
  }

  const { bookerName, division, agenda } = parsed.data;

  let count: number;
  try {
    // Explicit allowlist (never date/time); endsAt guard blocks a concurrent move into the future.
    ({ count } = await prisma.booking.updateMany({
      where: { id, endsAt: { lte: now } },
      data: { bookerName, division, agenda },
    }));
  } catch (error) {
    console.error('[updatePastBookingText] failed to update booking', error);
    return fail('Booking gagal diperbarui. Silakan coba lagi.');
  }

  refresh();
  // Deleted or no longer finished since the lookup.
  if (count === 0) return fail('Booking gagal diperbarui. Silakan coba lagi.');
  return { status: 'success', message: 'Booking berhasil diperbarui.' };
}

// Deletes every booking, upcoming included (intended).
export async function resetAllBookings(confirmation: string): Promise<LogActionResult> {
  if (!checkOfficeAccess(await headers()).allowed) return { ok: false, message: 'Tidak diizinkan.' };
  if (!(await isAdmin())) return { ok: false, message: 'Tidak diizinkan.' };
  if (confirmation !== RESET_CONFIRMATION) return { ok: false, message: 'Konfirmasi tidak sesuai.' };

  let count: number;
  try {
    ({ count } = await prisma.booking.deleteMany({}));
  } catch (error) {
    console.error('[resetAllBookings] failed to delete bookings', error);
    return { ok: false, message: 'Gagal mereset data booking.' };
  }

  refresh();
  return { ok: true, count };
}
