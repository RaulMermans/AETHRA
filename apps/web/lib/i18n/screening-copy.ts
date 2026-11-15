import type { PvCell, PvVerdict, SolarPlant } from "@/lib/globe/pv-screening";
import type { Locale } from "./messages";

/**
 * Plain-language copy for the solar PV screening view (EN + ES). Numbers are the pipeline's values,
 * only formatted here; wording depends on the stored significance flags, never on browser maths.
 */

function fmt(locale: Locale, v: number, digits = 1, signed = false): string {
  const s = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(v);
  return s.replace("-", "−");
}

function fmtP(locale: Locale, p: number | null): string {
  if (p === null || !Number.isFinite(p)) return "—";
  if (p < 0.001) return "< 0.001".replace(".", locale === "es" ? "," : ".");
  return fmt(locale, p, p < 0.01 ? 3 : 2);
}

export type Bullet = { icon: "sun" | "trend" | "heat" | "leaf"; text: string };

export interface ScreeningCopy {
  entry: string;
  entryShort: string;
  title: string;
  exploratory: string;
  exploratoryHint: string;
  technology: string;
  techSolar: string;
  techHydro: string;
  techWind: string;
  comingSoon: string;
  layersHeading: string;
  toggleCells: string;
  toggleCellsHint: string;
  toggleMiteco: string;
  toggleMitecoHint: string;
  togglePlants: string;
  togglePlantsHint: string;
  legendGood: string;
  legendMixed: string;
  legendAvoid: string;
  legendNote: string;
  markerHeading: string;
  markerOperating: string;
  markerConstruction: string;
  markerLandmark: string;
  markerOther: string;
  featuredHeading: string;
  featuredSunLabel: string;
  featuredSunUnit: string;
  featuredCenter: string;
  placeReferenceHeading: string;
  placeReferenceNote: string;
  placeSource: string;
  featuredEnvLabel: string;
  featuredSunMeaning: string;
  featuredEnvMeaning: string;
  checkSeparately: string;
  featuredNarrative: (place: string, moreSun: number, moreLand: number, both: number, total: number) => string;
  featuredAction: string;
  featuredLimit: string;
  environmentalMeaning: string;
  dustHeading: string;
  dustMeaning: (meanAot: string, years: number) => string;
  dustSource: string;
  dustUnavailable: string;
  historyHeading: string;
  historyNationalHeading: string;
  historyFinding: (firstYear: number, firstCount: number, lastYear: number, lastCount: number) => string;
  historyHowToRead: string;
  historyTableYear: string;
  historyTableAdded: string;
  historyTableCumulative: string;
  historyIntro: (operating: number, known: number, unknown: number) => string;
  historyFeatured: (count: number, assumed: number) => string;
  historyExplicit: string;
  historyAssumed: string;
  historyLimit: string;
  historyOutcome: string;
  historyOutcomeMeaning: string;
  loading: string;
  notAvailable: string;
  notAvailableHint: string;
  plantsMissing: string;
  mitecoMissing: string;
  summaryGood: (n: number, where?: string) => string;
  summaryRest: (mixed: number, avoid: number) => string;
  summaryMw: (goodPct: number, avoidPct: number | undefined) => string;
  summaryBasis: (from: number, to: number) => string;
  clickHint: string;
  verdictTitle: Record<PvVerdict, string>;
  verdictSentence: Record<PvVerdict, string>;
  meansHeading: string;
  means: Record<PvVerdict, string>;
  cannotHeading: string;
  cannot: string;
  bullets: (c: PvCell) => Bullet[];
  details: string;
  detailRows: (c: PvCell, period: [number, number]) => { label: string; value: string }[];
  method: string;
  sources: string;
  cellLabel: (c: PvCell) => string;
  back: string;
  close: string;
  plantStatus: (s: string) => string;
  plantTech: (t: string) => string;
  plantDetail: (p: SolarPlant) => string;
  plantCapacity: string;
  plantStatusLabel: string;
  plantMiteco: string;
  plantMitecoUnknown: string;
  plantNote: string;
  mitecoClass: (v: number) => string;
  plantsInCell: (n: number, mw: number) => string;
}

const MITECO_EN = ["Maximum (not recommended)", "Very high (strong constraints)", "High (notable constraints)", "Moderate (some constraints)", "Low (fewest constraints)"];
const MITECO_ES = ["Máxima (no recomendada)", "Muy alta (fuertes restricciones)", "Alta (restricciones notables)", "Moderada (algunas restricciones)", "Baja (menos restricciones)"];

