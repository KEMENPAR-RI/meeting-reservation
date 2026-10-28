import { submitPublicAttendance } from '@/app/actions/attendance';
import { ATTENDANCE_CLOSE_AFTER_MS, ATTENDANCE_OPEN_BEFORE_MS } from '@/lib/booking/attendance-window';
import type { PublicMeeting } from '@/lib/booking/public-attendance';
import { formatDateLabel, formatTimeRange, getBookingStatus } from '@/lib/booking/time';
import { AttendanceForm } from './attendance-form';
import { StatusBadge } from './status-badge';

// Public view: meeting identity + form only. Never render attendees or internal links here.
// `now` comes from the page after io() (Cache Components).
export function PublicAttendanceView({
  meeting,
  token,
  now,
}: {
  meeting: PublicMeeting;
  token: string;
  now: Date;
}) {
  return (
    <div className="space-y-5">
      <section
        aria-labelledby="meeting-heading"
        className="rounded-2xl border border-zinc-200 border-l-4 border-l-secondary bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Rapat</p>
          <StatusBadge
            startsAt={meeting.startsAt.toISOString()}
            endsAt={meeting.endsAt.toISOString()}
            initialStatus={getBookingStatus(meeting.startsAt, meeting.endsAt, now)}
          />
        </div>
        {/* Plain text only; line breaks kept via CSS */}
        <h1
          id="meeting-heading"
          className="mt-1 line-clamp-4 whitespace-pre-line break-words text-lg leading-snug font-semibold text-primary"
        >
          {meeting.agenda}
        </h1>
        <p className="mt-3 flex flex-wrap gap-x-2 text-sm text-zinc-700">
          <time dateTime={meeting.startsAt.toISOString()}>{formatDateLabel(meeting.startsAt)}</time>
          <span aria-hidden="true">·</span>
          <span className="font-medium tabular-nums">{formatTimeRange(meeting.startsAt, meeting.endsAt)}</span>
        </p>
      </section>

      {/* Focal point */}
      <section
        aria-labelledby="sign-heading"
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 id="sign-heading" className="mb-5 text-lg font-semibold text-primary">
          Isi Daftar Hadir
        </h2>
        <AttendanceForm action={submitPublicAttendance.bind(null, token)} variant="public" />
      </section>
    </div>
  );
}

const NOTICES = {
  invalid: {
    title: 'Link daftar hadir tidak valid',
    body: 'Periksa kembali link yang Anda terima atau hubungi panitia rapat.',
  },
  closed: {
    title: 'Daftar hadir sudah ditutup',
    body: `Daftar hadir hanya dapat diisi mulai ${ATTENDANCE_OPEN_BEFORE_MS / 60_000} menit sebelum rapat dimulai hingga ${ATTENDANCE_CLOSE_AFTER_MS / 60_000} menit setelah rapat selesai.`,
  },
  none: {
    title: 'Tidak ada rapat yang sedang berlangsung',
    body: 'Silakan pindai kembali kode QR saat rapat akan dimulai.',
  },
} as const;

// Dead-end card: intentionally no links.
export function PublicNotice({ kind }: { kind: keyof typeof NOTICES }) {
  const { title, body } = NOTICES[kind];
  return (
    <section
      aria-labelledby="notice-heading"
      className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center shadow-sm"
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary/30 text-primary">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-6">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <h1 id="notice-heading" className="mt-4 text-lg font-semibold text-balance text-primary">
        {title}
      </h1>
      <p className="mt-2 text-sm text-pretty text-zinc-600">{body}</p>
    </section>
  );
}

export function PublicAttendanceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat daftar hadir" className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 border-l-4 border-l-secondary bg-white p-5 motion-safe:animate-pulse">
        <div className="h-3 w-16 rounded bg-zinc-200" />
        <div className="mt-3 h-5 w-3/4 rounded bg-zinc-200" />
        <div className="mt-3 h-3 w-48 rounded bg-zinc-100" />
      </div>
      <div className="h-[28rem] rounded-2xl border border-zinc-200 bg-white motion-safe:animate-pulse" />
    </div>
  );
}
