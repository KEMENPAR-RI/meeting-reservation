// Shared contract between form, action, validation, and list.

// Also used as the form input `name` attributes.
export const BOOKING_FIELDS = [
  'date',
  'startTime',
  'endTime',
  'bookerName',
  'division',
  'agenda',
] as const;

export type BookingField = (typeof BOOKING_FIELDS)[number];

// Exact, case-sensitive phrase required by resetAllBookings; here so the client can import it (no zod).
export const RESET_CONFIRMATION = 'RESET';

// Shared by server validation and input `maxLength`.
export const BOOKING_LIMITS = {
  bookerName: 100,
  division: 100,
  agenda: 1000,
} as const;

export type BookingFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<BookingField, string>>;
  // Submitted values for refilling inputs after an error.
  values?: Partial<Record<BookingField, string>>;
};

export const initialBookingFormState: BookingFormState = { status: 'idle' };

export type UpcomingBooking = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  bookerName: string;
  division: string;
  agenda: string;
};

export type CancelBookingResult = { ok: true } | { ok: false; message: string };

// Serializable props for the client edit modal: ISO strings plus text, nothing else.
export type EditableBooking = {
  id: string;
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  bookerName: string;
  division: string;
  agenda: string;
};

// Also used as the attendance form input `name` attributes.
export const ATTENDANCE_FIELDS = ['attendeeName', 'division', 'role', 'phone'] as const;

export type AttendanceField = (typeof ATTENDANCE_FIELDS)[number];

// Shared by server validation and input `maxLength`.
export const ATTENDANCE_LIMITS = {
  attendeeName: 100,
  attendeeNameMin: 2,
  division: 100,
  phoneRaw: 20,
} as const;

// Stable codes stored in attendances.attendee_role.
export const ATTENDEE_ROLES = [
  'pimpinan',
  'wakil_pimpinan',
  'tamu',
  'pegawai',
  'peserta_magang',
  'lainnya',
] as const;

export type AttendeeRole = (typeof ATTENDEE_ROLES)[number];

export const ATTENDEE_ROLE_LABELS: Record<AttendeeRole, string> = {
  pimpinan: 'Pimpinan',
  wakil_pimpinan: 'Wakil Pimpinan',
  tamu: 'Tamu',
  pegawai: 'Pegawai',
  peserta_magang: 'Peserta Magang',
  lainnya: 'Lainnya',
};

export function isAttendeeRole(value: unknown): value is AttendeeRole {
  return typeof value === 'string' && (ATTENDEE_ROLES as readonly string[]).includes(value);
}

// Label for display/export; legacy rows without a role show "-".
export function attendeeRoleLabel(role: string | null | undefined): string {
  return isAttendeeRole(role) ? ATTENDEE_ROLE_LABELS[role] : '-';
}

export type AttendanceFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<AttendanceField, string>>;
  values?: Partial<Record<AttendanceField, string>>;
};

export const initialAttendanceFormState: AttendanceFormState = { status: 'idle' };

// Serializable attendee row for the list.
export type Attendee = {
  id: string;
  name: string;
  division: string;
  role: string | null; // AttendeeRole code; null for legacy rows
  phone: string | null; // admin only; null otherwise
  signedAtISO: string;
  signedAtLabel: string; // e.g. "Senin, 12 Oktober 2026, 09.05 WIB"
};

export type DeleteAttendanceResult = { ok: true } | { ok: false; message: string };

export type LogBooking = UpcomingBooking & { attendeeCount: number };

// Public-safe meeting summary: no id, booker, division, or attendee data.
export type PublicMeeting = { agenda: string; startsAt: Date; endsAt: Date };
