import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-xs tracking-[0.2em] text-muted uppercase">NASA Space Apps 2026 · Málaga</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Earth System Trend Detective — Spain
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Explore what changed in Spain&apos;s environment — where, when and how much — using NASA Earth
        observation data, with the source of every result one click away.
      </p>
      <div className="mt-8">
        <Link
          href="/explore"
          className="focus-ring inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition hover:brightness-110"
        >
          Open the globe
        </Link>
      </div>
    </main>
  );
}
