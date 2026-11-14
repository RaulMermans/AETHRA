import Link from "next/link";
import { BrandLogoMark } from "@/components/BrandLogo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-5 flex items-center gap-3.5">
        <BrandLogoMark size={52} className="drop-shadow-[0_8px_24px_rgba(124,196,255,0.18)]" />
        <div>
          <p className="text-xs tracking-[0.2em] text-muted uppercase">NASA Space Apps 2026 · Málaga</p>
          <p className="mt-0.5 font-mono text-[11px] text-accent">
            Earth Observation · Hydro, Wind &amp; Thermal Energy Trends (2000–2030)
          </p>
        </div>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Earth System Trend Detective — Spain
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Explore what changed in Spain&apos;s environment and clean-energy resources — where, when and how much —
        using NASA Earth observation data, with 2030 Sen&apos;s slope projections and the source of every result one
        click away.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/explore"
          className="focus-ring inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition hover:brightness-110"
        >
          Open the globe
        </Link>
        <a
          href="/logo.svg"
          target="_blank"
          rel="noreferrer"
          className="focus-ring inline-flex rounded-full border border-line bg-white/5 px-4 py-2.5 text-xs font-medium text-muted transition hover:bg-white/10 hover:text-ink"
        >
          View Challenge Logo (SVG)
        </a>
      </div>
    </main>
  );
}
