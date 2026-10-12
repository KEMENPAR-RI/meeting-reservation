'use client';

import { useEffect, useState } from 'react';
import { getBookingStatus, type BookingStatus } from '@/lib/booking/time';

const TICK_MS = 30_000;

const LABELS: Record<BookingStatus, string> = {
  upcoming: 'Akan datang',
  ongoing: 'Berlangsung',
  done: 'Selesai',
};

const STYLES: Record<BookingStatus, string> = {
  upcoming: 'border-primary text-primary',
  ongoing: 'border-transparent bg-secondary text-primary',
  done: 'border-transparent bg-slate-100 text-slate-500',
};

type Props = { startsAt: string; endsAt: string; initialStatus: BookingStatus };

export function StatusBadge({ startsAt, endsAt, initialStatus }: Props) {
  // Server value first; the clock is read only inside the interval.
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (status === 'done') return; // final state
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const tick = () => setStatus(getBookingStatus(start, end, new Date()));
    // Immediate check covers stale renders (e.g. tab restore), then every 30s.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [startsAt, endsAt, status]);

  return (
    <span
      data-status={status}
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
