import type { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';

import { ATTENDANCE_CLOSE_AFTER_MS, ATTENDANCE_OPEN_BEFORE_MS } from './attendance-window';
import { LOG_MAX_ATTENDEES, LOG_MAX_ROWS, type ExportAttendee } from './log';
import { startOfTodayJakarta } from './time';
import type { LogBooking, UpcomingBooking } from './types';

const UPCOMING_LIMIT = 100;
// Overlapping attendance windows are rare; a few candidates are enough to pick one.
const ATTENDANCE_CANDIDATES_LIMIT = 5;

const BOOKING_SELECT = {
  id: true,
  startsAt: true,
  endsAt: true,
  bookerName: true,
  division: true,
  agenda: true,
} as const;

// Today's bookings (WIB) stay visible all day, even after they end.
export async function getUpcomingBookings(now: Date): Promise<UpcomingBooking[]> {
  return prisma.booking.findMany({
    where: { endsAt: { gt: startOfTodayJakarta(now) } },
    orderBy: { startsAt: 'asc' },
    take: UPCOMING_LIMIT,
    select: BOOKING_SELECT,
  });
}

export async function findBookingById(id: string): Promise<UpcomingBooking | null> {
  return prisma.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
}

// Escape LIKE wildcards; Prisma `contains` passes them through unescaped.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export type LogBookingsResult = { rows: LogBooking[]; truncated: boolean };

type LogRange = { gte: Date; lt: Date };
type LogFilter = { division?: string; bookerName?: string };

// Shared by the log bookings and attendee queries so both see the same set.
function logWhere(range: LogRange, filter: LogFilter): Prisma.BookingWhereInput {
  return {
    startsAt: { gte: range.gte, lt: range.lt },
    ...(filter.division ? { division: filter.division } : {}),
    ...(filter.bookerName
      ? { bookerName: { contains: escapeLike(filter.bookerName) } } // _ci collation: case-insensitive
      : {}),
  };
}

// Reservation log: bookings starting in [gte, lt), optionally filtered.
// Fetches one extra row to detect when LOG_MAX_ROWS is exceeded.
export async function getLogBookings(
  range: LogRange,
  filter: LogFilter,
): Promise<LogBookingsResult> {
  if (range.gte >= range.lt) return { rows: [], truncated: false };
  const found = await prisma.booking.findMany({
    where: logWhere(range, filter),
    orderBy: { startsAt: 'asc' },
    take: LOG_MAX_ROWS + 1,
    select: { ...BOOKING_SELECT, _count: { select: { attendances: true } } },
  });
  const truncated = found.length > LOG_MAX_ROWS;
  const rows = (truncated ? found.slice(0, LOG_MAX_ROWS) : found).map(toCountedBooking);
  return { rows, truncated };
}

// Attendees of the same booking set as getLogBookings, in signing order; one extra row detects truncation.
export async function getLogAttendees(
  range: LogRange,
  filter: LogFilter,
): Promise<{ rows: ExportAttendee[]; truncated: boolean }> {
  if (range.gte >= range.lt) return { rows: [], truncated: false };
  const rows = await prisma.attendance.findMany({
    where: { booking: logWhere(range, filter) },
    orderBy: [{ signedAt: 'asc' }, { id: 'asc' }],
    take: LOG_MAX_ATTENDEES + 1,
    select: { bookingId: true, name: true, division: true, role: true, signedAt: true },
  });
  const truncated = rows.length > LOG_MAX_ATTENDEES;
  return { rows: truncated ? rows.slice(0, LOG_MAX_ATTENDEES) : rows, truncated };
}

const ATTENDEE_SELECT = {
  id: true,
  name: true,
  division: true,
  role: true,
  phone: true,
  signedAt: true,
} as const;

// `phone` is admin-only: map it to null before passing rows to non-admin views.
export type AttendeeRow = {
  id: string;
  name: string;
  division: string;
  role: string | null;
  phone: string | null;
  signedAt: Date;
};

// One booking with its attendees in signing order; null when missing.
export async function getBookingAttendance(id: string): Promise<{
  booking: UpcomingBooking & { attendanceToken: string | null };
  attendees: AttendeeRow[];
} | null> {
  const found = await prisma.booking.findUnique({
    where: { id },
    select: {
      ...BOOKING_SELECT,
      attendanceToken: true,
      attendances: { orderBy: { signedAt: 'asc' }, select: ATTENDEE_SELECT },
    },
  });
  if (!found) return null;
  const { attendances, ...booking } = found;
  return { booking, attendees: attendances };
}

export type AttendanceCandidate = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  agenda: string;
  attendanceToken: string | null;
};

