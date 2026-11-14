import type { EnergyResearchCase } from "@/lib/globe/energy-research-cases";
import type { Locale } from "./messages";

/** Display copy for a research case. Numbers stay the English source strings' figures, restated in Spanish. */
export type CaseNarrative = {
  whySelected: string;
  where: string;
  nasaWhat: string;
  when: string;
  techFrameNote: string;
  historicalEvidence: string;
  currentContext: string;
  futureHorizon: string;
  significanceNote: string;
  limitations: readonly string[];
  doNotConclude: string;
  installationsNote: string;
  units: string;
};

const SHARED_WHAT_ES =
  "Días al año en los que tanto ALLSKY_SFC_SW_DWN diario (CERES SYN1deg, kWh m⁻² día⁻¹) como WS50M diario (MERRA-2, m s⁻¹) caen por debajo de su propio percentil mensual 20 (referencia 2001–2020).";
const SHARED_WHEN_ES = "2001–2025, años civiles, datos diarios en hora solar local. 25 años completos. POWER de 2026 excluido.";

const CASE_ES: Record<string, CaseNarrative> = {
  "case-r0-joint-low": {
    whySelected: "Agregado nacional preregistrado (ENERGY_RESEARCH.md §0), antes de descargar los datos regionales.",
    where: "Península y Baleares: media regional NASA POWER (solar 1°, viento 0,5° × 0,625°).",
    nasaWhat: SHARED_WHAT_ES,
    when: SHARED_WHEN_ES,
    techFrameNote: "Marco de investigación para preguntas de recurso fotovoltaico, eólico terrestre o híbrido. Recurso ≠ generación.",
    historicalEvidence:
      "Pendiente 0,0 días/década (IC −1,85 a +2,16). Evidencia insuficiente de una tendencia. Los mínimos conjuntos ocurren aproximadamente la mitad de lo que sugeriría la independencia (descriptivo, no es una tendencia).",
    currentContext: "Esta aplicación no tiene un inventario nacional de plantas. No leas este mapa como la flota completa de España.",
    futureHorizon:
      "2032–2040 es solo una ventana de discusión de planificación. Esta serie no predice el tiempo de 2040, la generación ni dónde construir.",
    significanceNote:
      "No es estadísticamente significativo. El resultado honesto de la Puerta B es evidencia insuficiente en 5/5 regiones preregistradas (familia BH q = 0,10).",
    limitations: [
      "Mallas gruesas; 25 años y potencia limitada.",
      "La complementariedad es descriptiva.",
      "Las fichas siguen siendo EXPLORATORIAS hasta una segunda revisión.",
    ],
    doNotConclude: "No es generación, ni fiabilidad de la red, ni idoneidad de un emplazamiento, ni un pronóstico.",
    installationsNote: "No se muestran plantas: este caso es nacional y el registro es solo de Castilla y León.",
    units: "días por década",
  },
  "case-es11-joint-low": {
    whySelected:
      "Contraste atlántico nuboso y ventoso del noroeste, preregistrado antes de ver los resultados. No se eligió por la capacidad instalada.",
    where: "Galicia (NUTS-2 ES11). Media regional NASA POWER: no es una planta ni una parcela.",
    nasaWhat: SHARED_WHAT_ES,
    when: SHARED_WHEN_ES,
    techFrameNote: "Marco: preguntas de recurso eólico terrestre. No es un ranking frente a otras comunidades. Recurso ≠ generación.",
    historicalEvidence:
      "Pendiente −0,87 días/década (IC −2,92 a +1,33). Evidencia insuficiente. Razón de complementariedad 0,51 (descriptiva).",
    currentContext:
      "Esta aplicación no tiene un registro de plantas de Galicia. No se deben inferir aerogeneradores existentes a partir de las celdas NASA.",
    futureHorizon: "2032–2040 puede comentarse como horizonte de planificación. La pendiente histórica no es un pronóstico eólico para 2040.",
    significanceNote: "No es significativo (p = 0,44, p BH = 0,79). El IC incluye el cero. No llames a Galicia «en mejora».",
    limitations: ["Mallas gruesas.", "La diferencia frente a otras comunidades no se ha contrastado.", "EXPLORATORIO pendiente de revisión."],
    doNotConclude: "No es generación, ni idoneidad de un emplazamiento, ni un pronóstico.",
    installationsNote: "Este producto no tiene una capa de plantas para Galicia.",
    units: "días por década",
  },
  "case-es41-joint-low": {
    whySelected: "Contraste de meseta continental, preregistrado antes de los datos. No se eligió porque las plantas sean densas.",
    where: "Castilla y León (NUTS-2 ES41). Media NASA POWER sobre unas 10 celdas solares y unas 33 de viento: no es escala de parcela.",
    nasaWhat: SHARED_WHAT_ES,
    when: SHARED_WHEN_ES,
    techFrameNote:
      "Marco: fotovoltaica, eólica terrestre o híbrida. Los 652 puntos del registro son contexto, no una prueba NASA de que la región sea «prometedora».",
    historicalEvidence:
      "Pendiente 0,0 días/década (IC −1,55 a +1,67). Evidencia insuficiente. Razón de complementariedad 0,43 (descriptiva).",
    currentContext:
      "Esta aplicación solo tiene registro de plantas para Castilla y León (652 eólicas y fotovoltaicas en operación). No es un inventario nacional y no significa que Castilla y León esté singularmente saturada.",
    futureHorizon: "Aquí no se predice 2032–2040. Las plantas existentes no validan la producción futura ni emplazamientos nuevos.",
    significanceNote: "El hallazgo NASA no es significativo. La densidad de plantas en el mapa es una capa administrativa, no el resultado de la tendencia.",
    limitations: [
      "El registro es solo de Castilla y León: no se puede comparar la densidad de plantas con Galicia o Andalucía.",
      "La diferencia frente a Aragón no se ha contrastado.",
      "EXPLORATORIO pendiente de revisión.",
    ],
    doNotConclude: "No es generación, ni idoneidad de un emplazamiento, ni «esta región será prometedora».",
    installationsNote: "652 instalaciones registradas en operación (378 fotovoltaicas, 274 eólicas). Los MW registrados no son MWh. Solo Castilla y León.",
    units: "días por década",
  },
  "case-es24-joint-low": {
    whySelected: "Contraste del valle del Ebro y del cierzo, preregistrado antes de ver los resultados.",
    where: "Aragón (NUTS-2 ES24). Media regional NASA POWER: no es una planta.",
    nasaWhat: SHARED_WHAT_ES,
    when: SHARED_WHEN_ES,
    techFrameNote: "Marco: preguntas de recurso eólico terrestre (corredor del Ebro). No es una recomendación de emplazamiento.",
    historicalEvidence:
      "Pendiente +0,52 días/década (IC −1,88 a +2,50). Evidencia insuficiente. Razón de complementariedad 0,79: sigue por debajo de la independencia y es más alta que en Castilla y León (descriptivo; la diferencia no se ha contrastado).",
    currentContext: "Esta aplicación no tiene un registro de plantas de Aragón.",
    futureHorizon:
      "Un recuento histórico más alto de mínimos conjuntos no es un pronóstico para 2040 ni la afirmación contrastada de que sea «peor para plantas híbridas».",
    significanceNote: "No es significativo. No leas la pendiente +0,52 como un aumento: el IC incluye el cero y valores negativos.",
    limitations: ["La diferencia frente a Castilla y León no se ha contrastado.", "EXPLORATORIO pendiente de revisión."],
    doNotConclude: "No es generación, ni idoneidad de un emplazamiento, ni un pronóstico.",
    installationsNote: "Este producto no tiene una capa de plantas para Aragón.",
    units: "días por década",
  },
  "case-es61-joint-low": {
    whySelected: "Contraste meridional de alta insolación, preregistrado antes de ver los resultados.",
    where: "Andalucía (NUTS-2 ES61). Media regional NASA POWER: no es una planta. Los vuelos al Mulhacén son parques, no emplazamientos.",
    nasaWhat: SHARED_WHAT_ES,
    when: SHARED_WHEN_ES,
    techFrameNote: "Marco: preguntas de recurso fotovoltaico. No es «la mejor región solar»: esa comparación no se ha contrastado.",
    historicalEvidence:
      "Pendiente −1,14 días/década (IC −3,33 a +0,75). Evidencia insuficiente. Razón de complementariedad 0,52 (descriptiva).",
    currentContext: "Esta aplicación no tiene un registro de plantas de Andalucía. No trates los hitos de los parques como candidatos energéticos.",
    futureHorizon: "2032–2040 no es un pronóstico de rendimiento solar. La pendiente de Sen histórica no debe extenderse hasta 2040.",
    significanceNote: "No es significativo (el IC incluye el cero). Una pendiente negativa no es un descenso respaldado.",
    limitations: ["Los parques son solo navegación.", "EXPLORATORIO pendiente de revisión."],
    doNotConclude: "No es generación, ni idoneidad de un emplazamiento, ni un pronóstico.",
    installationsNote: "Este producto no tiene una capa de plantas para Andalucía.",
    units: "días por década",
  },
};

