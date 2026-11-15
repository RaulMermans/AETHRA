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
    return { icon: "heat", text: es ? `Los veranos no se están calentando aquí (${tv})` : `Summers are not warming here (${tv})` };
  }
  return {
    icon: "heat",
    text: es
      ? `${proven ? "Los veranos se calientan" : "Los veranos podrían estar calentándose (no demostrado)"} ${tv} → los paneles pierden en torno a un ${pv} por década`
      : `${proven ? "Summers are warming" : "Summers may be warming (not proven)"} ${tv} → panels lose about ${pv} per decade`,
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
        ? `Solo el ${pct} de esta zona tiene sensibilidad ambiental baja o moderada: casi todo es sensible o protegido (MITECO)`
        : `Only ${pct} of this area has low/moderate environmental sensitivity: most of it is sensitive or protected (MITECO)`,
    };
  return {
    icon: "leaf",
    text: es
      ? `El ${pct} de esta zona tiene sensibilidad ambiental baja o moderada (MITECO)`
      : `${pct} of this area has low/moderate environmental sensitivity (MITECO)`,
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
  toggleMiteco: "Protected / not recommended (MITECO)",
  toggleMitecoHint: "Official environmental sensitivity map",
  togglePlants: "Real plants",
  togglePlantsHint: "Operating (dot) and under construction (ring), sized by MW",
  legendGood: "Promising: look here first",
  legendMixed: "Mixed: possible, with a weak point",
  legendAvoid: "Not a priority",
  legendNote: "One colour per NASA grid cell (~50 km). Multiple-testing control: Benjamini–Hochberg FDR.",
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
  toggleMiteco: "Protegido / no recomendado (MITECO)",
  toggleMitecoHint: "Mapa oficial de sensibilidad ambiental",
  togglePlants: "Plantas reales",
  togglePlantsHint: "En operación (punto) y en construcción (anillo), tamaño según MW",
  legendGood: "Prometedora: mira aquí primero",
  legendMixed: "Mixta: posible, con un punto débil",
  legendAvoid: "No prioritaria",
  legendNote: "Un color por celda de la malla NASA (~50 km). Control de pruebas múltiples: FDR de Benjamini–Hochberg.",
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
