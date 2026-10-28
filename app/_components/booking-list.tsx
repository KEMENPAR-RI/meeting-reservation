import Link from 'next/link';
import { io } from 'next/cache';
import { isAdmin } from '@/lib/auth/session';
import { getUpcomingBookings } from '@/lib/booking/queries';
import { formatDateLabel, formatTimeRange, getBookingStatus } from '@/lib/booking/time';
import { CancelButton } from './cancel-button';
import { EditBookingButton } from './edit-booking-button';
import { StatusBadge } from './status-badge';

export async function BookingList() {
  // Must precede `new Date()` under Cache Components.
  await io();
  const now = new Date();
  const [admin, bookings] = await Promise.all([isAdmin(), getUpcomingBookings(now)]);

  if (bookings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
        Belum ada booking mendatang
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((b) => {
        const status = getBookingStatus(b.startsAt, b.endsAt, now);
        return (
          <li
            key={b.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 has-[[data-status=done]]:opacity-60"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-primary">
                <time dateTime={b.startsAt.toISOString()}>{formatDateLabel(b.startsAt)}</time>
              </p>
              <p className="flex items-center gap-2 text-sm tabular-nums text-zinc-700">
                <StatusBadge
                  startsAt={b.startsAt.toISOString()}
                  endsAt={b.endsAt.toISOString()}
                  initialStatus={status}
                />
                {formatTimeRange(b.startsAt, b.endsAt)}
              </p>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{b.bookerName}</span>
              <span aria-hidden="true"> · </span>
              {b.division}
            </p>
            {/* Plain text only; line breaks kept via CSS */}
            <p className="mt-2 whitespace-pre-line break-words text-sm text-zinc-700">
              {b.agenda}
            </p>
            <div className="mt-3 flex items-start justify-between gap-2">
              <Link
                href={`/rapat/${b.id}`}
                aria-label={`Daftar hadir rapat ${b.bookerName} ${formatTimeRange(b.startsAt, b.endsAt)}`}
                className="inline-flex items-center rounded-md border border-primary/30 bg-white px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
              >
                Daftar hadir
              </Link>
              {/* UX only; the action re-checks admin */}
              {admin && (
                <div className="flex items-start justify-end gap-2">
                  {status !== 'done' && (
                    <EditBookingButton
                      booking={{
                        id: b.id,
                        startsAt: b.startsAt.toISOString(),
                        endsAt: b.endsAt.toISOString(),
                        bookerName: b.bookerName,
                        division: b.division,
                        agenda: b.agenda,
                      }}
                    />
                  )}
                  {status !== 'done' && <CancelButton id={b.id} />}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
