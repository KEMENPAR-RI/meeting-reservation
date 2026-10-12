'use client';

import { useActionState, useRef, useState } from 'react';
import { loginAdmin } from '@/app/actions/auth';
import { ADMIN_PASSWORD_MAX, initialLoginState } from '@/lib/auth/types';

const triggerClass =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-white px-3 text-sm font-medium text-primary ' +
  'hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors';

export function LoginDialog() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialLoginState);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Hides a stale error after reopening; set again on each submit.
  const [showError, setShowError] = useState(false);
  const hasError = showError && state.status === 'error';

  // Imperative open: native modal gives Esc + focus trap; focus set here, not in an Effect.
  const open = () => {
    setShowError(false);
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" onClick={open} className={triggerClass}>
        Login
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="login-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-lg backdrop:bg-primary/40 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="login-title" className="text-lg font-semibold text-primary">
            Login Admin
          </h2>
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

        <form action={formAction} onSubmit={() => setShowError(true)} className="space-y-4">
          {hasError && state.message && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {state.message}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-sm font-medium text-zinc-800">
              Password
            </label>
            <input
              ref={inputRef}
              id="admin-password"
              name="password"
              type="password"
              required
              maxLength={ADMIN_PASSWORD_MAX}
              autoComplete="current-password"
              autoFocus
              aria-invalid={hasError ? true : undefined}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 aria-invalid:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors"
          >
            {pending ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
      </dialog>
    </>
  );
}
