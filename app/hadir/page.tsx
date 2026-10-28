import { Suspense } from 'react';
import type { Metadata } from 'next';
import { io } from 'next/cache';
import { resolveHadirLanding } from '@/lib/booking/public-attendance';
import { PublicHeader } from '../_components/public-header';
import {
  PublicAttendanceSkeleton,
  PublicAttendanceView,
  PublicNotice,
} from '../_components/public-attendance-view';

export const metadata: Metadata = {
  title: 'Daftar Hadir Rapat',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// Static QR landing; the branch is resolved per request inside Suspense.
export default function HadirLandingPage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 font-sans sm:py-10">
      <PublicHeader />
      <Suspense fallback={<PublicAttendanceSkeleton />}>
        <HadirLanding />
      </Suspense>
    </main>
  );
}

async function HadirLanding() {
  // Must precede `new Date()` under Cache Components.
  await io();
  const landing = await resolveHadirLanding(new Date());

  if (landing.kind === 'open') {
    return <PublicAttendanceView meeting={landing.meeting} token={landing.token} now={new Date()} />;
  }
  return <PublicNotice kind="none" />;
}
