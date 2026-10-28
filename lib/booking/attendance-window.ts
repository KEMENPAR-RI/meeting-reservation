// Pure attendance window rules; pass `now` explicitly.

export const ATTENDANCE_OPEN_BEFORE_MS = 30 * 60_000;
export const ATTENDANCE_CLOSE_AFTER_MS = 30 * 60_000;

// Inclusive on both ends (ms precision).
export function isAttendanceOpen(startsAt: Date, endsAt: Date, now: Date): boolean {
  const t = now.getTime();
  return (
    t >= startsAt.getTime() - ATTENDANCE_OPEN_BEFORE_MS &&
    t <= endsAt.getTime() + ATTENDANCE_CLOSE_AFTER_MS
  );
}

// Priority: running now > nearest upcoming > most recently ended; only open windows count.
export function pickActiveMeeting<T extends { startsAt: Date; endsAt: Date }>(
  candidates: readonly T[],
  now: Date,
): T | null {
  const t = now.getTime();
  let running: T | null = null;
  let upcoming: T | null = null;
  let ended: T | null = null;
  for (const c of candidates) {
    if (!isAttendanceOpen(c.startsAt, c.endsAt, now)) continue;
    const start = c.startsAt.getTime();
    const end = c.endsAt.getTime();
    if (start <= t && t < end) {
      if (!running) running = c;
    } else if (start > t) {
      if (!upcoming || start < upcoming.startsAt.getTime()) upcoming = c;
    } else if (!ended || end > ended.endsAt.getTime()) {
      ended = c;
    }
  }
  return running ?? upcoming ?? ended;
}