export function caseNarrative(study: EnergyResearchCase, locale: Locale): CaseNarrative {
  if (locale === "es") {
    const translated = CASE_ES[study.id];
    if (translated) return translated;
  }
  return {
    whySelected: study.whySelected,
    where: study.where,
    nasaWhat: study.nasaWhat,
    when: study.when,
    techFrameNote: study.techFrameNote,
    historicalEvidence: study.historicalEvidence,
    currentContext: study.currentContext,
    futureHorizon: study.futureHorizon,
    significanceNote: study.significanceNote,
    limitations: study.limitations,
    doNotConclude: study.doNotConclude,
    installationsNote: study.installationsNote,
    units: study.primary.units,
  };
}

type CardFace = {
  question: string;
  outcome_label: string;
  what: string;
  where: string;
  when: string;
  do_not_conclude: string;
  limitations: readonly string[];
  method: string;
  seriesLabel: string;
  units: string;
  status: string;
  nullModel: string;
  sourceRole: string;
};

const LIMIT_ES: Record<string, string> = {
  "Reanalysis (model + data assimilation), ~50 km cells: not a station measurement.":
    "Reanálisis (modelo + asimilación de datos), celdas de unos 50 km: no es una medición de estación.",
  "26 years; magnitude depends on the window (range shown), the sign does not.":
    "26 años; la magnitud depende de la ventana (se muestra el rango) y el signo no.",
  "Solar is a 1° satellite-derived product (CERES SYN1deg); wind is MERRA-2 reanalysis with known biases (underestimates Mediterranean wind power).":
    "El solar es un producto derivado de satélite a 1° (CERES SYN1deg); el viento es reanálisis MERRA-2 con sesgos conocidos (subestima la potencia eólica mediterránea).",
  "Daily totals and means; sub-daily lulls are not resolved.":
    "Totales y medias diarios; no se resuelven las calmas subdiarias.",
  "25 annual values: limited power to detect small trends.":
    "25 valores anuales: potencia limitada para detectar tendencias pequeñas.",
  "Pre-registered single definition (P20); sensitivity to P10/P30 shown above.":
    "Definición única preregistrada (P20); arriba se muestra la sensibilidad a P10/P30.",
  "Confirmatory family: 5 pre-registered regions, Benjamini–Hochberg adjusted.":
    "Familia confirmatoria: 5 regiones preregistradas, ajuste de Benjamini–Hochberg.",
};

