'use client';

import { useCallback, useId, useRef, useState, useTransition } from 'react';
import { resetAllBookings } from '@/app/actions/log';
import { RESET_CONFIRMATION } from '@/lib/booking/types';

export function ResetLogButton() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          setNotice(null);
          setOpen(true);
        }}
        aria-label="Reset data: hapus semua data reservasi"
        aria-haspopup="dialog"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 motion-safe:transition-colors"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path
            fillRule="evenodd"
            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
            clipRule="evenodd"
          />
        </svg>
        Reset data
      </button>
      <p role="status" className="text-xs text-zinc-600 empty:hidden">
        {notice}
      </p>
      {/* Mounted on demand, like EditBookingDialog. */}
      {open && (
        <ResetLogDialog
          onClose={() => setOpen(false)}
          onDone={(count) => setNotice(`${count} data dihapus`)}
        />
      )}
    </div>
  );
}

function ResetLogDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (count: number) => void;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = value === RESET_CONFIRMATION;

  // Child refs attach before the parent ref callback runs.
  const openDialog = useCallback((el: HTMLDialogElement | null) => {
    dialogRef.current = el;
    if (!el || el.open) return;
    el.showModal();
    inputRef.current?.focus();
  }, []);

  // close() restores focus to the trigger; the `close` event then unmounts us.
  const close = () => dialogRef.current?.close();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!matches || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await resetAllBookings(value);
        if (!result.ok) {
          setError(result.message ?? 'Gagal mereset data.');
          return;
        }
        onDone(result.count ?? 0);
        dialogRef.current?.close();
      } catch {
        setError('Gagal mereset data. Silakan coba lagi.');
      }
    });
  };

  return (
    <dialog
      ref={openDialog}
      onClose={onClose}
      onCancel={(e) => {
        // Keep open while deleting so the result isn't lost.
        if (pending) e.preventDefault();
      }}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-warning`}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 text-left text-zinc-900 shadow-lg backdrop:bg-primary/40 sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-primary">
          Reset data reservasi
        </h2>
        <button
          type="button"
          onClick={close}
          disabled={pending}
          aria-label="Tutup"
          className="-m-1 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div
        id={`${id}-warning`}
        className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-5 shrink-0 text-red-600">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
        <p>
          Semua data reservasi akan dihapus permanen,{' '}
          <strong className="font-semibold">TERMASUK jadwal yang akan datang</strong>. Ekspor data
          terlebih dahulu bila perlu.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5">
        <label htmlFor={`${id}-input`} className="block text-sm font-medium text-zinc-800">
          Ketik <span className="font-mono font-semibold text-red-700">{RESET_CONFIRMATION}</span> untuk
          konfirmasi
        </label>
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={pending}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-red-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-red-500/40 read-only:opacity-60"
        />

        {error && (
          <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!matches || pending}
            aria-label={pending ? 'Menghapus semua data reservasi' : 'Hapus semua data reservasi secara permanen'}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600 motion-safe:transition-colors"
          >
            {pending ? 'Menghapus…' : 'Hapus semua data'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
