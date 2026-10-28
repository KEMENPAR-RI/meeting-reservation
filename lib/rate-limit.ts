import { prisma } from '@/lib/prisma';

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_MIN = 10;
const DEFAULT_MAX_PER_BOOKING = 200;
// Rows are dead once their window ends; keep a small margin.
const RETENTION_MARGIN_MS = 60_000;
// Roughly 1 in N requests prunes old rows.
const CLEANUP_EVERY = 20;

function readPositiveInt(raw: string | undefined, fallback: number, max: number): number {
  const value = Number(raw?.trim());
  return Number.isInteger(value) && value > 0 && value <= max ? value : fallback;
}

// Fixed window per IP key; true = allowed. Fails closed on DB errors.
export async function consumePublicAttendanceQuota(ipKey: string, now: Date): Promise<boolean> {
  const max = readPositiveInt(process.env.PUBLIC_ATTENDANCE_RATE_MAX, DEFAULT_MAX, 10_000);
  const windowMs =
    readPositiveInt(process.env.PUBLIC_ATTENDANCE_RATE_WINDOW_MIN, DEFAULT_WINDOW_MIN, 1440) * 60_000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  try {
    const [, row] = await prisma.$transaction([
      prisma.$executeRaw`INSERT INTO attendance_rate_limits (ip_key, window_start, hits)
        VALUES (${ipKey}, ${windowStart}, 1)
        ON DUPLICATE KEY UPDATE hits = hits + 1`,
      prisma.attendanceRateLimit.findUnique({
        where: { ipKey_windowStart: { ipKey, windowStart } },
        select: { hits: true },
      }),
    ]);
    // Awaited: fire-and-forget may be cut off on serverless.
    if (Math.random() * CLEANUP_EVERY < 1) await pruneOldWindows(now, windowMs);
    return row !== null && row.hits <= max;
  } catch (error) {
    console.error('[rate-limit] failed to record hit', error);
    return false;
  }
}

// Total attendees cap for public submits; true = full. Fails closed on DB errors.
export async function isBookingAttendanceFull(bookingId: string): Promise<boolean> {
  const max = readPositiveInt(
    process.env.PUBLIC_ATTENDANCE_MAX_PER_BOOKING,
    DEFAULT_MAX_PER_BOOKING,
    100_000,
  );
  try {
    const found = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { _count: { select: { attendances: true } } },
    });
    return !found || found._count.attendances >= max;
  } catch (error) {
    console.error('[rate-limit] failed to count attendees', error);
    return true;
  }
}

async function pruneOldWindows(now: Date, windowMs: number): Promise<void> {
  const cutoff = new Date(now.getTime() - windowMs - RETENTION_MARGIN_MS);
  try {
    await prisma.$executeRaw`DELETE FROM attendance_rate_limits WHERE window_start < ${cutoff} LIMIT 100`;
  } catch (error) {
    console.error('[rate-limit] cleanup failed', error);
  }
}
