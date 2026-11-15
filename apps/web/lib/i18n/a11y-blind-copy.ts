import type { Locale } from "./messages";

/**
 * EN/ES copy for the blind / low-vision part of the inclusive mode (agent B): skip link, landmark
 * names, "Map in words", read-aloud and screen-reader announcements. Render-only: every number shown
 * here is passed in from published artifacts; nothing is computed in this file.
 */

export type VerdictGroup = "good" | "mixed" | "avoid";

export interface BlindCopy {
  skipToMain: string;
  mapControls: string;
  mainActions: string;
  panelsRegion: string;
  mapToolsRegion: string;
  /** aria-label of the globe container (role="img"). */
  globeSolar: (good: number, mixed: number, avoid: number) => string;
  globeClimate: (variable: string, period: string) => string;
  globeLoading: string;
  globeKeys: string;

  mapInWords: string;
  mapInWordsShow: string;
  mapInWordsHide: string;
  mapInWordsIntro: string;
  mapInWordsSolarHeading: string;
  mapInWordsClimateHeading: string;
  mapInWordsLoading: string;
  groupHeading: Record<VerdictGroup, (n: number) => string>;
  verdictWord: Record<VerdictGroup, string>;
  zoneLine: (region: string, sunshine: string) => string;
  nearRegion: (name: string) => string;
  sunshineUnit: string;
  noSunshine: string;
  select: string;
  selectAria: (region: string, zoneId: string) => string;
  selectedMark: string;
  noDataZones: (n: number) => string;
  climateVariable: (v: string) => string;
  climatePeriod: (p: string) => string;
  trendPeriod: (from: number, to: number) => string;
  yearPeriod: (y: number) => string;
  spainTrend: (variable: string, sign: "up" | "down" | "flat", amount: string, units: string, from: number, to: number, significant: boolean) => string;
  noSpainTrend: string;
  climateHint: string;
  solarHint: string;

  readAloud: string;
  readAloudAria: (what: string) => string;
  stopReading: string;
  readingStarted: string;
  readingStopped: string;

  panelOpened: (name: string) => string;
  panelClosed: (name: string) => string;
  layerToggled: (name: string, on: boolean) => string;
  zoneSelected: (region: string, verdict: string) => string;
  plantSelected: (name: string) => string;
  dataLoaded: (name: string) => string;
  dataFailed: (name: string) => string;
  globeReady: string;
  globeFailed: string;
  solarData: string;
  climateData: string;
  trendPanel: string;
  findingsCard: (question: string) => string;
  zoneCard: string;
  tileCard: (label: string) => string;
  mapLayer: string;
  stationsLayer: string;
}

const EN: BlindCopy = {
  skipToMain: "Skip to main content",
  mapControls: "Map controls",
  mainActions: "Main actions",
  panelsRegion: "Information panels",
  mapToolsRegion: "Map tools and camera",
  globeSolar: (g, m, a) =>
    `3D globe of Spain showing the solar screening map: ${g} green zones (promising), ${m} amber zones (mixed) and ${a} red zones (not a priority). The same zones are listed in "Map in words".`,
  globeClimate: (v, p) => `3D globe of Spain showing the climate map: ${v}, ${p}. A text description is in "Map in words".`,
  globeLoading: "3D globe of Spain, loading.",
  globeKeys: " Keyboard: arrow keys rotate and tilt, plus and minus zoom, N resets north.",

  mapInWords: "Map in words",
  mapInWordsShow: "Map in words",
  mapInWordsHide: "Hide map in words",
  mapInWordsIntro: "A text version of what the globe shows. Every map action is also available here as a button.",
  mapInWordsSolarHeading: "Solar screening zones",
  mapInWordsClimateHeading: "Climate map",
  mapInWordsLoading: "Loading map data…",
  groupHeading: {
    good: (n) => `Green · promising (${n} zones)`,
    mixed: (n) => `Amber · mixed (${n} zones)`,
    avoid: (n) => `Red · not a priority (${n} zones)`,
  },
  verdictWord: { good: "promising", mixed: "mixed", avoid: "not a priority" },
  zoneLine: (r, s) => `${r} · sunshine ${s}`,
  nearRegion: (n) => `off the coast near ${n}`,
  sunshineUnit: "kWh/m² per day",
  noSunshine: "no sunshine value",
  select: "Select",
  selectAria: (r, id) => `Select zone ${id}, ${r}, on the map`,
  selectedMark: "selected",
  noDataZones: (n) => `${n} zones are mostly sea or outside Spain and are not part of the screen.`,
  climateVariable: (v) => `Variable: ${v}.`,
  climatePeriod: (p) => `Period: ${p}.`,
  trendPeriod: (a, b) => `trend ${a}–${b}`,
  yearPeriod: (y) => `year ${y}`,
  spainTrend: (v, sign, amount, units, a, b, sig) =>
    sign === "flat"
      ? `Spain-wide (Peninsula and Balearics), ${v} shows no change ${a}–${b}.`
      : `Spain-wide (Peninsula and Balearics), ${v} went ${sign === "up" ? "up" : "down"} by ${amount} ${units} per decade from ${a} to ${b}. ${sig ? "This trend is statistically significant." : "This trend is not statistically significant: it could be chance."}`,
  noSpainTrend: "No Spain-wide trend is published for this variable.",
  climateHint: "Use the map controls to change variable or year, and the Trend button for the numbers behind it.",
  solarHint: "Choose Select on any zone: the globe flies there and the zone card opens in the solar panel.",

  readAloud: "Read aloud",
  readAloudAria: (w) => `Read aloud: ${w}`,
  stopReading: "Stop reading",
  readingStarted: "Reading aloud.",
  readingStopped: "Stopped reading.",

  panelOpened: (n) => `${n} opened.`,
  panelClosed: (n) => `${n} closed.`,
  layerToggled: (n, on) => `${n} ${on ? "shown" : "hidden"} on the map.`,
  zoneSelected: (r, v) => `Zone selected: ${r}, ${v}. Its card is open in the solar panel.`,
  plantSelected: (n) => `Solar plant selected: ${n}.`,
  dataLoaded: (n) => `${n} loaded.`,
  dataFailed: (n) => `${n} could not be loaded.`,
  globeReady: "Globe ready.",
  globeFailed: "The 3D globe could not start. All panels still work.",
  solarData: "Solar screening data",
  climateData: "Climate data",
  trendPanel: "Trend panel",
  findingsCard: (q) => `finding "${q}"`,
  zoneCard: "this zone card",
  tileCard: (l) => `summary "${l}"`,
  mapLayer: "Climate colour map",
  stationsLayer: "Weather stations",
};

