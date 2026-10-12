import { prisma } from '@/lib/prisma';

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

const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000;

// Removes bookings that ended more than 24h before `now`; uses @@index([endsAt]).
export async function deleteOldBookings(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - CLEANUP_AGE_MS);
  const { count } = await prisma.booking.deleteMany({ where: { endsAt: { lt: cutoff } } });
  return count;
}
