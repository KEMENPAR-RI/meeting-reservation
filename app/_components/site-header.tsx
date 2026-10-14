import { Suspense } from 'react';
import Image from 'next/image';
import { AdminControls, AdminControlsFallback } from './admin-controls';

// Static shell; only AdminControls reads the cookie (inside Suspense).
export function SiteHeader() {
  // Mobile: description spans row 2. sm+: logo | title over description | controls.
  return (
    <header className="mb-8 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b-2 border-secondary pb-4 sm:items-center sm:gap-y-0">
      <Image
        src="/images/logo.webp"
        width={48}
        height={48}
        alt=""
        unoptimized
        loading="eager"
        className="size-10 shrink-0 sm:row-span-2 sm:size-12"
      />
      <h1 className="min-w-0 text-lg leading-tight font-semibold tracking-tight break-words text-balance text-primary sm:text-3xl sm:leading-9 sm:text-wrap">
        Kementerian Pariwisata Republik Indonesia
      </h1>
      <div className="sm:row-span-2 sm:ml-1">
        <Suspense fallback={<AdminControlsFallback />}>
          <AdminControls />
        </Suspense>
      </div>
      <p className="col-span-3 mt-1 text-xs text-pretty text-zinc-600 sm:col-span-1 sm:col-start-2 sm:text-sm sm:text-wrap">
        Booking ruang rapat secara online untuk mempermudah proses reservasi dan mengurangi antrian di lokasi.
      </p>
    </header>
  );
}