const ES: BlindCopy = {
  skipToMain: "Saltar al contenido principal",
  mapControls: "Controles del mapa",
  mainActions: "Acciones principales",
  panelsRegion: "Paneles de información",
  mapToolsRegion: "Herramientas del mapa y cámara",
  globeSolar: (g, m, a) =>
    `Globo 3D de España con el mapa de cribado solar: ${g} zonas verdes (prometedoras), ${m} ámbar (mixtas) y ${a} rojas (no prioritarias). Las mismas zonas están listadas en «Mapa en palabras».`,
  globeClimate: (v, p) => `Globo 3D de España con el mapa climático: ${v}, ${p}. Hay una descripción en texto en «Mapa en palabras».`,
  globeLoading: "Globo 3D de España, cargando.",
  globeKeys: " Teclado: las flechas giran e inclinan, más y menos hacen zoom, N orienta al norte.",

  mapInWords: "Mapa en palabras",
  mapInWordsShow: "Mapa en palabras",
  mapInWordsHide: "Ocultar mapa en palabras",
  mapInWordsIntro: "Versión en texto de lo que muestra el globo. Cada acción del mapa también está aquí como botón.",
  mapInWordsSolarHeading: "Zonas del cribado solar",
  mapInWordsClimateHeading: "Mapa climático",
  mapInWordsLoading: "Cargando datos del mapa…",
  groupHeading: {
    good: (n) => `Verde · prometedoras (${n} zonas)`,
    mixed: (n) => `Ámbar · mixtas (${n} zonas)`,
    avoid: (n) => `Rojo · no prioritarias (${n} zonas)`,
  },
  verdictWord: { good: "prometedora", mixed: "mixta", avoid: "no prioritaria" },
  zoneLine: (r, s) => `${r} · sol ${s}`,
  nearRegion: (n) => `frente a la costa, cerca de ${n}`,
  sunshineUnit: "kWh/m² al día",
  noSunshine: "sin dato de sol",
  select: "Seleccionar",
  selectAria: (r, id) => `Seleccionar la zona ${id}, ${r}, en el mapa`,
  selectedMark: "seleccionada",
  noDataZones: (n) => `${n} zonas son sobre todo mar o quedan fuera de España y no forman parte del cribado.`,
  climateVariable: (v) => `Variable: ${v}.`,
  climatePeriod: (p) => `Periodo: ${p}.`,
  trendPeriod: (a, b) => `tendencia ${a}–${b}`,
  yearPeriod: (y) => `año ${y}`,
  spainTrend: (v, sign, amount, units, a, b, sig) =>
    sign === "flat"
      ? `En el conjunto de España (Península y Baleares), ${v} no cambia entre ${a} y ${b}.`
      : `En el conjunto de España (Península y Baleares), ${v} ${sign === "up" ? "sube" : "baja"} ${amount} ${units} por década entre ${a} y ${b}. ${sig ? "La tendencia es estadísticamente significativa." : "La tendencia no es estadísticamente significativa: podría ser azar."}`,
  noSpainTrend: "No hay una tendencia publicada para toda España en esta variable.",
  climateHint: "Usa los controles del mapa para cambiar variable o año, y el botón Tendencia para ver las cifras.",
  solarHint: "Pulsa Seleccionar en cualquier zona: el globo vuela hasta ella y su ficha se abre en el panel solar.",

  readAloud: "Leer en voz alta",
  readAloudAria: (w) => `Leer en voz alta: ${w}`,
  stopReading: "Detener lectura",
  readingStarted: "Leyendo en voz alta.",
  readingStopped: "Lectura detenida.",

  panelOpened: (n) => `${n}: abierto.`,
  panelClosed: (n) => `${n}: cerrado.`,
  layerToggled: (n, on) => `${n}: ${on ? "visible" : "oculto"} en el mapa.`,
  zoneSelected: (r, v) => `Zona seleccionada: ${r}, ${v}. Su ficha está abierta en el panel solar.`,
  plantSelected: (n) => `Planta solar seleccionada: ${n}.`,
  dataLoaded: (n) => `${n}: cargados.`,
  dataFailed: (n) => `${n}: no se pudieron cargar.`,
  globeReady: "Globo listo.",
  globeFailed: "El globo 3D no pudo iniciarse. Todos los paneles siguen funcionando.",
  solarData: "Datos del cribado solar",
  climateData: "Datos climáticos",
  trendPanel: "Panel de tendencia",
  findingsCard: (q) => `hallazgo «${q}»`,
  zoneCard: "esta ficha de zona",
  tileCard: (l) => `resumen «${l}»`,
  mapLayer: "Mapa de color climático",
  stationsLayer: "Estaciones meteorológicas",
};

export function blindCopy(locale: Locale): BlindCopy {
  return locale === "es" ? ES : EN;
}
