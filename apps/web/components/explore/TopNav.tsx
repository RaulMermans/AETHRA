import type { ReactNode } from "react";
import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";
import { BRAND_NAME } from "@/lib/brand";

export function TopNav({ center }: { center?: ReactNode }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-3 sm:px-6 sm:pt-4">
      <Link
        href="/explore"
        aria-label={`${BRAND_NAME} home`}
        className="focus-ring pointer-events-auto flex w-fit max-w-full items-center rounded-md border border-line bg-atlantic/70 px-2.5 py-1.5 backdrop-blur-md transition hover:border-nav/50 hover:bg-atlantic/90"
      >
        <BrandWordmark />
      </Link>
      <div className="pointer-events-auto justify-self-center">{center}</div>
    </header>
  );
}
