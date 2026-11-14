import { BRAND_DESCRIPTOR, BRAND_MISSION, BRAND_NAME } from "@/lib/brand";

/** Temporary typographic wordmark. Final logo is deferred (D55). */
export function BrandWordmark() {
  return (
    <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[13px] font-medium tracking-[0.2em] text-ink sm:text-sm">{BRAND_NAME}</span>
        <span className="mt-1 hidden text-[8px] tracking-[0.22em] text-nav uppercase sm:block">{BRAND_DESCRIPTOR}</span>
      </span>
      <span className="hidden h-6 w-px bg-nav/35 sm:block" aria-hidden />
      <span className="hidden font-mono text-[9px] tracking-[0.14em] text-faint tabular-nums sm:inline">{BRAND_MISSION}</span>
    </span>
  );
}