function sunBullet(locale: Locale, c: PvCell): Bullet | null {
  const p = c.irr_resource_percentile;
  const kwh = c.irr_mean_kwh_m2_day;
  if (p === null || kwh === null) return null;
  const val = `${fmt(locale, kwh, 1)} kWh/m²`;
  const es = locale === "es";
  let text: string;
  if (p >= 50) {
    const top = Math.max(1, Math.round(100 - p));
    text = es
      ? `Entre el ${top} % de zonas más soleadas de España (${val} al día de energía solar por metro cuadrado): más sol = más producción`
      : `Among the sunniest ${top}% of Spain (${val} per day of solar energy per square metre): more sun = more output`;
  } else if (p < 25) {
    const bottom = Math.max(1, Math.round(p));
    text = es
      ? `Entre el ${bottom} % de zonas con menos sol de España (${val} al día por metro cuadrado): producirá menos que el sur`
      : `Among the least sunny ${bottom}% of Spain (${val} per day per square metre): expect lower output than the south`;
  } else {
    text = es ? `Sol algo por debajo de la media española (${val} al día por metro cuadrado): viable, pero hay zonas mejores` : `Sunshine a bit below the Spanish middle (${val} per day per square metre): workable, but better zones exist`;
  }
  return { icon: "sun", text };
}

function trendBullet(locale: Locale, c: PvCell): Bullet {
  const es = locale === "es";
  const t = c.irr_trend_pct_decade;
  if (t === null || c.irr_significant === null) {
    return { icon: "trend", text: es ? "Zona casi toda de mar o fuera de España: usa otra fuente para ella" : "Zone is mostly sea or outside Spain: use another source for it" };
  }
  const v = `${fmt(locale, t, 1, true)} % ${es ? "por década" : "per decade"}`;
  if (c.irr_significant && t > 0)
    return { icon: "trend", text: es ? `El sol sube (comprobado): ${v}, es decir, cuánto cambia cada 10 años. Planifica con la media histórica; la subida es un extra` : `Sunshine is rising (confirmed): ${v}, i.e. how much it changes every 10 years. Plan on the historical average; the rise is a bonus` };
  if (c.irr_significant && t < 0)
    return { icon: "trend", text: es ? `El sol baja (comprobado): ${v}, es decir, cuánto cambia cada 10 años. Resta esa caída en las previsiones de producción` : `Sunshine is falling (confirmed): ${v}, i.e. how much it changes every 10 years. Subtract that fall from yield forecasts` };
  if (t > 0)
    return { icon: "trend", text: es ? `Sol estable: planifica con la media histórica (variación de ${v}, dentro de lo normal entre años)` : `Stable sunshine: plan with the historical average (change of ${v}, within normal year-to-year swings)` };
  if (t < 0)
    return { icon: "trend", text: es ? `Sol estable: planifica con la media histórica (variación de ${v}, dentro de lo normal entre años)` : `Stable sunshine: plan with the historical average (change of ${v}, within normal year-to-year swings)` };
  return { icon: "trend", text: es ? "Sol estable: planifica con la media histórica" : "Stable sunshine: plan with the historical average" };
}

function heatBullet(locale: Locale, c: PvCell): Bullet | null {
  const es = locale === "es";
  const t = c.t_trend_c_decade;
  const pen = c.heat_penalty_pct_decade;
  if (t === null || pen === null) return null;
  const tv = `${fmt(locale, t, 1, true)} °C ${es ? "por década" : "per decade"}`;
  const pv = `${fmt(locale, Math.abs(pen), 1)} %`;
  const proven = c.t_significant === true;
  if (t <= 0) {
    return { icon: "heat", text: es ? `Verano sin subida de temperatura (${tv}, grados que cambian cada 10 años): no hace falta prever pérdida extra de los paneles por calor` : `No summer warming here (${tv}, degrees changed every 10 years): no extra heat loss to budget for the panels` };
  }
  return {
    icon: "heat",
    text: es
      ? `${proven ? `Los veranos se calientan (comprobado): ${tv}, grados que suben cada 10 años` : `Calor de verano: ${tv} (grados cada 10 años), dentro de lo normal entre años aquí`}. Por prudencia, cuenta con que los paneles rindan ≈ ${pv} menos por década por el calor (regla orientativa).`
      : `${proven ? `Summers are warming (confirmed): ${tv}, degrees added every 10 years` : `Summer heat: ${tv} (degrees every 10 years), within normal year-to-year swings here`}. To be safe, budget ≈ ${pv} less panel output per decade from heat (rule of thumb).`,
  };
}

