import { Suspense } from 'react';
import Image from 'next/image';
import { AdminControls, AdminControlsFallback } from './admin-controls';

// Static shell; only AdminControls reads the cookie (inside Suspense).
export function SiteHeader() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4 border-b-2 border-secondary pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/images/logo.webp"
          width={48}
          height={48}
          alt=""
          unoptimized
          loading="eager"
          className="size-10 shrink-0 sm:size-12"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Kementerian Pariwisata Republik Indonesia
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Booking ruang rapat secara online untuk mempermudah proses reservasi dan mengurangi antrian di lokasi.
          </p>
        </div>
      </div>
      <Suspense fallback={<AdminControlsFallback />}>
        <AdminControls />
      </Suspense>
    </header>
  );
}