const ROLE_ES: Record<string, string> = {
  "monthly 2 m air temperature": "temperatura del aire a 2 m, mensual",
  "daily solar insolation": "insolación solar diaria",
  "daily 50 m wind speed": "velocidad del viento a 50 m, diaria",
};

const NULL_ES =
  "sustitutos por desplazamiento de año (el solar de un año frente al viento de otro; conserva la estacionalidad y la persistencia)";

function limitLineEs(line: string): string {
  const cells = /^Regional support: ≈([0-9.]+) effective 1° solar cells and ≈([0-9.]+) effective wind cells\.$/.exec(line);
  if (cells?.[1] && cells[2]) {
    const solar = cells[1].replace(".", ",");
    const wind = cells[2].replace(".", ",");
    return `Soporte regional: ≈${solar} celdas solares efectivas de 1° y ≈${wind} celdas eólicas efectivas.`;
  }
  return LIMIT_ES[line] ?? line;
}

const METHOD_EN =
  "Theil-Sen slope + Gilbert 95% CI; Mann-Kendall (ties-corrected), no autocorrelation correction needed";
const METHOD_ES =
  "Pendiente Theil–Sen + IC de Gilbert al 95 %; Mann–Kendall (corregido por empates); no hizo falta corrección por autocorrelación";

const STATUS_ES: Record<string, string> = {
  "EXPLORATORY until reviewed (Gate 2); D36 still PROPOSED":
    "EXPLORATORIO hasta la revisión (Puerta 2); D36 sigue PROPUESTO",
  "EXPLORATORY until reviewed by a second team member (Gate 3)":
    "EXPLORATORIO hasta la revisión de una segunda persona del equipo (Puerta 3)",
};

