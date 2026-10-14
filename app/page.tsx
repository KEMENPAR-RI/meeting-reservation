import { Suspense } from 'react';
import { BookingForm } from './_components/booking-form';
import { BookingList } from './_components/booking-list';
import { SiteHeader } from './_components/site-header';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 font-sans sm:px-6 lg:py-14">
      <SiteHeader />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        {/* Focal point: the form */}
        <section
          aria-labelledby="form-heading"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-8"
        >
          <h2 id="form-heading" className="mb-5 text-lg font-semibold text-primary">
            Buat Booking
          </h2>
          <BookingForm />
        </section>

        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="mb-4 text-lg font-semibold text-primary">
            Booking Mendatang
          </h2>
          <Suspense fallback={<BookingListSkeleton />}>
            <BookingList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

function BookingListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Memuat daftar booking" className="space-y-3">
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
