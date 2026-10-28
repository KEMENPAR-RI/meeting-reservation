import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { io } from 'next/cache';
import { checkOfficeAccess } from '@/lib/office-access';
import { getPublicMeetingByToken } from '@/lib/booking/public-attendance';
import { isBookingId } from '@/lib/booking/validation';
import { PublicHeader } from '../../_components/public-header';
import {
  PublicAttendanceSkeleton,
  PublicAttendanceView,
  PublicNotice,
} from '../../_components/public-attendance-view';

export const metadata: Metadata = {
  title: 'Daftar Hadir Rapat',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type Params = Promise<{ token: string }>;

export default function HadirTokenPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 font-sans sm:py-10">
      <PublicHeader />
      <Suspense fallback={<PublicAttendanceSkeleton />}>
        <HadirToken params={params} />
      </Suspense>
    </main>
  );
}

async function HadirToken({ params }: { params: Params }) {
  const { token } = await params;

  // Old /hadir/<uuid> bookmarks: office only; outside gets the generic invalid card (AC14).
  if (isBookingId(token)) {
    if (checkOfficeAccess(await headers()).allowed) redirect(`/rapat/${token}`);
    return <PublicNotice kind="invalid" />;
  }

  // Must precede `new Date()` under Cache Components.
  await io();
  const now = new Date();
  const result = await getPublicMeetingByToken(token, now);

  if (result.kind === 'open') return <PublicAttendanceView meeting={result.meeting} token={token} now={now} />;
  return <PublicNotice kind={result.kind} />;
}