export function localizeCardFace(
  card: {
    topic: "temperature" | "joint_low";
    region: { name: string };
    question: string;
    outcome_label: string;
    what: string;
    where: string;
    when: string;
    do_not_conclude: string;
    limitations: readonly string[];
    evidence: { method: string };
    series: { label: string };
    how_much: { units: string };
    status: string;
    complementarity?: { null_model: string };
    sources: readonly { role: string }[];
  },
  locale: Locale,
): CardFace {
  const role = card.sources[0]?.role ?? "";
  if (locale === "en") {
    return {
      question: card.question,
      outcome_label: card.outcome_label,
      what: card.what,
      where: card.where,
      when: card.when,
      do_not_conclude: card.do_not_conclude,
      limitations: card.limitations,
      method: card.evidence.method,
      seriesLabel: card.series.label,
      units: card.how_much.units,
      status: card.status,
      nullModel: card.complementarity?.null_model ?? "",
      sourceRole: role,
    };
  }
  const region = card.region.name === "Peninsula + Balearics" ? "Península y Baleares" : card.region.name;
  const outcome =
    card.outcome_label === "Supported increase"
      ? "Aumento respaldado"
      : card.outcome_label === "Supported decrease"
        ? "Descenso respaldado"
        : card.outcome_label === "Insufficient evidence"
          ? "Evidencia insuficiente"
          : card.outcome_label === "No robust trend detected"
            ? "No se detecta una tendencia robusta"
            : card.outcome_label;
  const question =
    card.topic === "temperature"
      ? "¿Ha cambiado la temperatura del aire cerca de la superficie en la España peninsular y Baleares desde 2000?"
      : `¿Los días con recurso solar y eólico conjuntamente bajo se han vuelto más o menos frecuentes en ${region} desde 2001?`;
  const what =
    card.topic === "temperature"
      ? "Temperatura media anual del aire a 2 m (reanálisis MERRA-2)"
      : "Días al año en los que TANTO la insolación solar diaria COMO la velocidad media diaria del viento a 50 m caen por debajo de su propio percentil mensual 20 (referencia 2001–2020)";
  const where =
    card.topic === "temperature"
      ? "Península y Baleares: media ponderada por área de celdas de 0,5° × 0,625°"
      : `${region}: media regional de celdas NASA POWER (solar 1° × 1°, viento 0,5° × 0,625°)`;
  const when =
    card.topic === "temperature"
      ? "2000–2025, años civiles completos"
      : "2001–2025, años civiles, datos diarios en hora solar local";
  const doNot =
    card.topic === "temperature"
      ? "No es una causa del calentamiento, ni un pronóstico, ni evidencia sobre producción energética."
      : "No es generación eléctrica, ni fiabilidad de la red o riesgo de apagón, ni idoneidad de un emplazamiento, ni un pronóstico.";
  return {
    question,
    outcome_label: outcome,
    what,
    where,
    when,
    do_not_conclude: doNot,
    limitations: card.limitations.map(limitLineEs),
    method: card.evidence.method === METHOD_EN ? METHOD_ES : card.evidence.method,
    seriesLabel: card.series.label === "Annual mean T2M" ? "T2M media anual" : card.series.label === "Joint-low days" ? "Días de mínimo conjunto" : card.series.label,
    units:
      card.how_much.units === "°C per decade"
        ? "°C por década"
        : card.how_much.units === "days per decade"
          ? "días por década"
          : card.how_much.units,
    status: STATUS_ES[card.status] ?? card.status,
    nullModel:
      card.complementarity?.null_model ===
      "year-shift surrogates (solar of one year vs wind of another; keeps seasonality and persistence)"
        ? NULL_ES
        : (card.complementarity?.null_model ?? ""),
    sourceRole: ROLE_ES[role] ?? role,
  };
}

export function localizeOutcomeLabel(label: string, locale: Locale): string {
  if (locale === "en") return label;
  if (label === "Supported increase") return "Aumento respaldado";
  if (label === "Supported decrease") return "Descenso respaldado";
  if (label === "Insufficient evidence") return "Evidencia insuficiente";
  if (label === "No robust trend detected") return "No se detecta una tendencia robusta";
  return label;
}

/** Region display name. Only the national aggregate has an English name; the rest are proper names. */
export function localizeRegionName(name: string, locale: Locale): string {
  return locale === "es" && name === "Peninsula + Balearics" ? "Península y Baleares" : name;
}

/** Series label and units as written by the pipeline, restated in Spanish (no value changes). */
export function localizeSeriesLabel(label: string, locale: Locale): string {
  if (locale === "en") return label;
  if (label === "Annual mean T2M") return "T2M media anual";
  if (label === "Joint-low days") return "Días de mínimo conjunto";
  return label;
}

export function localizeSeriesUnits(units: string, locale: Locale): string {
  if (locale === "en") return units;
  if (units === "days per year") return "días por año";
  if (units === "days per decade") return "días por década";
  if (units === "°C per decade") return "°C por década";
  return units;
}

/**
 * E0 resource-context line, e.g. "+0.032 (CI −0.018 to +0.097; p = 0.13) kWh m⁻² day⁻¹ per decade".
 * Spanish restates the same figures with a decimal comma; the numbers themselves are untouched.
 */
export function localizeResourceContext(text: string, locale: Locale): string {
  if (locale === "en") return text;
  return text
    .replace(/(\d)\.(\d)/g, "$1,$2")
    .replace("(CI ", "(IC ")
    .replace(" to ", " a ")
    .replace("day⁻¹", "día⁻¹")
    .replace(" per decade", " por década");
}
