import Link from "next/link";

export function TopNav() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-3 sm:px-6 sm:pt-4">
      <Link
        href="/"
        className="focus-ring pointer-events-auto flex items-baseline gap-2 rounded-md text-sm font-medium tracking-tight text-ink"
      >
        <span>Trend Detective</span>
        <span className="text-muted">/ Spain</span>
      </Link>
      <nav aria-label="Primary" className="pointer-events-auto flex items-center gap-1 text-xs">
        <Link href="/" className="focus-ring rounded-md px-2.5 py-1.5 text-muted transition-colors hover:text-ink">
          About
        </Link>
        <span aria-current="page" className="rounded-md bg-white/8 px-2.5 py-1.5 text-ink">
          Explore
        </span>
      </nav>
    </header>
  );
}
