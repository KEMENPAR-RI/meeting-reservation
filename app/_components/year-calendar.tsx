'use client';

import { useMemo } from 'react';
import type { LogDay } from '@/lib/booking/log';
import { formatDateLabel, toInstant } from '@/lib/booking/time';

type Props = { year: number; days: LogDay[]; onPickDay: (dateKey: string) => void };

// Monday-first, as on Indonesian office calendars.
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// UTC math on calendar dates only: no timezone involved.
const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' });

const pad = (n: number) => String(n).padStart(2, '0');

export function YearCalendar({ year, days, onPickDay }: Props) {
  const counts = useMemo(() => new Map(days.map((d) => [d.dateKey, d.count])), [days]);

  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => (
        <li key={month}>
          <MonthGrid year={year} month={month} counts={counts} onPickDay={onPickDay} />
        </li>
      ))}
    </ol>
  );
}

function MonthGrid({
  year,
  month,
  counts,
  onPickDay,
}: {
  year: number;
  month: number;
  counts: Map<string, number>;
  onPickDay: (dateKey: string) => void;
}) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const prefix = `${year}-${pad(month + 1)}-`;
  const label = monthFormatter.format(first);

  let monthTotal = 0;
  for (let d = 1; d <= length; d++) monthTotal += counts.get(prefix + pad(d)) ?? 0;

  const headingId = `month-${year}-${month}`;

  return (
    <section
      aria-labelledby={headingId}
      className={`h-full rounded-xl border bg-white p-3 sm:p-4 ${
        monthTotal > 0 ? 'border-zinc-200 shadow-sm' : 'border-zinc-200/70'
      }`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h4
          id={headingId}
          className={`text-sm font-semibold capitalize ${monthTotal > 0 ? 'text-primary' : 'text-zinc-500'}`}
        >
          {label}
        </h4>
        <span className={`text-xs tabular-nums ${monthTotal > 0 ? 'text-zinc-600' : 'text-zinc-400'}`}>
          {monthTotal > 0 ? `${monthTotal} reservasi` : '–'}
        </span>
      </div>

      <div aria-hidden="true" className="grid grid-cols-7 text-center text-[0.6875rem] font-medium text-zinc-400">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 6 ? 'text-red-400' : undefined}>
            {w}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {offset > 0 && <span aria-hidden="true" style={{ gridColumn: `span ${offset}` }} />}
        {Array.from({ length }, (_, i) => {
          const day = i + 1;
          const dateKey = prefix + pad(day);
          const count = counts.get(dateKey) ?? 0;

          // Days without bookings are plain text: never focusable or clickable.
          if (count === 0) {
            return (
              <span
                key={day}
                className="flex aspect-square items-center justify-center text-xs text-zinc-400 tabular-nums"
              >
                {day}
              </span>
            );
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => onPickDay(dateKey)}
              aria-label={`${formatDateLabel(toInstant(dateKey, '00:00'))}, ${count} reservasi`}
              className="relative flex aspect-square items-center justify-center rounded-lg bg-primary text-xs font-semibold text-white tabular-nums shadow-sm hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
            >
              {day}
              {count > 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[0.625rem] leading-none font-bold text-primary ring-2 ring-white"
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
