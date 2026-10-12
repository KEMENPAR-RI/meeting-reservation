'use client';

import { useState } from 'react';
import type { EditableBooking } from '@/lib/booking/types';
import { EditBookingDialog } from './edit-booking-dialog';

export function EditBookingButton({ booking }: { booking: EditableBooking }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-primary/30 bg-white px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
      >
        Edit
      </button>
      {/* Mounted on demand: one form in the DOM, fresh action state per open. */}
      {open && <EditBookingDialog booking={booking} onClose={() => setOpen(false)} />}
    </>
  );
}
