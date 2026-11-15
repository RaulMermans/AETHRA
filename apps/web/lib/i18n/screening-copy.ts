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

const MITECO_EN = ["Maximum (not recommended)", "Very high", "High", "Moderate", "Low"];
const MITECO_ES = ["Máxima (no recomendada)", "Muy alta", "Alta", "Moderada", "Baja"];

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
      ? `Entre el ${top} % de zonas más soleadas de España (${val} al día)`
      : `Among the sunniest ${top}% of Spain (${val} per day)`;
  } else if (p < 25) {
    const bottom = Math.max(1, Math.round(p));
    text = es
      ? `Entre el ${bottom} % de zonas con menos sol de España (${val} al día)`
      : `Among the least sunny ${bottom}% of Spain (${val} per day)`;
  } else {
    text = es ? `Sol algo por debajo de la media española (${val} al día)` : `Sunshine a bit below the Spanish middle (${val} per day)`;
  }
  return { icon: "sun", text };
}

function trendBullet(locale: Locale, c: PvCell): Bullet {
  const es = locale === "es";
  const t = c.irr_trend_pct_decade;
  if (t === null || c.irr_significant === null) {
    return { icon: "trend", text: es ? "No hay datos suficientes para ver si el sol cambia" : "Not enough data to tell whether sunshine is changing" };
  }
  const v = `${fmt(locale, t, 1, true)} % ${es ? "por década" : "per decade"}`;
  if (c.irr_significant && t > 0)
    return { icon: "trend", text: es ? `El sol ha aumentado, y el aumento está respaldado (${v})` : `Sunshine has risen, and the rise is supported (${v})` };
  if (c.irr_significant && t < 0)
    return { icon: "trend", text: es ? `El sol ha bajado, y la bajada está respaldada (${v})` : `Sunshine has dropped, and the drop is supported (${v})` };
  if (t > 0)
    return { icon: "trend", text: es ? `El sol muestra una ligera subida, pero aún no está demostrada (${v})` : `Sunshine shows a slight rise, but it is not proven yet (${v})` };
  if (t < 0)
    return { icon: "trend", text: es ? `El sol muestra una ligera bajada, pero no está demostrada (${v})` : `Sunshine shows a slight drop, but it is not proven (${v})` };
  return { icon: "trend", text: es ? "El sol se mantiene estable" : "Sunshine is holding steady" };
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
    return { icon: "heat", text: es ? `Cambio térmico veraniego estimado: ${tv}; no demuestra ausencia de calentamiento` : `Estimated summer temperature change: ${tv}; this does not establish an absence of warming` };
  }
  return {
    icon: "heat",
    text: es
      ? `${proven ? "Sube la temperatura del aire en verano" : "La subida estival no es robusta"} (${tv}). Una regla térmica orientativa estima ${pv} por década de penalización FV; no es producción calculada.`
      : `${proven ? "Summer air temperature is rising" : "The summer rise is not robust"} (${tv}). An indicative thermal rule estimates a ${pv} per-decade PV penalty; this is not calculated generation.`,
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
        ? `Solo el ${pct} de la superficie clasificada tiene sensibilidad baja o moderada; predominan las clases de sensibilidad alta a máxima (MITECO)`
        : `Only ${pct} of the classified area has low or moderate sensitivity; high to maximum sensitivity classes dominate (MITECO)`,
    };
  return {
    icon: "leaf",
    text: es
      ? `El ${pct} de la superficie clasificada de esta celda es de sensibilidad ambiental baja o moderada (MITECO)`
      : `${pct} of this cell's classified area has low or moderate environmental sensitivity (MITECO)`,
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
    { label: es ? "Celda" : "Cell", value: `${c.id} · ${fmt(locale, c.lat, 2)}°, ${fmt(locale, c.lon, 2)}° · ${es ? "tierra" : "land"} ${Math.round(c.land_fraction * 100)} %` },
    { label: es ? "Periodo" : "Period", value: `${period[0]}–${period[1]} (n = ${n} ${es ? "años" : "years"})` },
    { label: es ? "Irradiancia media" : "Mean irradiance", value: `${num(c.irr_mean_kwh_m2_day, 2)} kWh/m²/${es ? "día" : "day"} · P${num(c.irr_resource_percentile, 0)}` },
    { label: es ? "Tendencia irradiancia" : "Irradiance trend", value: `${num(c.irr_trend_pct_decade, 2, true)} %/${es ? "déc" : "dec"} · IC95 ${ci(locale, c.irr_ci_pct_decade, "%")}` },
    { label: "p · p BH", value: `${fmtP(locale, c.irr_p)} · ${fmtP(locale, c.irr_p_bh)} · ${es ? "significativa" : "significant"}: ${c.irr_significant ? yes : no}` },
    { label: es ? "T2M verano (JJA)" : "Summer T2M (JJA)", value: `${num(c.t_summer_mean_c, 1)} °C` },
    { label: es ? "Tendencia T2M" : "T2M trend", value: `${num(c.t_trend_c_decade, 2, true)} °C/${es ? "déc" : "dec"} · IC95 ${ci(locale, c.t_ci_c_decade, "°C")}` },
    { label: "p · p BH", value: `${fmtP(locale, c.t_p)} · ${fmtP(locale, c.t_p_bh)} · ${es ? "significativa" : "significant"}: ${c.t_significant ? yes : no}` },
    { label: es ? "Penalización por calor" : "Heat penalty", value: `${num(c.heat_penalty_pct_decade, 2, true)} %/${es ? "déc (derivado)" : "dec (derived)"}` },
    { label: es ? "Cambio FV neto (indicativo)" : "Net PV change (indicative)", value: `${num(c.net_pv_trend_pct_decade, 2, true)} %/${es ? "déc (derivado)" : "dec (derived)"}` },
    { label: es ? "MITECO baja/moderada" : "MITECO low/moderate", value: c.miteco_low_moderate_pct === null ? "—" : `${Math.round(c.miteco_low_moderate_pct)} %` },
    { label: es ? "Motivos (regla)" : "Reasons (rule)", value: c.verdict_reasons.join(", ") || "—" },
  ];
}

