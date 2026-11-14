import Link from "next/link";
import { BrandLogoMark } from "@/components/BrandLogo";
import { ENERGY_CONCEPTS } from "@/lib/globe/energy-tech";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center px-6 py-14">
      <div className="mb-5 flex items-center gap-3.5">
        <BrandLogoMark size={52} className="drop-shadow-[0_8px_24px_rgba(124,196,255,0.18)]" />
        <div>
          <p className="text-xs tracking-[0.2em] text-muted uppercase">NASA Space Apps 2026 · Málaga</p>
          <p className="mt-0.5 font-mono text-[11px] text-accent">
            Earth Observation · Energy Technology Suitability &amp; Climate Trends (2000–2030)
          </p>
        </div>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Earth System Trend Detective — Spain
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        ¿Qué regiones, cuencas y embalses de España están ganando o perdiendo ventajas ambientales para distintas
        tecnologías energéticas, y qué cambios podemos demostrar científicamente con datos de observación terrestre de
        la NASA, SWOT y NOAA?
      </p>

      {/* Energy Technology Suitability Lab Launchers */}
      <section className="mt-7 rounded-2xl border border-accent/25 bg-accent/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-accent uppercase">
              ⚡ Laboratorio de Idoneidad Energética · 7 Conceptos Cruzados (2000–2030)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Selecciona una tecnología energética para cruzar variables satelitales y series temporales (GPM IMERG,
              GLDAS-2.1 0.25°, MERRA-2, MODIS NDVI, SWOT L2 LakeSP y NOAA GHCN-Daily) e identificar sitios ideales:
            </p>
          </div>
          <Link
            href="/explore?mode=energy"
            className="focus-ring shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-ink transition hover:brightness-110"
          >
            Abrir Energy Tech Lab →
          </Link>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ENERGY_CONCEPTS.map((c) => (
            <Link
              key={c.id}
              href={`/explore?concept=${c.id}`}
              className="focus-ring group flex flex-col justify-between rounded-xl border border-line bg-black/35 p-3 transition hover:border-accent/50 hover:bg-white/[0.05]"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold text-ink group-hover:text-accent">
                    {c.shortTitle}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                      c.coverageBadge.startsWith("100%")
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-sky-500/15 text-sky-300"
                    }`}
                  >
                    {c.coverageBadge.startsWith("100%") ? "100% Direct" : "Direct + Proxy"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-ink/90">{c.questionEs}</p>
              </div>
              <div className="mt-2.5 border-t border-white/8 pt-1.5">
                <p className="font-mono text-[9.5px] text-muted">
                  <strong className="text-ink/80">Cruza:</strong>{" "}
                  {c.variablesCrossed.slice(0, 3).map((v) => v.label).join(" · ")}
                </p>
                <p className="mt-0.5 text-[10px] text-emerald-300/90">→ {c.opportunity}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Multi-tier Public Administration (B2G) Value Proposition & Direct Scope Launchers */}
      <section className="mt-5 rounded-2xl border border-line bg-white/4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
            Acotación Multinivel para Administraciones Públicas (B2G)
          </h2>
          <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] text-amber-200">
            52 Provincias · 19 CCAA · 8 Cuencas · 48 Embalses SWOT
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Plataforma adaptable tanto para la <strong>Administración General del Estado (AGE)</strong> como acotada a
          cualquier <strong>Comunidad Autónoma</strong> o <strong>Provincia (Diputación / Cabildo)</strong>, con recorte
          geográfico de mapas y matriz de decisiones 2030 por competencias:
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link
            href="/explore?scope=age"
            className="focus-ring group rounded-xl border border-line bg-black/30 p-3 transition hover:border-amber-400/50 hover:bg-white/6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink group-hover:text-amber-200">
                1. Estado (AGE)
              </span>
              <span className="font-mono text-[10px] text-accent">España →</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              MITECO, D.G. del Agua, AEMET y PNIEC 2030. Visión de las 8 demarcaciones y 175 estaciones.
            </p>
          </Link>
          <Link
            href="/explore?scope=ccaa&id=ES61"
            className="focus-ring group rounded-xl border border-line bg-black/30 p-3 transition hover:border-amber-400/50 hover:bg-white/6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink group-hover:text-amber-200">
                2. CCAA (19)
              </span>
              <span className="font-mono text-[10px] text-accent">Autonomías →</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              Consejerías de Medio Ambiente, Agua, Agricultura e Incendios. Recorte exacto NUTS-2.
            </p>
          </Link>
          <Link
            href="/explore?scope=provincia&id=29"
            className="focus-ring group rounded-xl border border-line bg-black/30 p-3 transition hover:border-amber-400/50 hover:bg-white/6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink group-hover:text-amber-200">
                3. Provincia (52)
              </span>
              <span className="font-mono text-[10px] text-accent">Diputaciones →</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              Diputaciones Provinciales, Cabildos y Consells. Consorcios provinciales de aguas y bomberos.
            </p>
          </Link>
        </div>
      </section>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href="/explore?mode=energy"
          className="focus-ring inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition hover:brightness-110"
        >
          Open Energy Tech Lab on 3D Globe
        </Link>
        <Link
          href="/explore?mode=climate"
          className="focus-ring inline-flex rounded-full border border-line bg-white/5 px-4 py-2.5 text-xs font-medium text-ink transition hover:bg-white/10"
        >
          Open Climate Layers Mode
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
