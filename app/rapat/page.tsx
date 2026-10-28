import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { io } from 'next/cache';
import { getRecentPastBookings } from '@/lib/booking/queries';
import { formatDateLabel, formatTimeRange, getBookingStatus } from '@/lib/booking/time';
import { BackLink } from '../_components/back-link';
import { SiteHeader } from '../_components/site-header';
import { StatusBadge } from '../_components/status-badge';

export const metadata: Metadata = { title: 'Rapat Sebelumnya - Booking Ruang Rapat' };

export default function PastMeetingsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 font-sans sm:px-6 lg:py-14">
      <SiteHeader />
      <div className="mx-auto max-w-3xl">
        <BackLink href="/">Kembali ke booking</BackLink>
        <h2 id="past-heading" className="mt-1 text-2xl font-semibold tracking-tight text-primary">
          Rapat Sebelumnya
        </h2>
        <p className="mt-1 mb-6 text-sm text-zinc-600">
          30 hari terakhir. Pilih rapat untuk melihat daftar hadir.
        </p>
        <Suspense fallback={<PastListSkeleton />}>
          <PastMeetingsList />
        </Suspense>
      </div>
    </main>
  );
}

async function PastMeetingsList() {
  // Must precede `new Date()` under Cache Components.
  await io();
  const now = new Date();
  const bookings = await getRecentPastBookings(now);

  if (bookings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
        Tidak ada rapat dalam 30 hari terakhir.
      </p>
    );
  }

  return (
    <ul aria-labelledby="past-heading" className="space-y-3">
      {bookings.map((b) => (
        <li key={b.id}>
          {/* Whole card is the link; text stays plain */}
          <Link
            href={`/rapat/${b.id}`}
            className="group block rounded-xl border border-zinc-200 bg-white p-4 hover:border-primary/30 hover:bg-primary/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-primary">
                <time dateTime={b.startsAt.toISOString()}>{formatDateLabel(b.startsAt)}</time>
              </p>
              <p className="flex items-center gap-2 text-sm tabular-nums text-zinc-700">
                <StatusBadge
                  startsAt={b.startsAt.toISOString()}
                  endsAt={b.endsAt.toISOString()}
                  initialStatus={getBookingStatus(b.startsAt, b.endsAt, now)}
                />
                {formatTimeRange(b.startsAt, b.endsAt)}
              </p>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{b.bookerName}</span>
              <span aria-hidden="true"> · </span>
              {b.division}
            </p>
            <p className="mt-2 line-clamp-2 break-words text-sm text-zinc-700">{b.agenda}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-secondary/40 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
                {b.attendeeCount} hadir
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                Daftar hadir
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path
                    fillRule="evenodd"
                    d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PastListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Memuat rapat sebelumnya" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-xl border border-zinc-200 bg-white p-4 motion-safe:animate-pulse"
        >
          <div className="h-4 w-40 rounded bg-zinc-200" />
          <div className="mt-3 h-3 w-24 rounded bg-zinc-200" />
          <div className="mt-2 h-3 w-full rounded bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}