const EN: Omit<ScreeningCopy, "bullets" | "detailRows"> = {
  entry: "Where to build solar?",
  entryShort: "Solar",
  title: "Where to look first for solar",
  exploratory: "Exploratory — pending review",
  exploratoryHint: "Pre-registered rule; results not yet reviewed by a second person.",
  technology: "Technology",
  techSolar: "Solar PV",
  techHydro: "Hydro",
  techWind: "Wind",
  comingSoon: "coming soon",
  layersHeading: "On the map",
  toggleCells: "Evidence map",
  toggleCellsHint: "Green / amber / red zones from NASA data",
  toggleMiteco: "Environmental sensitivity (MITECO)",
  toggleMitecoHint: "Official environmental sensitivity map",
  togglePlants: "Real plants",
  togglePlantsHint: "Operating (dot) and under construction (ring), sized by MW",
  legendGood: "Promising: look here first",
  legendMixed: "Mixed: possible, with a weak point",
  legendAvoid: "Not a priority",
  legendNote: "One colour per NASA grid cell (~50 km). Multiple-testing control: Benjamini–Hochberg FDR.",
  markerHeading: "Map points",
  markerOperating: "Pale filled dot: operating solar plant; size shows registered MW, not production.",
  markerConstruction: "Pale ring: solar plant under construction.",
  markerLandmark: "Amber dot or ring: named landmark plant.",
  markerOther: "Other black or white points belong to climate stations or research overlays and are hidden in this view.",
  featuredHeading: "Featured case · Jaén–Granada cell",
  featuredSunLabel: "Mean incoming sunlight · 2000–2025",
  featuredSunUnit: "kWh/m²/day",
  featuredEnvLabel: "Mapped low/moderate sensitivity · MITECO 2024",
  featuredNarrative: (place, moreSun, moreLand, both, total) =>
    `${place} is a strong case to investigate among ${total} green cells. ${moreSun} have more sunlight and ${moreLand} have a higher low/moderate MITECO share; ${both} match or beat it on both measures. This is a comparison of mapped cells, not a parcel ranking.`,
  featuredCenter: "Centre of the ~50 km map cell (not a proposed parcel)",
  placeReferenceHeading: "Named places inside the cell",
  placeReferenceNote: "IGN geodetic vertices locate the Jaén–Granada area. Their coordinates identify markers, not land assessed for PV development.",
  placeSource: "IGN record",
  featuredAction: "Centre map here",
  featuredLimit: "Panel soiling, grid capacity, land ownership, permits and site surveys are still unassessed.",
  environmentalMeaning: "MITECO's 2024 map grades environmental sensitivity for large PV projects from maximum (0) to low (4). The percentage counts mapped ~1 km pixels in classes 3 or 4 inside this ~50 km NASA cell. It does not mean that share is available or approved for building; each parcel still needs checks.",
  dustHeading: "Dust context · NASA MERRA-2",
  dustMeaning: (meanAot, years) => `Mean dust optical thickness at 550 nm: ${meanAot} (dimensionless), across ${years} complete years. Monthly values are weighted by calendar days; uncertainty was not estimated. This reanalysis describes atmospheric dust, not dust deposited on modules or lost PV output. It does not change the green verdict.`,
  dustSource: "MERRA-2 M2TMNXAER v5.12.4 · DUEXTTAU · 0.5° × 0.625° · DOI",
  dustUnavailable: "Dust values could not be loaded; the solar verdict does not use them.",
  historyHeading: "Solar projects recorded over time in this Jaén–Granada cell",
  historyNationalHeading: "Spain registry context",
  historyFinding: (firstYear, firstCount, lastYear, lastCount) => `From ${firstCount} solar project phases dated ${firstYear} to ${lastCount} dated through ${lastYear}: ${lastCount - firstCount} more entries in this cell's current register.`,
  historyHowToRead: "Each bar shows the running total of operating solar project phases in today's register, grouped by their reported start year. The number above is that total; the table shows how many entries each year adds. A flat bar means no new dated entry in this extract, not necessarily no real construction.",
  historyTableYear: "Year",
  historyTableAdded: "Entries dated that year",
  historyTableCumulative: "Running total in this snapshot",
  historyIntro: (operating, known, unknown) => `GEM's February 2026 Spain snapshot lists ${operating} operating solar project phases. ${known} have a reported start year and ${unknown} do not. The national bars count entries dated each year, not the running total shown above.`,
  historyFeatured: (count, assumed) => `Of these ${count} phases in the ~50 km cell, GEM infers photovoltaic technology for ${assumed}; “Assumed PV” is its classification, not a hypothetical project. One location is approximate. These register points are not ${count} site-verified plants.`,
  historyExplicit: "PV technology reported",
  historyAssumed: "PV technology inferred by GEM",
  historyLimit: "Source: GEM Global Solar Power Tracker, February 2026, operating utility-scale phases (at least 1 MW), reported start year, point inside this cell. This retrospective register omits smaller systems and may miss past or closed projects. The rise is exact for these records; it does not measure all installations or electricity output.",
  historyOutcome: "Registered phases increased; real construction rate is not measured",
  historyOutcomeMeaning: "The cumulative count necessarily rises when a dated entry is added. Without a complete annual commissioning census, a growth rate, slope or confidence interval for real construction would be misleading.",
  loading: "Loading screening results…",
  notAvailable: "Screening results are not published yet.",
  notAvailableHint: "The map appears as soon as the data pipeline writes its results. Nothing here is estimated by the browser.",
  plantsMissing: "Plant list not available yet.",
  mitecoMissing: "MITECO map not available yet.",
  summaryGood: (n, where) => `${n} zones look promising${where ? `, mostly in ${where}` : ""}.`,
  summaryRest: (mixed, avoid) => `${mixed} are mixed and ${avoid} are not a priority.`,
  summaryMw: (g, a) =>
    `${Math.round(g)}% of today's solar MW already sit in green zones${a !== undefined ? ` (${Math.round(a)}% in red ones)` : ""}.`,
  summaryBasis: (from, to) => `Based on NASA sunshine and summer heat ${from}–${to} plus MITECO's environmental map.`,
  clickHint: "Click any coloured square on the map to see why.",
  verdictTitle: { good: "Promising", mixed: "Mixed", avoid: "Not a priority", no_data: "No data" },
  verdictSentence: {
    good: "Promising place to look first.",
    mixed: "Mixed: possible, but something holds it back.",
    avoid: "Not a priority here.",
    no_data: "Not enough data for this area (mostly sea or outside Spain).",
  },
  meansHeading: "What this means for you",
  means: {
    good: "Put this area on your shortlist. Next, check grid connection, land and permits on site.",
    mixed: "Look here after the green zones, and check the weak point above first.",
    avoid: "Spend your time elsewhere first: the sun is weak or most of the land is environmentally sensitive.",
    no_data: "Use another source for this area.",
  },
  cannotHeading: "What we cannot tell you",
  cannot: "No energy output (MWh), prices, grid capacity or permits. A screening aid, not investment advice.",
  details: "Details & sources",
  method: "Method",
  sources: "Sources",
  cellLabel: (c) => `Zone ${c.id} · ${c.lat.toFixed(2)}°, ${c.lon.toFixed(2)}°`,
  back: "Back to summary",
  close: "Close",
  plantStatus: (s) => (s === "operating" ? "Operating" : s === "construction" ? "Under construction" : s),
  plantTech: (t) => (t === "csp" ? "Solar thermal (CSP)" : t === "pv" ? "Solar PV" : t),
  plantDetail: (p) => `${p.tech === "csp" ? "CSP" : "PV"} · ${p.status === "construction" ? "under construction" : "operating"}`,
  plantCapacity: "Capacity",
  plantStatusLabel: "Status",
  plantMiteco: "MITECO sensitivity at the site",
  plantMitecoUnknown: "Not available",
  plantNote: "Real plant from a public register. Capacity is not generation.",
  mitecoClass: (v) => `${v} · ${MITECO_EN[v] ?? "Unknown"}`,
  plantsInCell: (n, mw) => `${n} operating plants here today (${Math.round(mw)} MW).`,
};