function envBullet(locale: Locale, c: PvCell): Bullet | null {
  const es = locale === "es";
  const v = c.miteco_low_moderate_pct;
  if (v === null || v === undefined) return null;
  const pct = `${Math.round(v)} %`;
  if (v < 30)
    return {
      icon: "leaf",
      text: es
        ? `Solo el ${pct} del suelo tiene sensibilidad ambiental baja o moderada (mapa oficial del MITECO): encontrar parcela será difícil`
        : `Only ${pct} of the land has low or moderate environmental sensitivity (official MITECO map): finding a plot will be hard`,
    };
  return {
    icon: "leaf",
    text: es
      ? `El ${pct} del suelo de esta zona tiene sensibilidad ambiental baja o moderada (mapa oficial del MITECO): hay margen para buscar parcela con pocas trabas ambientales`
      : `${pct} of this zone's land has low or moderate environmental sensitivity (official MITECO map): room to find a plot with few environmental hurdles`,
  };
}

function ci(locale: Locale, a: [number, number] | null, unit: string): string {
  if (!a) return "—";
  return `${fmt(locale, a[0], 2, true)} … ${fmt(locale, a[1], 2, true)} ${unit}`;
}

function detailRows(locale: Locale, c: PvCell, period: [number, number]) {
  const es = locale === "es";
  const n = period[1] - period[0] + 1;
  const yes = es ? "sí" : "yes";
  const no = es ? "no" : "no";
  const num = (v: number | null, d: number, signed = false) => (v === null ? "—" : fmt(locale, v, d, signed));
  return [
    { label: es ? "Zona (~50 km)" : "Zone (~50 km)", value: `${c.id} · ${fmt(locale, c.lat, 2)}°, ${fmt(locale, c.lon, 2)}° · ${es ? "tierra" : "land"} ${Math.round(c.land_fraction * 100)} %` },
    { label: es ? "Periodo" : "Period", value: `${period[0]}–${period[1]} (n = ${n} ${es ? "años" : "years"})` },
    { label: es ? "Sol medio (irradiancia)" : "Average sunshine (irradiance)", value: `${num(c.irr_mean_kwh_m2_day, 2)} kWh/m²/${es ? "día" : "day"} · P${num(c.irr_resource_percentile, 0)}` },
    { label: es ? "Tendencia del sol" : "Sunshine trend", value: `${num(c.irr_trend_pct_decade, 2, true)} %/${es ? "déc" : "dec"} · ${es ? "rango probable (IC95)" : "likely range (CI95)"} ${ci(locale, c.irr_ci_pct_decade, "%")}` },
    { label: es ? "p · p tras control de falsas alarmas (BH)" : "p · p after false-alarm check (BH)", value: `${fmtP(locale, c.irr_p)} · ${fmtP(locale, c.irr_p_bh)} · ${es ? "significativa" : "significant"}: ${c.irr_significant ? yes : no}` },
    { label: es ? "Temperatura verano (jun–ago, T2M)" : "Summer temperature (Jun–Aug, T2M)", value: `${num(c.t_summer_mean_c, 1)} °C` },
    { label: es ? "Tendencia temperatura verano" : "Summer temperature trend", value: `${num(c.t_trend_c_decade, 2, true)} °C/${es ? "déc" : "dec"} · ${es ? "rango probable (IC95)" : "likely range (CI95)"} ${ci(locale, c.t_ci_c_decade, "°C")}` },
    { label: es ? "p · p tras control de falsas alarmas (BH)" : "p · p after false-alarm check (BH)", value: `${fmtP(locale, c.t_p)} · ${fmtP(locale, c.t_p_bh)} · ${es ? "significativa" : "significant"}: ${c.t_significant ? yes : no}` },
    { label: es ? "Pérdida de los paneles por calor" : "Panel loss from heat", value: `${num(c.heat_penalty_pct_decade, 2, true)} %/${es ? "déc (derivado)" : "dec (derived)"}` },
    { label: es ? "Cambio neto de los paneles (orientativo)" : "Net panel change (indicative)", value: `${num(c.net_pv_trend_pct_decade, 2, true)} %/${es ? "déc (derivado)" : "dec (derived)"}` },
    { label: es ? "Suelo sensibilidad baja/moderada (MITECO)" : "Land at low/moderate sensitivity (MITECO)", value: c.miteco_low_moderate_pct === null ? "—" : `${Math.round(c.miteco_low_moderate_pct)} %` },
    { label: es ? "Motivos (regla)" : "Reasons (rule)", value: c.verdict_reasons.join(", ") || "—" },
    { label: es ? "p (qué es)" : "p (what it is)", value: es ? "probabilidad de que el cambio sea casualidad; < 5 % (0,05) = comprobado" : "chance the change is a fluke; < 5% (0.05) = confirmed" },
    { label: es ? "Estado de revisión" : "Review status", value: es ? "Exploratorio — regla fijada antes de ver los datos; pendiente de segunda revisión" : "Exploratory — rule fixed before seeing the data; pending a second review" },
  ];
}

