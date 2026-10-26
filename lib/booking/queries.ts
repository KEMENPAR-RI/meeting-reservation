import { prisma } from '@/lib/prisma';

import { LOG_MAX_ROWS } from './log';
import { startOfTodayJakarta } from './time';
import type { UpcomingBooking } from './types';

const UPCOMING_LIMIT = 100;

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

export type LogBookingsResult = { rows: UpcomingBooking[]; truncated: boolean };

// Reservation log: bookings starting in [gte, lt), optionally filtered.
// Fetches one extra row to detect when LOG_MAX_ROWS is exceeded.
export async function getLogBookings(
  range: { gte: Date; lt: Date },
  filter: { division?: string; bookerName?: string },
): Promise<LogBookingsResult> {
  if (range.gte >= range.lt) return { rows: [], truncated: false };
  const rows = await prisma.booking.findMany({
    where: {
      startsAt: { gte: range.gte, lt: range.lt },
      ...(filter.division ? { division: filter.division } : {}),
      ...(filter.bookerName
        ? { bookerName: { contains: escapeLike(filter.bookerName), mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: { startsAt: 'asc' },
    take: LOG_MAX_ROWS + 1,
    select: BOOKING_SELECT,
  });
  const truncated = rows.length > LOG_MAX_ROWS;
  return { rows: truncated ? rows.slice(0, LOG_MAX_ROWS) : rows, truncated };
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

// Half-open overlap, same semantics as the bookings_no_overlap constraint.
// `excludeId` skips the booking being edited.
export async function findOverlap(
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<OverlappingSlot | null> {
  return prisma.booking.findFirst({
    where: {
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { startsAt: 'asc' },
    select: { startsAt: true, endsAt: true },
  });
}
