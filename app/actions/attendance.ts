'use server';

import { refresh } from 'next/cache';
import { headers } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth/session';
import { checkOfficeAccess, getClientIpKey } from '@/lib/office-access';
import { consumePublicAttendanceQuota, isBookingAttendanceFull } from '@/lib/rate-limit';
import { recordAttendance, type RecordAttendanceResult } from '@/lib/booking/attendance';
import { isAttendanceToken } from '@/lib/booking/attendance-token';
import { isAttendanceOpen } from '@/lib/booking/attendance-window';
import { findBookingById, findBookingByToken } from '@/lib/booking/queries';
import type { AttendanceFormState, DeleteAttendanceResult } from '@/lib/booking/types';
import {
  isBookingId,
  parseAttendanceInput,
  readAttendanceValues,
  type AttendanceValues,
} from '@/lib/booking/validation';

const CLOSED_MESSAGE = 'Daftar hadir sudah ditutup.';
const INVALID_LINK_MESSAGE = 'Link daftar hadir tidak valid.';
const RATE_LIMIT_MESSAGE = 'Terlalu banyak percobaan, coba lagi nanti.';
const SUCCESS_MESSAGE = 'Kehadiran berhasil dicatat.';

// `bookingId` is bound on the client: treat it as unknown at runtime.
export async function signAttendance(
  bookingId: string,
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const values = readAttendanceValues(formData);
  const fail = (message: string): AttendanceFormState => ({ status: 'error', message, values });

  if (!checkOfficeAccess(await headers()).allowed) return fail('Tidak diizinkan.');
  // Internal form is admin only; participants use /hadir.
  if (!(await isAdmin())) return fail('Tidak diizinkan.');
  if (!isBookingId(bookingId)) return fail('Booking tidak valid.');

  const booking = await findBookingById(bookingId);
  if (!booking) return fail('Booking tidak ditemukan.');
  const now = new Date();
  if (!isAttendanceOpen(booking.startsAt, booking.endsAt, now)) return fail(CLOSED_MESSAGE);

  const parsed = parseAttendanceInput(formData);
  if (!parsed.ok) return invalidForm(parsed.fieldErrors, parsed.values);

  const result = await recordAttendance(booking, parsed.data, now);
  if (!result.ok) return recordFailure(result.reason, values, 'Booking tidak ditemukan.');

  refresh();
  return { status: 'success', message: SUCCESS_MESSAGE };
}

// Public (no office check by design): token-only, rate limited outside the office,
// never refreshes or returns meeting/attendee data. `token` is bound on the client.
export async function submitPublicAttendance(
  token: string,
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const values = readAttendanceValues(formData);
  const fail = (message: string): AttendanceFormState => ({ status: 'error', message, values });

  if (!isAttendanceToken(token)) return fail(INVALID_LINK_MESSAGE);

  const h = await headers();
  const now = new Date();
  const office = checkOfficeAccess(h).allowed;
  if (!office) {
    const ipKey = getClientIpKey(h);
    if (!ipKey) return fail('Tidak diizinkan.');
    // Counts every attempt, including ones that fail validation.
    if (!(await consumePublicAttendanceQuota(ipKey, now))) return fail(RATE_LIMIT_MESSAGE);
  }

  const booking = await findBookingByToken(token);
  if (!booking) return fail(INVALID_LINK_MESSAGE);
  if (!isAttendanceOpen(booking.startsAt, booking.endsAt, now)) return fail(CLOSED_MESSAGE);
  if (!office && (await isBookingAttendanceFull(booking.id))) return fail('Daftar hadir sudah penuh.');

  const parsed = parseAttendanceInput(formData);
  if (!parsed.ok) return invalidForm(parsed.fieldErrors, parsed.values);

  const result = await recordAttendance(booking, parsed.data, now, { precheck: false });
  if (!result.ok) return recordFailure(result.reason, values, INVALID_LINK_MESSAGE);

  return { status: 'success', message: SUCCESS_MESSAGE };
}

function invalidForm(
  fieldErrors: AttendanceFormState['fieldErrors'],
  values: AttendanceValues,
): AttendanceFormState {
  return { status: 'error', message: 'Periksa kembali isian formulir.', fieldErrors, values };
}

function recordFailure(
  reason: Extract<RecordAttendanceResult, { ok: false }>['reason'],
  values: AttendanceValues,
  goneMessage: string,
): AttendanceFormState {
  const error = (message: string, fieldErrors?: AttendanceFormState['fieldErrors']) =>
    ({ status: 'error', message, fieldErrors, values }) satisfies AttendanceFormState;
  switch (reason) {
    case 'closed':
      return error(CLOSED_MESSAGE);
    case 'duplicate-name':
      return error('Nama ini sudah tercatat hadir.', { attendeeName: 'Nama ini sudah tercatat hadir.' });
    case 'duplicate-phone':
      return error('No HP ini sudah tercatat hadir.', { phone: 'No HP ini sudah tercatat hadir.' });
    case 'duplicate':
      return error('Nama atau No HP ini sudah tercatat hadir.');
    case 'gone':
      return error(goneMessage);
    default:
      return error('Daftar hadir gagal disimpan. Silakan coba lagi.');
  }
}

// `id` comes from the client: treat it as unknown at runtime.
export async function deleteAttendance(id: string): Promise<DeleteAttendanceResult> {
  if (!checkOfficeAccess(await headers()).allowed) return { ok: false, message: 'Tidak diizinkan.' };
  // Authorization is enforced here; hiding the button is UX only.
  if (!(await isAdmin())) return { ok: false, message: 'Tidak diizinkan.' };
  if (!isBookingId(id)) return { ok: false, message: 'Data hadir tidak valid.' };

  try {
    // Idempotent: an already-removed entry still succeeds.
    await prisma.attendance.deleteMany({ where: { id } });
  } catch (error) {
    console.error('[deleteAttendance] failed to delete attendance', error);
    return { ok: false, message: 'Gagal menghapus data hadir.' };
  }

  refresh();
  return { ok: true };
}
