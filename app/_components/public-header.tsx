import Image from 'next/image';

// Header for public attendance pages: no admin controls, no internal links.
export function PublicHeader() {
  return (
    <header className="mb-6 flex items-center gap-3 border-b-2 border-secondary pb-4 sm:mb-8">
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
        <p className="text-base leading-tight font-semibold tracking-tight text-balance text-primary sm:text-lg">
          Kementerian Pariwisata Republik Indonesia
        </p>
        <p className="mt-0.5 text-xs text-zinc-600 sm:text-sm">Daftar Hadir Rapat</p>
      </div>
    </header>
  );
}
