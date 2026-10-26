import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { io } from 'next/cache';
import { isAdmin } from '@/lib/auth/session';
import {
  buildLogData,
  LOG_MAX_ROWS,
  parseLogFilters,
  resolveRange,
  type LogFilters,
} from '@/lib/booking/log';
import { getDistinctDivisions, getLogBookings } from '@/lib/booking/queries';
import { ExportButtons } from '../_components/export-buttons';
import { LogFilterBar } from '../_components/log-filter-bar';
import { LogView } from '../_components/log-view';
import { SiteHeader } from '../_components/site-header';

export const metadata: Metadata = { title: 'Log Reservasi - Booking Ruang Rapat' };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Static shell; cookie + searchParams are read inside Suspense.
export default function LogPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 font-sans sm:px-6 lg:py-14">
      <SiteHeader />
      <Suspense fallback={<LogSkeleton />}>
        <LogContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LogContent({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isAdmin())) return <AccessDenied />;

  // Must precede the default-year clock read under Cache Components.
  await io();
  const filters = parseLogFilters(await searchParams);
  const range = resolveRange(filters);
  const [{ rows, truncated }, divisions] = await Promise.all([
    getLogBookings(range, {
      division: filters.division,
      bookerName: filters.bookerName,
    }),
    getDistinctDivisions(range),
  ]);
  // Over the cap: send no rows to the client.
  const data = buildLogData(truncated ? [] : rows, filters, divisions);
  const query = toQueryString(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BackLink />
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">Log Reservasi</h2>
        </div>
        <ExportButtons searchParams={query} disabled={truncated} />
      </div>

      <LogFilterBar value={filters} divisions={data.divisions} />

      {truncated ? (
        <p
          role="status"
          className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500"
        >
          Data terlalu banyak (lebih dari {LOG_MAX_ROWS} reservasi). Persempit filter untuk
          menampilkan log.
        </p>
      ) : (
        /* key: switching filters/year resets the open day */
        <LogView
          key={query}
          data={data}
          filtered={Boolean(filters.division || filters.dateStart || filters.dateEnd || filters.bookerName)}
        />
      )}
    </div>
  );
}

// Normalized filters only; also used for export links.
function toQueryString(f: LogFilters): string {
  const qs = new URLSearchParams({ year: String(f.year) });
  if (f.division) qs.set('division', f.division);
  if (f.dateStart) qs.set('dateStart', f.dateStart);
  if (f.dateEnd) qs.set('dateEnd', f.dateEnd);
  if (f.bookerName) qs.set('bookerName', f.bookerName);
  return qs.toString();
}

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1 rounded text-sm font-medium text-zinc-600 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
        <path
          fillRule="evenodd"
          d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
          clipRule="evenodd"
        />
      </svg>
      Kembali ke booking
    </Link>
  );
}

function AccessDenied() {
  return (
    <section
      aria-labelledby="denied-heading"
      className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-8"
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary/40 text-primary">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-6">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 id="denied-heading" className="mt-4 text-lg font-semibold text-primary">
        Khusus Admin
      </h2>
      <p className="mt-2 text-sm text-pretty text-zinc-600">
        Log reservasi hanya dapat diakses oleh admin. Silakan login melalui tombol{' '}
        <span className="font-medium text-zinc-800">Login</span> di kanan atas.
      </p>
      <div className="mt-5">
        <BackLink />
      </div>
    </section>
  );
}

function LogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat log reservasi" className="space-y-6">
      <div className="h-8 w-48 rounded bg-zinc-200 motion-safe:animate-pulse" />
      <div className="h-24 rounded-2xl border border-zinc-200 bg-white motion-safe:animate-pulse" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="h-64 rounded-xl border border-zinc-200 bg-white motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
