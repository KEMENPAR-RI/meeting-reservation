import { ensureAttendanceToken, isAttendanceToken } from './attendance-token';
import { isAttendanceOpen, pickActiveMeeting } from './attendance-window';
import { findAttendanceCandidates, findBookingByToken } from './queries';
import type { PublicMeeting } from './types';

export type { PublicMeeting } from './types';

// Same for office and outside; `token` is needed to bind submitPublicAttendance.
export type HadirLanding = { kind: 'open'; meeting: PublicMeeting; token: string } | { kind: 'none' };

export type PublicMeetingByToken =
  | { kind: 'invalid' }
  | { kind: 'closed' }
  | { kind: 'open'; meeting: PublicMeeting };

// Static QR `/hadir`; `now` must come after `io()` in the page.
export async function resolveHadirLanding(now: Date): Promise<HadirLanding> {
  const picked = pickActiveMeeting(await findAttendanceCandidates(now), now);
  const token = picked ? (picked.attendanceToken ?? (await ensureAttendanceToken(picked.id))) : null;
  if (!picked || !token) return { kind: 'none' };
  return { kind: 'open', meeting: toPublicMeeting(picked), token };
}

// Unknown or deleted-booking tokens map to 'invalid'; malformed tokens skip the query.
export async function getPublicMeetingByToken(token: string, now: Date): Promise<PublicMeetingByToken> {
  if (!isAttendanceToken(token)) return { kind: 'invalid' };
  const booking = await findBookingByToken(token);
  if (!booking) return { kind: 'invalid' };
  if (!isAttendanceOpen(booking.startsAt, booking.endsAt, now)) return { kind: 'closed' };
  return { kind: 'open', meeting: toPublicMeeting(booking) };
}

function toPublicMeeting(b: { agenda: string; startsAt: Date; endsAt: Date }): PublicMeeting {
  return { agenda: b.agenda, startsAt: b.startsAt, endsAt: b.endsAt };
}