const EN: Omit<ScreeningCopy, "bullets" | "detailRows"> = {
  entry: "Where to build solar?",
  entryShort: "Solar",
  title: "Where to look first for solar",
  exploratory: "Exploratory — pending review",
  exploratoryHint: "Pre-registered rule; results not yet reviewed by a second person.",
  technology: "Technology",
  techSolar: "Solar panels (photovoltaic)",
  techHydro: "Hydro",
  techWind: "Wind",
  comingSoon: "coming soon",
  layersHeading: "On the map",
  toggleCells: "Evidence map",
  toggleCellsHint: "Green / amber / red zones (~50 km squares) from NASA data",
  toggleMiteco: "Environmental sensitivity (official MITECO map)",
  toggleMitecoHint: "Spanish environment ministry map: green = few environmental constraints, red = not recommended",
  togglePlants: "Real plants",
  togglePlantsHint: "Operating (dot) and under construction (ring), sized by installed power (MW)",
  legendGood: "Promising: look here first",
  legendMixed: "Mixed: possible, with a weak point",
  legendAvoid: "Not a priority",
  legendNote: "One colour per NASA zone (~50 km square). Trends were checked for false alarms across many zones (Benjamini–Hochberg FDR).",
  markerHeading: "Map points",
  markerOperating: "Pale filled dot: operating solar plant; size shows installed power (MW), not electricity produced.",
  markerConstruction: "Pale ring: solar plant under construction.",
  markerLandmark: "Amber dot or ring: named landmark plant.",
  markerOther: "Other black or white points belong to climate stations or research overlays and are hidden in this view.",
  featuredHeading: "Featured case · Jaén–Granada zone",
  featuredSunLabel: "Average sunshine reaching the ground · 2000–2025",
  featuredSunUnit: "kWh/m²/day",
  featuredEnvLabel: "Land with low/moderate environmental sensitivity · MITECO 2024",
  featuredSunMeaning: "kWh/m²/day = solar energy reaching each square metre per day; more = more electricity from the same panels. For your decision: this zone has sun to spare.",
  featuredEnvMeaning: "For your decision: most of the zone's land has few environmental hurdles, so plot searches start with good odds.",
  checkSeparately: "Check separately: grid connection, permits, prices.",
  featuredNarrative: (place, moreSun, moreLand, both, total) =>
    `Jaén–Granada is a strong case to investigate among ${total} green zones. ${moreSun} get more sunshine and ${moreLand} have more low-sensitivity land, but ${both} match or beat it on both. This compares ~50 km map zones, not individual plots of land.`,
  featuredCenter: "Centre of the ~50 km zone (not a proposed plot)",
  placeReferenceHeading: "Named places inside the zone",
  placeReferenceNote: "Survey markers from Spain's national mapping agency (IGN) help locate the Jaén–Granada area. They are landmarks, not land assessed for solar panels.",
  placeSource: "IGN record",
  featuredAction: "Centre map here",
  featuredLimit: "Check separately: grid connection, permits, prices.",
  environmentalMeaning: "Spain's environment ministry (MITECO) published a 2024 map that grades how sensitive the land is to large solar-panel plants: 0 = maximum (not recommended), 1 = very high, 2 = high, 3 = moderate, 4 = low (fewest environmental constraints). The percentage is the share of ~1 km map squares in classes 3 or 4 inside this ~50 km zone. It does not mean that land is free or approved for building; each plot still needs checks.",
  dustHeading: "Dust in the air · NASA MERRA-2 (context only)",
  dustMeaning: (meanAot, years) => `Average dust in the air above this zone: ${meanAot} on a haze index (0 = perfectly clear air), over ${years} complete years. For your decision: it does not change the green rating; budget panel cleaning and measure soiling on site. (Technical: NASA model output, not panel measurements; dust aerosol optical thickness at 550 nm; monthly values weighted by days; no uncertainty estimated.)`,
  dustSource: "MERRA-2 M2TMNXAER v5.12.4 · DUEXTTAU · 0.5° × 0.625° · DOI",
  dustUnavailable: "Dust values could not be loaded; the solar verdict does not use them.",
  historyHeading: "Solar plants recorded over time in the Jaén–Granada zone",
  historyNationalHeading: "Whole of Spain in the same plant register",
  historyFinding: (firstYear, firstCount, lastYear, lastCount) => `From ${firstCount} solar project entries dated ${firstYear} to ${lastCount} by ${lastYear}: ${lastCount - firstCount} more entries for this zone in today's plant register.`,
  historyHowToRead: "Each bar is the running total of operating solar projects (a plant or one construction stage of it) in today's register, by the year they started. The number on top is that total; the table shows how many each year adds. A flat bar means no new dated entry, not necessarily that nothing was built.",
  historyTableYear: "Year",
  historyTableAdded: "Entries dated that year",
  historyTableCumulative: "Running total in this snapshot",
  historyIntro: (operating, known, unknown) => `The Global Energy Monitor plant register (February 2026) lists ${operating} operating solar projects in Spain. ${known} have a start year and ${unknown} do not. These bars count entries per year, not the running total shown above.`,
  historyFeatured: (count, assumed) => `Of these ${count} entries in the ~50 km zone, ${assumed} are marked “probably solar panels (type not confirmed)” by the register: real plants whose technology was not confirmed, not hypothetical projects. One location is approximate. They are register points, not ${count} plants checked on site.`,
  historyExplicit: "Solar panels (confirmed)",
  historyAssumed: "Probably solar panels (type not confirmed)",
  historyLimit: "Source: Global Energy Monitor plant register (Global Solar Power Tracker), February 2026: operating plants of at least 1 MW, by start year, located inside this zone. It leaves out small systems such as rooftops and may miss closed plants. The count is exact for these records; it is not electricity output.",
  historyOutcome: "Builders are already active in this zone: registered plants keep growing",
  historyOutcomeMeaning: "For your decision: there is a track record of projects here. For building speed use the national Eurostat figure in the executive summary (this register lists today's plants, not a yearly census).",
  loading: "Loading screening results…",
  notAvailable: "Screening results are not published yet.",
  notAvailableHint: "The map appears as soon as the data pipeline writes its results. Nothing here is estimated by the browser.",
  plantsMissing: "Plant list not available yet.",
  mitecoMissing: "MITECO map not available yet.",
  summaryGood: (n, where) => `${n} zones look promising${where ? `, mostly in ${where}` : ""}.`,
  summaryRest: (mixed, avoid) => `${mixed} are mixed and ${avoid} are not a priority.`,
  summaryMw: (g, a) =>
    `${Math.round(g)}% of today's operating solar capacity (MW = installed power: what the panels can give at full sun) already sits in green zones${a !== undefined ? ` (${Math.round(a)}% in red ones)` : ""}: the industry already builds where the evidence points.`,
  summaryBasis: (from, to) => `Based on NASA sunshine and summer heat ${from}–${to} plus MITECO's environmental map.`,
  clickHint: "Click any coloured square on the map to see why.",
  verdictTitle: { good: "Promising", mixed: "Mixed", avoid: "Not a priority", no_data: "No data" },
  verdictSentence: {
    good: "Promising place to look first.",
    mixed: "Mixed: possible, but something holds it back.",
    avoid: "Not a priority here.",
    no_data: "Mostly sea or outside Spain: not part of this screen.",
  },
  meansHeading: "What this means for you",
  means: {
    good: "Put this area on your shortlist. Next, check grid connection, land and permits on site.",
    mixed: "Look here after the green zones, and check the weak point above first.",
    avoid: "Spend your time elsewhere first: the sun is weak or most of the land is environmentally sensitive.",
    no_data: "Use another source for this area.",
  },
  cannotHeading: "Scope of this screen",
  cannot: "Electricity output (MWh), prices, grid capacity and permits are not in these datasets: there is no consistent public nationwide data for them, and they depend on each plot. A screening aid, not investment advice.",
  details: "Details & sources",
  method: "Method",
  sources: "Sources",
  cellLabel: (c) => `Zone ${c.id} · ${c.lat.toFixed(2)}°, ${c.lon.toFixed(2)}°`,
  back: "Back to summary",
  close: "Close",
  plantStatus: (s) => (s === "operating" ? "Operating" : s === "construction" ? "Under construction" : s),
  plantTech: (t) => (t === "csp" ? "Solar thermal (mirrors heating fluid, CSP)" : t === "pv" ? "Solar panels (photovoltaic)" : t),
  plantDetail: (p) => `${p.tech === "csp" ? "Solar thermal" : "Solar panels"} · ${p.status === "construction" ? "under construction" : "operating"}`,
  plantCapacity: "Capacity",
  plantStatusLabel: "Status",
  plantMiteco: "Environmental sensitivity at the site (MITECO map)",
  plantMitecoUnknown: "Not available",
  plantNote: "Real plant from the Global Energy Monitor plant register. Installed power (MW) is not electricity produced.",
  mitecoClass: (v) => `${v} · ${MITECO_EN[v] ?? "—"}`,
  plantsInCell: (n, mw) => `${n} operating plants here today (${Math.round(mw)} MW).`,
};

