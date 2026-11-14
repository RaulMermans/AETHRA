import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogoMark } from "@/components/BrandLogo";

export function TopNav({ center }: { center?: ReactNode }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-3 sm:px-6 sm:pt-4">
      <Link
        href="/explore"
        className="focus-ring pointer-events-auto flex w-fit items-center gap-2.5 rounded-lg bg-black/35 px-2.5 py-1.5 text-sm font-medium tracking-tight text-ink backdrop-blur-md transition hover:bg-black/50"
      >
        <BrandLogoMark size={26} />
        <span className="flex items-baseline gap-1.5">
          <span>Trend Detective</span>
          <span className="text-muted">/ Spain</span>
        </span>
      </Link>
      <div className="pointer-events-auto justify-self-center">{center}</div>
    </header>
  );
}