const ES: Omit<ScreeningCopy, "bullets" | "detailRows"> = {
  entry: "¿Dónde instalar solar?",
  entryShort: "Solar",
  title: "Dónde mirar primero para solar",
  exploratory: "Exploratorio — pendiente de revisión",
  exploratoryHint: "Regla fijada antes de ver los datos; resultados aún sin segunda revisión.",
  technology: "Tecnología",
  techSolar: "Solar FV",
  techHydro: "Hidráulica",
  techWind: "Eólica",
  comingSoon: "próximamente",
  layersHeading: "En el mapa",
  toggleCells: "Mapa de evidencia",
  toggleCellsHint: "Zonas verde / ámbar / roja a partir de datos NASA",
  toggleMiteco: "Sensibilidad ambiental (MITECO)",
  toggleMitecoHint: "Mapa oficial de sensibilidad ambiental",
  togglePlants: "Plantas reales",
  togglePlantsHint: "En operación (punto) y en construcción (anillo), tamaño según MW",
  legendGood: "Prometedora: mira aquí primero",
  legendMixed: "Mixta: posible, con un punto débil",
  legendAvoid: "No prioritaria",
  legendNote: "Un color por celda de la malla NASA (~50 km). Control de pruebas múltiples: FDR de Benjamini–Hochberg.",
  markerHeading: "Puntos del mapa",
  markerOperating: "Punto claro relleno: planta solar en operación; el tamaño indica MW registrados, no producción.",
  markerConstruction: "Anillo claro: planta solar en construcción.",
  markerLandmark: "Punto o anillo ámbar: planta destacada con nombre.",
  markerOther: "Los otros puntos negros o blancos son estaciones climáticas u otras capas de investigación; se ocultan en esta vista.",
  featuredHeading: "Caso destacado · celda Jaén–Granada",
  featuredSunLabel: "Irradiancia media recibida · 2000–2025",
  featuredSunUnit: "kWh/m²/día",
  featuredEnvLabel: "Sensibilidad baja/moderada en el mapa · MITECO 2024",
  featuredNarrative: (place, moreSun, moreLand, both, total) =>
    `${place} destaca entre ${total} celdas verdes. ${moreSun} tienen más irradiancia y ${moreLand} tienen mayor proporción MITECO baja/moderada; ${both} la igualan o superan en ambas cosas. Se comparan celdas del mapa, no parcelas.`,
  featuredCenter: "Centro de la celda de ~50 km (no es una parcela propuesta)",
  placeReferenceHeading: "Lugares concretos dentro de la celda",
  placeReferenceNote: "Los vértices geodésicos del IGN sitúan la zona Jaén–Granada. Sus coordenadas identifican hitos, no terrenos evaluados para construir FV.",
  placeSource: "Ficha IGN",
  featuredAction: "Centrar mapa aquí",
  featuredLimit: "Siguen sin evaluarse la suciedad en paneles, la capacidad de red, la propiedad del suelo, los permisos y el terreno.",
  environmentalMeaning: "El mapa MITECO de 2024 clasifica la sensibilidad ambiental para grandes plantas FV de máxima (0) a baja (4). El porcentaje cuenta píxeles cartografiados de ~1 km en las clases 3 o 4 dentro de esta celda NASA de ~50 km. No significa que ese suelo esté libre ni autorizado para construir: hay que estudiar cada parcela.",
  dustHeading: "Contexto de polvo · NASA MERRA-2",
  dustMeaning: (meanAot, years) => `Espesor óptico medio del polvo a 550 nm: ${meanAot} (adimensional), durante ${years} años completos. Las medias mensuales se ponderan por días; no se ha estimado incertidumbre. Este reanálisis describe polvo en la atmósfera, no el depositado sobre paneles ni pérdidas de producción. No cambia el veredicto verde.`,
  dustSource: "MERRA-2 M2TMNXAER v5.12.4 · DUEXTTAU · 0,5° × 0,625° · DOI",
  dustUnavailable: "No se han podido cargar los valores de polvo; el veredicto solar no los utiliza.",
  historyHeading: "Proyectos solares registrados a lo largo del tiempo en esta celda Jaén–Granada",
  historyNationalHeading: "Contexto del registro de España",
  historyFinding: (firstYear, firstCount, lastYear, lastCount) => `De ${firstCount} fases de proyectos solares fechadas en ${firstYear} a ${lastCount} hasta ${lastYear}: ${lastCount - firstCount} entradas más en el registro actual de esta celda.`,
  historyHowToRead: "Cada barra muestra el total acumulado de fases solares en operación que aparecen hoy en el registro, según su año de inicio declarado. El número superior es ese total; la tabla indica cuántas entradas aporta cada año. Una barra plana indica que este extracto no añade entradas fechadas, no que no se construyera nada.",
  historyTableYear: "Año",
  historyTableAdded: "Entradas con ese año",
  historyTableCumulative: "Total acumulado en esta foto",
  historyIntro: (operating, known, unknown) => `La foto de GEM de febrero de 2026 incluye ${operating} fases de proyectos solares en operación en España. ${known} tienen año de inicio declarado y ${unknown} no. Las barras nacionales cuentan entradas de cada año, no el acumulado del gráfico anterior.`,
  historyFeatured: (count, assumed) => `De estas ${count} fases en la celda de ~50 km, GEM infiere la tecnología fotovoltaica en ${assumed}; «Assumed PV» es su clasificación, no un proyecto hipotético. Una localización es aproximada. Estos puntos del registro no son ${count} plantas verificadas sobre el terreno.`,
  historyExplicit: "Tecnología fotovoltaica declarada",
  historyAssumed: "Tecnología fotovoltaica inferida por GEM",
  historyLimit: "Fuente: GEM Global Solar Power Tracker, febrero de 2026, fases en operación de proyectos de al menos 1 MW, año de inicio declarado y punto dentro de la celda. Este registro retrospectivo excluye sistemas pequeños y puede omitir proyectos pasados o cerrados. El aumento es exacto para estas fichas; no mide todas las instalaciones ni la producción eléctrica.",
  historyOutcome: "Aumentan las fases registradas; no se mide la tasa real de construcción",
  historyOutcomeMeaning: "El acumulado crece necesariamente al añadirse una ficha fechada. Sin un censo anual completo de puestas en marcha, una tasa de crecimiento, pendiente o intervalo de confianza sobre la construcción real sería engañosa.",
  loading: "Cargando resultados del cribado…",
  notAvailable: "Los resultados del cribado aún no están publicados.",
  notAvailableHint: "El mapa aparecerá en cuanto el proceso de datos escriba sus resultados. El navegador no estima nada.",
  plantsMissing: "La lista de plantas aún no está disponible.",
  mitecoMissing: "El mapa del MITECO aún no está disponible.",
  summaryGood: (n, where) => `${n} zonas parecen prometedoras${where ? `, sobre todo en ${where}` : ""}.`,
  summaryRest: (mixed, avoid) => `${mixed} son mixtas y ${avoid} no son prioritarias.`,
  summaryMw: (g, a) =>
    `El ${Math.round(g)} % de los MW solares actuales ya está en zonas verdes${a !== undefined ? ` (${Math.round(a)} % en rojas)` : ""}.`,
  summaryBasis: (from, to) => `Basado en el sol y el calor de verano de la NASA ${from}–${to} y en el mapa ambiental del MITECO.`,
  clickHint: "Pulsa cualquier cuadro de color del mapa para ver por qué.",
  verdictTitle: { good: "Prometedora", mixed: "Mixta", avoid: "No prioritaria", no_data: "Sin datos" },
  verdictSentence: {
    good: "Buen sitio para mirar primero.",
    mixed: "Mixta: posible, pero algo la frena.",
    avoid: "Aquí no es prioritario.",
    no_data: "No hay datos suficientes para esta zona (casi todo mar o fuera de España).",
  },
  meansHeading: "Qué significa para ti",
  means: {
    good: "Ponla en tu lista corta. Después comprueba en el terreno la conexión a red, el suelo y los permisos.",
    mixed: "Mírala después de las zonas verdes y revisa primero el punto débil de arriba.",
    avoid: "Dedica antes tu tiempo a otras zonas: hay poco sol o casi todo el suelo es ambientalmente sensible.",
    no_data: "Usa otra fuente para esta zona.",
  },
  cannotHeading: "Lo que no podemos decirte",
  cannot: "Ni producción (MWh), ni precios, ni capacidad de red, ni permisos. Es una ayuda para cribar, no un consejo de inversión.",
  details: "Detalles y fuentes",
  method: "Método",
  sources: "Fuentes",
  cellLabel: (c) => `Zona ${c.id} · ${c.lat.toFixed(2).replace(".", ",")}°, ${c.lon.toFixed(2).replace(".", ",")}°`,
  back: "Volver al resumen",
  close: "Cerrar",
  plantStatus: (s) => (s === "operating" ? "En operación" : s === "construction" ? "En construcción" : s),
  plantTech: (t) => (t === "csp" ? "Termosolar (CSP)" : t === "pv" ? "Solar fotovoltaica" : t),
  plantDetail: (p) => `${p.tech === "csp" ? "CSP" : "FV"} · ${p.status === "construction" ? "en construcción" : "en operación"}`,
  plantCapacity: "Potencia",
  plantStatusLabel: "Estado",
  plantMiteco: "Sensibilidad MITECO en el emplazamiento",
  plantMitecoUnknown: "No disponible",
  plantNote: "Planta real de un registro público. La potencia no es producción.",
  mitecoClass: (v) => `${v} · ${MITECO_ES[v] ?? "Desconocida"}`,
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

export { fmt as formatScreeningNumber };