const ES: Omit<ScreeningCopy, "bullets" | "detailRows"> = {
  entry: "¿Dónde instalar solar?",
  entryShort: "Solar",
  title: "Dónde mirar primero para solar",
  exploratory: "Exploratorio — pendiente de revisión",
  exploratoryHint: "Regla fijada antes de ver los datos; resultados aún sin segunda revisión.",
  technology: "Tecnología",
  techSolar: "Paneles solares (fotovoltaica)",
  techHydro: "Hidráulica",
  techWind: "Eólica",
  comingSoon: "próximamente",
  layersHeading: "En el mapa",
  toggleCells: "Mapa de evidencia",
  toggleCellsHint: "Zonas verde / ámbar / roja (cuadros de ~50 km) con datos NASA",
  toggleMiteco: "Sensibilidad ambiental (mapa oficial del MITECO)",
  toggleMitecoHint: "Mapa del Ministerio para la Transición Ecológica: verde = pocas restricciones ambientales, rojo = no recomendado",
  togglePlants: "Plantas reales",
  togglePlantsHint: "En operación (punto) y en construcción (anillo), tamaño según potencia instalada (MW)",
  legendGood: "Prometedora: mira aquí primero",
  legendMixed: "Mixta: posible, con un punto débil",
  legendAvoid: "No prioritaria",
  legendNote: "Un color por zona NASA (cuadro de ~50 km). Las tendencias se revisan contra falsas alarmas entre muchas zonas (FDR de Benjamini–Hochberg).",
  markerHeading: "Puntos del mapa",
  markerOperating: "Punto claro relleno: planta solar en operación; el tamaño indica potencia instalada (MW), no electricidad producida.",
  markerConstruction: "Anillo claro: planta solar en construcción.",
  markerLandmark: "Punto o anillo ámbar: planta destacada con nombre.",
  markerOther: "Los otros puntos negros o blancos son estaciones climáticas u otras capas de investigación; se ocultan en esta vista.",
  featuredHeading: "Caso destacado · zona Jaén–Granada",
  featuredSunLabel: "Sol medio que llega al suelo · 2000–2025",
  featuredSunUnit: "kWh/m²/día",
  featuredEnvLabel: "Suelo con sensibilidad ambiental baja/moderada · MITECO 2024",
  featuredSunMeaning: "kWh/m²/día = energía solar que llega a cada metro cuadrado al día; más = más electricidad con los mismos paneles. Para tu decisión: a esta zona le sobra sol.",
  featuredEnvMeaning: "Para tu decisión: la mayor parte del suelo tiene pocas trabas ambientales, así que la búsqueda de parcela parte con buenas opciones.",
  checkSeparately: "Comprobar aparte: conexión a red, permisos, precios.",
  featuredNarrative: (place, moreSun, moreLand, both, total) =>
    `Jaén–Granada destaca entre ${total} zonas verdes. ${moreSun} reciben más sol y ${moreLand} tienen más suelo poco sensible, pero ${both} la igualan o superan en ambas cosas. Se comparan zonas de ~50 km, no parcelas.`,
  featuredCenter: "Centro de la zona de ~50 km (no es una parcela propuesta)",
  placeReferenceHeading: "Lugares concretos dentro de la zona",
  placeReferenceNote: "Los vértices geodésicos del Instituto Geográfico Nacional (IGN) sitúan la zona Jaén–Granada. Son hitos de referencia, no terrenos evaluados para paneles solares.",
  placeSource: "Ficha IGN",
  featuredAction: "Centrar mapa aquí",
  featuredLimit: "Comprobar aparte: conexión a red, permisos, precios.",
  environmentalMeaning: "El Ministerio para la Transición Ecológica (MITECO) publicó en 2024 un mapa que gradúa lo sensible que es el suelo a grandes plantas de paneles solares: 0 = máxima (no recomendada), 1 = muy alta, 2 = alta, 3 = moderada, 4 = baja (menos restricciones ambientales). El porcentaje es la parte de cuadros de ~1 km en las clases 3 o 4 dentro de esta zona de ~50 km. No significa que ese suelo esté libre ni autorizado: hay que estudiar cada parcela.",
  dustHeading: "Polvo en el aire · NASA MERRA-2 (solo contexto)",
  dustMeaning: (meanAot, years) => `Polvo medio en el aire sobre esta zona: ${meanAot} en un índice de turbidez (0 = aire totalmente limpio), durante ${years} años completos. Para tu decisión: no cambia el color verde; presupuesta limpieza de paneles y mide la suciedad en el emplazamiento. (Técnico: dato de un modelo de la NASA, no medido en paneles; espesor óptico del polvo a 550 nm; medias mensuales ponderadas por días; sin incertidumbre estimada.)`,
  dustSource: "MERRA-2 M2TMNXAER v5.12.4 · DUEXTTAU · 0,5° × 0,625° · DOI",
  dustUnavailable: "No se han podido cargar los valores de polvo; el veredicto solar no los utiliza.",
  historyHeading: "Plantas solares registradas a lo largo del tiempo en la zona Jaén–Granada",
  historyNationalHeading: "Toda España en el mismo registro de plantas",
  historyFinding: (firstYear, firstCount, lastYear, lastCount) => `De ${firstCount} entradas de proyectos solares fechadas en ${firstYear} a ${lastCount} hasta ${lastYear}: ${lastCount - firstCount} entradas más en esta zona en el registro de plantas actual.`,
  historyHowToRead: "Cada barra es el total acumulado de proyectos solares en operación (una planta o una fase de obra de ella) que aparecen hoy en el registro, según su año de inicio. El número de arriba es ese total; la tabla indica cuántos suma cada año. Una barra plana indica que no hay entradas nuevas con fecha, no que no se construyera nada.",
  historyTableYear: "Año",
  historyTableAdded: "Entradas con ese año",
  historyTableCumulative: "Total acumulado en esta foto",
  historyIntro: (operating, known, unknown) => `El registro de plantas de Global Energy Monitor (febrero de 2026) incluye ${operating} proyectos solares en operación en España. ${known} tienen año de inicio y ${unknown} no. Estas barras cuentan entradas de cada año, no el acumulado del gráfico anterior.`,
  historyFeatured: (count, assumed) => `De estas ${count} entradas en la zona de ~50 km, el registro marca ${assumed} como «probablemente paneles solares (tipo sin confirmar)»: plantas reales cuya tecnología no se ha confirmado, no proyectos hipotéticos. Una localización es aproximada. Son puntos del registro, no ${count} plantas comprobadas sobre el terreno.`,
  historyExplicit: "Paneles solares (confirmado)",
  historyAssumed: "Probablemente paneles solares (tipo sin confirmar)",
  historyLimit: "Fuente: registro de plantas de Global Energy Monitor (Global Solar Power Tracker), febrero de 2026: plantas en operación de al menos 1 MW, por año de inicio, situadas dentro de esta zona. Deja fuera instalaciones pequeñas como tejados y puede omitir plantas cerradas. El recuento es exacto para estas fichas; no es producción eléctrica.",
  historyOutcome: "El sector ya construye en esta zona: las plantas registradas no paran de crecer",
  historyOutcomeMeaning: "Para tu decisión: hay historial de proyectos aquí. Para la velocidad de construcción usa la cifra nacional de Eurostat del resumen ejecutivo (este registro lista las plantas de hoy, no un censo anual).",
  loading: "Cargando resultados del cribado…",
  notAvailable: "Los resultados del cribado aún no están publicados.",
  notAvailableHint: "El mapa aparecerá en cuanto el proceso de datos escriba sus resultados. El navegador no estima nada.",
  plantsMissing: "La lista de plantas aún no está disponible.",
  mitecoMissing: "El mapa del MITECO aún no está disponible.",
  summaryGood: (n, where) => `${n} zonas parecen prometedoras${where ? `, sobre todo en ${where}` : ""}.`,
  summaryRest: (mixed, avoid) => `${mixed} son mixtas y ${avoid} no son prioritarias.`,
  summaryMw: (g, a) =>
    `El ${Math.round(g)} % de la potencia solar en operación (MW = potencia instalada: lo que pueden dar las placas a pleno sol) ya está en zonas verdes${a !== undefined ? ` (${Math.round(a)} % en rojas)` : ""}: el sector ya construye donde apunta la evidencia.`,
  summaryBasis: (from, to) => `Basado en el sol y el calor de verano de la NASA ${from}–${to} y en el mapa ambiental del MITECO.`,
  clickHint: "Pulsa cualquier cuadro de color del mapa para ver por qué.",
  verdictTitle: { good: "Prometedora", mixed: "Mixta", avoid: "No prioritaria", no_data: "Sin datos" },
  verdictSentence: {
    good: "Buen sitio para mirar primero.",
    mixed: "Mixta: posible, pero algo la frena.",
    avoid: "Aquí no es prioritario.",
    no_data: "Casi todo mar o fuera de España: no entra en este cribado.",
  },
  meansHeading: "Qué significa para ti",
  means: {
    good: "Ponla en tu lista corta. Después comprueba en el terreno la conexión a red, el suelo y los permisos.",
    mixed: "Mírala después de las zonas verdes y revisa primero el punto débil de arriba.",
    avoid: "Dedica antes tu tiempo a otras zonas: hay poco sol o casi todo el suelo es ambientalmente sensible.",
    no_data: "Usa otra fuente para esta zona.",
  },
  cannotHeading: "Alcance de este cribado",
  cannot: "La electricidad producida (MWh), los precios, la capacidad de red y los permisos no están en estos datos: no hay datos públicos nacionales homogéneos y dependen de cada parcela. Es una ayuda para cribar, no un consejo de inversión.",
  details: "Detalles y fuentes",
  method: "Método",
  sources: "Fuentes",
  cellLabel: (c) => `Zona ${c.id} · ${c.lat.toFixed(2).replace(".", ",")}°, ${c.lon.toFixed(2).replace(".", ",")}°`,
  back: "Volver al resumen",
  close: "Cerrar",
  plantStatus: (s) => (s === "operating" ? "En operación" : s === "construction" ? "En construcción" : s),
  plantTech: (t) => (t === "csp" ? "Termosolar (espejos que calientan un fluido, CSP)" : t === "pv" ? "Paneles solares (fotovoltaica)" : t),
  plantDetail: (p) => `${p.tech === "csp" ? "Termosolar" : "Paneles solares"} · ${p.status === "construction" ? "en construcción" : "en operación"}`,
  plantCapacity: "Potencia",
  plantStatusLabel: "Estado",
  plantMiteco: "Sensibilidad ambiental en el emplazamiento (mapa MITECO)",
  plantMitecoUnknown: "No disponible",
  plantNote: "Planta real del registro de plantas de Global Energy Monitor. La potencia instalada (MW) no es electricidad producida.",
  mitecoClass: (v) => `${v} · ${MITECO_ES[v] ?? "—"}`,
  plantsInCell: (n, mw) => `${n} plantas en operación aquí hoy (${Math.round(mw)} MW).`,
};

export function screeningCopy(locale: Locale): ScreeningCopy {
  const base = locale === "es" ? ES : EN;
  return {
    ...base,
    bullets: (c) =>
      [sunBullet(locale, c), trendBullet(locale, c), heatBullet(locale, c), envBullet(locale, c)].filter(
        (b): b is Bullet => b !== null,
      ),
    detailRows: (c, period) => detailRows(locale, c, period),
  };
}

export { fmt as formatScreeningNumber, fmtP as formatScreeningP };