// Bookings whose attendance window contains `now`; pick one with pickActiveMeeting.
export async function findAttendanceCandidates(now: Date): Promise<AttendanceCandidate[]> {
  return prisma.booking.findMany({
    where: {
      startsAt: { lte: new Date(now.getTime() + ATTENDANCE_OPEN_BEFORE_MS) },
      endsAt: { gte: new Date(now.getTime() - ATTENDANCE_CLOSE_AFTER_MS) },
    },
    orderBy: { startsAt: 'asc' },
    take: ATTENDANCE_CANDIDATES_LIMIT,
    select: { id: true, startsAt: true, endsAt: true, agenda: true, attendanceToken: true },
  });
}

// Minimal select: callers must not leak booking details publicly.
export async function findBookingByToken(
  token: string,
): Promise<{ id: string; startsAt: Date; endsAt: Date; agenda: string } | null> {
  return prisma.booking.findUnique({
    where: { attendanceToken: token },
    select: { id: true, startsAt: true, endsAt: true, agenda: true },
  });
}

const RECENT_PAST_DAYS = 30;
const RECENT_PAST_LIMIT = 100;

// Bookings that started in the last 30 WIB days, before today (home covers today); newest first.
export async function getRecentPastBookings(now: Date): Promise<LogBooking[]> {
  const today = startOfTodayJakarta(now);
  const from = new Date(today.getTime() - RECENT_PAST_DAYS * 86_400_000); // WIB has no DST
  const found = await prisma.booking.findMany({
    where: { startsAt: { gte: from, lt: today } },
    orderBy: { startsAt: 'desc' },
    take: RECENT_PAST_LIMIT,
    select: { ...BOOKING_SELECT, _count: { select: { attendances: true } } },
  });
  return found.map(toCountedBooking);
}

function toCountedBooking({
  _count,
  ...booking
}: UpcomingBooking & { _count: { attendances: number } }): LogBooking {
  return { ...booking, attendeeCount: _count.attendances };
}

const DIVISIONS_LIMIT = 200;

// Divisions used in [gte, lt); range hits the starts_at index, capped.
export async function getDistinctDivisions(range: { gte: Date; lt: Date }): Promise<string[]> {
  const rows = await prisma.booking.findMany({
    where: { startsAt: { gte: range.gte, lt: range.lt }, division: { not: '' } },
    distinct: ['division'],
    orderBy: { division: 'asc' },
    take: DIVISIONS_LIMIT,
    select: { division: true },
  });
  return rows.map((r) => r.division);
}

export type OverlappingSlot = { startsAt: Date; endsAt: Date };

// Half-open overlap; run under lockBookingWrites to be race-free (ADR 0001).
// `excludeId` skips the booking being edited.
export async function findOverlap(
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
  db: Prisma.TransactionClient = prisma,
): Promise<OverlappingSlot | null> {
  return db.booking.findFirst({
    where: {
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { startsAt: 'asc' },
    select: { startsAt: true, endsAt: true },
  });
}

// Serializes time-changing booking writes until the tx ends. Fails closed if the lock row is missing.
export async function lockBookingWrites(tx: Prisma.TransactionClient): Promise<void> {
  // Same tx connection; lock wait gives up before Prisma's 10s tx timeout.
  await tx.$executeRaw`SET SESSION innodb_lock_wait_timeout = 5`;
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM booking_locks WHERE id = 1 FOR UPDATE`;
  if (rows.length !== 1) throw new Error('booking_locks row 1 is missing');
}
