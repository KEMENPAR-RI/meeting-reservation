'use client';

import { useActionState } from 'react';
import { createBooking } from '@/app/actions/booking';
import { initialBookingFormState } from '@/lib/booking/types';
import { BookingFields } from './booking-fields';

export function BookingForm() {
  const [state, formAction, pending] = useActionState(createBooking, initialBookingFormState);

  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.status !== 'idle' && state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          className={
            state.status === 'error'
              ? 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'
              : 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
          }
        >
          {state.message}
        </p>
      )}

      <BookingFields idPrefix="" values={values} errors={errors} />

      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors"
      >
        {pending ? 'Menyimpan…' : 'Simpan Booking'}
      </button>
    </form>
  );
}
