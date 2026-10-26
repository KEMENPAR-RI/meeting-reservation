'use client';

import { useCallback, useRef } from 'react';
import type { LogDay } from '@/lib/booking/log';
import { APP_TZ_LABEL, formatDateLabel, toInstant } from '@/lib/booking/time';

type Props = { day: LogDay | null; onClose: () => void };

export function DayDetailDialog({ day, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const openDialog = useCallback((el: HTMLDialogElement | null) => {
    dialogRef.current = el;
    if (el && !el.open) el.showModal();
  }, []);

  // close() restores focus to the day button; the `close` event then unmounts us.
  const close = () => dialogRef.current?.close();

  if (!day) return null;

  const entries = [...day.entries].sort((a, b) => a.startISO.localeCompare(b.startISO));

  return (
    <dialog
      ref={openDialog}
      onClose={onClose}
      aria-labelledby="day-detail-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 text-left text-zinc-900 shadow-lg backdrop:bg-primary/40 sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="day-detail-title" className="text-lg font-semibold text-primary">
            {formatDateLabel(toInstant(day.dateKey, '00:00'))}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">{day.count} reservasi</p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Tutup"
          className="-m-1 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
          Tidak ada reservasi pada tanggal ini
        </p>
      ) : (
        <ol className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-zinc-200 border-l-4 border-l-secondary p-4">
              <p className="text-sm font-semibold text-primary tabular-nums">
                <time dateTime={e.startISO}>{e.startLabel}</time>–
                <time dateTime={e.endISO}>{e.endLabel}</time> {APP_TZ_LABEL}
              </p>
              <p className="mt-1.5 text-sm text-zinc-600">
                <span className="font-medium text-zinc-800">{e.bookerName}</span>
                <span aria-hidden="true"> · </span>
                {e.division}
              </p>
              {/* Plain text only; line breaks kept via CSS */}
              <p className="mt-2 whitespace-pre-line break-words text-sm text-zinc-700">{e.agenda}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={close}
          className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors sm:w-auto"
        >
          Tutup
        </button>
      </div>
    </dialog>
  );
}
