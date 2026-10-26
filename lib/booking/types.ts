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
