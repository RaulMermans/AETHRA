import type { GiovanniDustFile, PvCell, PvRegionValidation, PvScreeningFile, SolarCapacityTrendFile } from "@/lib/globe/pv-screening";
import type { Locale } from "./messages";
import { formatScreeningNumber as fmt, formatScreeningP as fmtP } from "./screening-copy";

/**
 * Executive summary for the solar screen (EN + ES): seven indicators in a fixed reading order.
 * Every number comes from a pipeline JSON; this file only chooses words and formats values.
 * Technical vocabulary (Theil–Sen, p, FDR, AOT…) is confined to the "How we know" rows.
 */

export type ExecTileId = "boom" | "where" | "reality" | "heat" | "sun" | "dust" | "outside";
export type ExecTone = "positive" | "caution" | "neutral" | "missing";

export interface ExecTile {
  id: ExecTileId;
  label: string;
  value: string;
  valueNote?: string;
  meaning: string;
  hint: string;
  tone: ExecTone;
  /** Optional series to draw as a small bar strip (values exactly as published). */
  series?: { years: number[]; values: number[]; unit: string };
  how: { method: string; rows: { label: string; value: string }[]; source: string; sourceUrl?: string };
}

export interface ExecFacts {
  screening: PvScreeningFile;
  featured: PvCell | null;
  /** Count of zones that entered the summer-temperature false-alarm check (rows with a BH p-value). */
  tTested: number;
  capacity: SolarCapacityTrendFile | null;
  dust: GiovanniDustFile | null;
  validation: PvRegionValidation | null;
}

export interface ExecCopy {
  heading: string;
  intro: string;
  howWeKnow: string;
  decision: string;
  sourceLabel: string;
  glossaryHeading: string;
  glossary: { term: string; text: string }[];
  tiles: (f: ExecFacts) => ExecTile[];
}

const int = (l: Locale, v: number) => fmt(l, v, 0);
const range = (l: Locale, a: [number, number], d: number, unit: string) => `${fmt(l, a[0], d, true)} … ${fmt(l, a[1], d, true)} ${unit}`;

function tiles(l: Locale, f: ExecFacts): ExecTile[] {
  const es = l === "es";
  const s = f.screening.summary;
  const period = f.screening.period;
  const per = `${period[0]}–${period[1]}`;
  const dec = es ? "década" : "decade";
  const c = f.featured;
  const out: ExecTile[] = [];

  // a) National boom (Eurostat). Graceful placeholder while the file is missing.
  const cap = f.capacity;
  if (cap) {
    const sp = cap.spain;
    const recent = sp.trend_recent ?? sp.trend_full;
    const rows: { label: string; value: string }[] = [];
    for (const [name, t] of [[es ? "Tendencia completa" : "Full-period trend", sp.trend_full], [es ? "Tendencia reciente" : "Recent trend", sp.trend_recent]] as const) {
      if (!t) continue;
      rows.push({
        label: `${name} (${t.period[0]}–${t.period[1]})`,
        value: `${fmt(l, t.sen_mw_per_year, 0, true)} MW/${es ? "año" : "yr"} · ${es ? "rango probable 95 %" : "likely range 95%"} ${range(l, t.ci95, 0, "MW/" + (es ? "año" : "yr"))} · p ${fmtP(l, t.p)} · ${t.significant ? (es ? "probada" : "proven") : (es ? "no probada" : "not proven")}`,
      });
    }
    if (sp.added_mw_trend) {
      const a = sp.added_mw_trend;
      rows.push({
        label: es ? `Ritmo de instalación (${a.period[0]}–${a.period[1]})` : `Pace of new installs (${a.period[0]}–${a.period[1]})`,
        value: `${fmt(l, a.sen_mw_per_year2, 0, true)} MW/${es ? "año²" : "yr²"} · ${es ? "rango probable" : "likely range"} ${range(l, a.ci95, 0, "")} · p ${fmtP(l, a.p)} · ${a.significant ? (es ? "probado" : "proven") : (es ? "no probado" : "not proven")}`,
      });
    }
    if (sp.cagr_pct) rows.push({ label: es ? `Crecimiento medio anual (${sp.cagr_pct.period[0]}–${sp.cagr_pct.period[1]})` : `Average yearly growth (${sp.cagr_pct.period[0]}–${sp.cagr_pct.period[1]})`, value: `${fmt(l, sp.cagr_pct.value, 1)} %` });
    if (typeof sp.doubling_years === "number") rows.push({ label: es ? "Se duplica cada" : "Doubles every", value: `${fmt(l, sp.doubling_years, 1)} ${es ? "años" : "years"}` });
    if (cap.eu) rows.push({ label: es ? `UE ${cap.eu.year}` : `EU ${cap.eu.year}`, value: `#${cap.eu.spain_rank} / ${cap.eu.n_countries}${cap.eu.spain_share_pct !== undefined ? ` · ${fmt(l, cap.eu.spain_share_pct, 1)} % ${es ? "del total UE" : "of EU total"}` : ""}` });
    const growth = sp.cagr_pct
      ? es ? `Crece de media un ${fmt(l, sp.cagr_pct.value, 1)} % al año (${sp.cagr_pct.period[0]}–${sp.cagr_pct.period[1]})` : `Growing ${fmt(l, sp.cagr_pct.value, 1)}% a year on average (${sp.cagr_pct.period[0]}–${sp.cagr_pct.period[1]})`
      : "";
    const trendLine = recent
      ? recent.significant
        ? es ? `; la subida de ~${int(l, recent.sen_mw_per_year)} MW/año desde ${recent.period[0]} está probada.` : `; the rise of ~${int(l, recent.sen_mw_per_year)} MW per year since ${recent.period[0]} is proven.`
        : es ? `; la subida desde ${recent.period[0]} aún no está probada estadísticamente.` : `; the rise since ${recent.period[0]} is not statistically proven yet.`
      : ".";
    out.push({
      id: "boom",
      label: es ? "El auge solar de España" : "Spain's solar boom",
      value: `${int(l, sp.latest.mw)} MW`,
      valueNote: cap.eu ? (es ? `n.º ${cap.eu.spain_rank} de ${cap.eu.n_countries} en la UE (${cap.eu.year})` : `#${cap.eu.spain_rank} of ${cap.eu.n_countries} in the EU (${cap.eu.year})`) : undefined,
      meaning: (es ? `Potencia de paneles solares instalada en España a final de ${sp.latest.year}. ` : `Solar-panel power installed in Spain at the end of ${sp.latest.year}. `) + (growth ? growth + trendLine : ""),
      hint: es ? "España sigue sumando solar deprisa; las zonas verdes son donde la evidencia dice mirar primero." : "Spain keeps adding solar fast; the green zones are where the evidence says to look first.",
      tone: "positive",
      series: { years: sp.years, values: sp.mw, unit: "MW" },
      how: {
        method: recent?.method ?? sp.trend_full?.method ?? (es ? "Pendiente de Theil–Sen con prueba de Mann–Kendall sobre la potencia anual." : "Theil–Sen slope with a Mann–Kendall test on yearly capacity."),
        rows: [...rows, { label: es ? "Ojo" : "Note", value: es ? "Potencia instalada (MW) no es electricidad producida (MWh)." : "Installed power (MW) is not electricity produced (MWh)." }],
        source: cap.source.name,
        sourceUrl: cap.source.url,
      },
    });
  } else {
    out.push({
      id: "boom",
      label: es ? "El auge solar de España" : "Spain's solar boom",
      value: "—",
      meaning: es
        ? "Las cifras oficiales de potencia solar instalada (Eurostat) aún se están preparando. El resto del resumen no depende de ellas."
        : "Official installed solar-capacity figures (Eurostat) are still being prepared. The rest of this summary does not depend on them.",
      hint: es ? "Vuelve a abrir el panel en unos minutos." : "Reopen this panel in a few minutes.",
      tone: "missing",
      how: { method: es ? "Serie anual oficial de Eurostat (nrg_inf_epcrw), tendencia de Theil–Sen." : "Official Eurostat yearly series (nrg_inf_epcrw), Theil–Sen trend.", rows: [], source: "Eurostat nrg_inf_epcrw", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_inf_epcrw/default/table" },
    });
  }

  // b) Where to look first.
  const checked = s.cells_good + s.cells_mixed + s.cells_avoid;
  const fc = f.screening.featured_case;
  const top = c?.irr_resource_percentile != null ? Math.max(1, Math.round(100 - c.irr_resource_percentile)) : null;
  out.push({
    id: "where",
    label: es ? "Dónde mirar primero" : "Where to look first",
    value: es ? `${s.cells_good} zonas` : `${s.cells_good} zones`,
    valueNote: es ? `de ${checked} revisadas` : `of ${checked} checked`,
    meaning:
      (es ? `Zonas prometedoras (cuadros de ~50 km) con mucho sol y poco conflicto ambiental. ` : `Promising zones (~50 km squares) with strong sunshine and few environmental conflicts. `) +
      (c && top !== null && c.miteco_low_moderate_pct !== null
        ? es
          ? `Ejemplo destacado: Jaén–Granada, entre el ${top} % de zonas más soleadas de España y con el ${fmt(l, c.miteco_low_moderate_pct, 1)} % de su suelo de sensibilidad ambiental baja o moderada.`
          : `Featured example: Jaén–Granada, among the sunniest ${top}% of Spain, with ${fmt(l, c.miteco_low_moderate_pct, 1)}% of its land at low or moderate environmental sensitivity.`
        : ""),
    hint: es ? "Pon estas zonas en tu lista corta; después revisa red, suelo y permisos sobre el terreno." : "Shortlist these zones; then check grid, land and permits on site.",
    tone: "positive",
    how: {
      method: es
        ? "Verde = sol en la mitad alta de España, al menos la mitad del suelo con sensibilidad baja/moderada y sin bajada probada del sol. La regla se fijó antes de ver los resultados."
        : "Green = sunshine in Spain's upper half, at least half the land at low/moderate sensitivity, and no proven fall in sunshine. The rule was fixed before seeing the results.",
      rows: [
        { label: es ? "Verde · ámbar · rojo" : "Green · amber · red", value: `${s.cells_good} · ${s.cells_mixed} · ${s.cells_avoid}${s.cells_no_data !== undefined ? ` · ${es ? "sin datos" : "no data"} ${s.cells_no_data}` : ""}` },
        ...(c ? [
          { label: es ? "Sol medio (Jaén–Granada)" : "Average sunshine (Jaén–Granada)", value: `${fmt(l, c.irr_mean_kwh_m2_day ?? NaN, 2)} kWh/m²/${es ? "día" : "day"} · P${c.irr_resource_percentile ?? "—"} · ${per}` },
        ] : []),
        ...(fc ? [{ label: es ? `Frente a ${fc.green_cells_compared} verdes` : `Versus ${fc.green_cells_compared} green`, value: es ? `${fc.green_cells_with_more_irradiance} con más sol · ${fc.green_cells_with_more_low_moderate_land} con más suelo poco sensible · ${fc.green_cells_better_on_both} mejor en ambas` : `${fc.green_cells_with_more_irradiance} sunnier · ${fc.green_cells_with_more_low_moderate_land} more low-sensitivity land · ${fc.green_cells_better_on_both} better on both` }] : []),
        { label: es ? "Regla exacta" : "Exact rule", value: f.screening.verdict_rule ?? "—" },
      ],
      source: "NASA MERRA-2 SWGDN (DOI 10.5067/OU3HJDS973O0) · MITECO 2024",
      sourceUrl: "https://doi.org/10.5067/OU3HJDS973O0",
    },
  });

  // c) Reality check.
  if (s.operating_mw_in_good_pct !== undefined) {
    out.push({
      id: "reality",
      label: es ? "Contraste con la realidad" : "Reality check",
      value: `${fmt(l, s.operating_mw_in_good_pct, 1)} %`,
      valueNote: es ? "de la potencia solar actual, en zonas verdes" : "of today's solar capacity sits in green zones",
      meaning: es
        ? `De ${s.operating_mw_total !== undefined ? int(l, s.operating_mw_total) + " MW" : "la potencia"} de plantas solares en operación (registro de plantas de Global Energy Monitor), esa parte ya está en zonas verdes${s.operating_mw_in_avoid_pct !== undefined ? ` y el ${fmt(l, s.operating_mw_in_avoid_pct, 1)} % en rojas` : ""}.`
        : `Of the ${s.operating_mw_total !== undefined ? int(l, s.operating_mw_total) + " MW" : "capacity"} of operating solar plants (Global Energy Monitor plant register), that share already sits in green zones${s.operating_mw_in_avoid_pct !== undefined ? ` and ${fmt(l, s.operating_mw_in_avoid_pct, 1)}% in red ones` : ""}.`,
      hint: es
        ? "El sector ya construye donde apunta la evidencia; las plantas en rojo indican que la red y el suelo también pesan."
        : "Builders already favour where the evidence points; plants in red zones show grid and land also weigh in.",
      tone: "neutral",
      how: {
        method: es ? "Cada planta se asigna a la zona que contiene su punto en el mapa; el proceso de datos suma los MW por color." : "Each plant is assigned to the zone containing its map point; the data pipeline sums MW per colour.",
        rows: [
          { label: es ? "Verde · ámbar · rojo · sin datos" : "Green · amber · red · no data", value: [s.operating_mw_in_good_pct, s.operating_mw_in_mixed_pct, s.operating_mw_in_avoid_pct, s.operating_mw_in_no_data_pct].map((v) => (v === undefined ? "—" : `${fmt(l, v, 1)} %`)).join(" · ") },
          { label: es ? "Ojo" : "Note", value: es ? "Es potencia registrada (MW), no producción; no prueba rentabilidad." : "Registered power (MW), not output; it does not prove profitability." },
        ],
        source: "Global Energy Monitor, Global Solar Power Tracker, Feb 2026 (CC BY 4.0)",
        sourceUrl: "https://globalenergymonitor.org/projects/global-solar-power-tracker/",
      },
    });
  }

  // d) Heat risk.
  if (s.t_trend_c_decade_median !== undefined && s.heat_penalty_pct_decade_median !== undefined) {
    const coef = f.screening.temp_coefficient_pct_per_c;
    out.push({
      id: "heat",
      label: es ? "Riesgo por calor" : "Heat risk",
      value: `${fmt(l, s.t_trend_c_decade_median, 2, true)} °C/${dec}`,
      valueNote: s.t_cells_significant_up !== undefined ? (es ? `subida probada en ${s.t_cells_significant_up} de ${f.tTested} zonas` : `rise proven in ${s.t_cells_significant_up} of ${f.tTested} zones`) : undefined,
      meaning: es
        ? `Los veranos se calientan (zona típica, ${per}). Un panel más caliente rinde menos: ≈ ${fmt(l, Math.abs(s.heat_penalty_pct_decade_median), 2)} % menos por década solo por el calor. Es una regla orientativa, no producción calculada.`
        : `Summers are warming (typical zone, ${per}). Hotter panels produce less: ≈ ${fmt(l, Math.abs(s.heat_penalty_pct_decade_median), 2)}% less per decade from heat alone. A rule of thumb, not calculated output.`,
      hint: es ? "Pérdida pequeña pero continua: inclúyela en las hipótesis de rendimiento a 25 años." : "Small but steady loss: include it in 25-year yield assumptions.",
      tone: "caution",
      how: {
        method: es
          ? "Tendencia de Theil–Sen + prueba de Mann–Kendall por zona sobre la temperatura media de junio–agosto; revisada contra falsas alarmas entre muchas zonas (Benjamini–Hochberg, α 0,05). Valores = mediana de las zonas."
          : "Theil–Sen trend + Mann–Kendall test per zone on June–August mean temperature; checked for false alarms across many zones (Benjamini–Hochberg, α 0.05). Values = median across zones.",
        rows: [
          ...(coef !== undefined ? [{ label: es ? "Regla del panel" : "Panel rule", value: es ? `−${fmt(l, coef, 1)} % de rendimiento por cada °C` : `−${fmt(l, coef, 1)}% output per °C` }] : []),
          ...(c && c.t_trend_c_decade !== null ? [{
            label: es ? "Jaén–Granada" : "Jaén–Granada",
            value: `${fmt(l, c.t_trend_c_decade, 2, true)} °C/${dec}${c.t_ci_c_decade ? ` · ${es ? "rango probable" : "likely range"} ${range(l, c.t_ci_c_decade, 2, "°C")}` : ""} · p ${fmtP(l, c.t_p)} · ${es ? "tras control de falsas alarmas" : "after false-alarm check"} ${fmtP(l, c.t_p_bh)} · ${c.t_significant ? (es ? "probada" : "proven") : (es ? "aún no probada aquí" : "not proven here yet")}`,
          }] : []),
          { label: es ? "Mediana penalización" : "Median penalty", value: `${fmt(l, s.heat_penalty_pct_decade_median, 2, true)} %/${dec}` },
        ],
        source: "NASA MERRA-2 T2M (DOI 10.5067/AP1B0BA5PD2K)",
        sourceUrl: "https://doi.org/10.5067/AP1B0BA5PD2K",
      },
    });
  }

  // e) Sunshine trend.
  if (s.irr_cells_tested !== undefined) {
    const up = s.irr_cells_significant_up ?? 0;
    const down = s.irr_cells_significant_down ?? 0;
    const stable = up === 0 && down === 0;
    const v = f.validation;
    out.push({
      id: "sun",
      label: es ? "Tendencia del sol" : "Sunshine trend",
      value: stable ? (es ? "Estable" : "Stable") : es ? `${up} ↑ · ${down} ↓` : `${up} ↑ · ${down} ↓`,
      valueNote: es ? `sin subida ni bajada probada · ${per}` : `no proven rise or fall · ${per}`,
      meaning: stable
        ? es
          ? `Ninguna de las ${s.irr_cells_tested} zonas muestra un cambio probado del sol en ${period[1] - period[0] + 1} años. Para un proyecto de 25 años: planifica con el sol medio histórico; no cuentes con más sol, pero tampoco hay señales de menos.`
          : `None of the ${s.irr_cells_tested} zones shows a proven change in sunshine over ${period[1] - period[0] + 1} years. For a 25-year project: plan on the historical average; don't count on more sun, but there is no sign of less either.`
        : es
          ? `${up} zonas con subida probada y ${down} con bajada probada de ${s.irr_cells_tested}.`
          : `${up} zones with a proven rise and ${down} with a proven fall, out of ${s.irr_cells_tested}.`,
      hint: es ? "Usa la media histórica, no una tendencia, en los cálculos de producción." : "Use the historical average, not a trend, in yield estimates.",
      tone: "neutral",
      how: {
        method: es
          ? "Tendencia de Theil–Sen + Mann–Kendall por zona sobre el sol anual que llega al suelo; revisada contra falsas alarmas entre muchas zonas (Benjamini–Hochberg)."
          : "Theil–Sen + Mann–Kendall per zone on yearly sunshine reaching the ground; checked for false alarms across many zones (Benjamini–Hochberg).",
        rows: [
          ...(s.irr_trend_pct_decade_median !== undefined ? [{ label: es ? "Cambio típico" : "Typical change", value: `${fmt(l, s.irr_trend_pct_decade_median, 2, true)} %/${dec} (${es ? "mediana" : "median"})` }] : []),
          ...(c && c.irr_trend_pct_decade !== null ? [{
            label: "Jaén–Granada",
            value: `${fmt(l, c.irr_trend_pct_decade, 2, true)} %/${dec}${c.irr_ci_pct_decade ? ` · ${es ? "rango probable" : "likely range"} ${range(l, c.irr_ci_pct_decade, 2, "%")}` : ""} · p ${fmtP(l, c.irr_p)}`,
          }] : []),
          ...(v ? [{
            label: es ? `Contraste NASA POWER · ${v.region}` : `NASA POWER cross-check · ${v.region}`,
            value: `POWER ${v.power_trend_pct_decade === null ? "—" : fmt(l, v.power_trend_pct_decade, 2, true)} %/${dec} (p ${fmtP(l, v.power_p)}) · MERRA-2 ${v.merra2_trend_pct_decade === null ? "—" : fmt(l, v.merra2_trend_pct_decade, 2, true)} %/${dec} (p ${fmtP(l, v.merra2_p)})${typeof v.interannual_pearson_r === "number" ? ` · r ${fmt(l, v.interannual_pearson_r, 2)}` : ""}`,
          }] : []),
        ],
        source: "NASA MERRA-2 SWGDN · NASA POWER ALLSKY_SFC_SW_DWN",
        sourceUrl: "https://doi.org/10.5067/OU3HJDS973O0",
      },
    });
  }

  // f) Dust (context only).
  if (f.dust) {
    const d = f.dust;
    out.push({
      id: "dust",
      label: es ? "Polvo en el aire" : "Dust in the air",
      value: fmt(l, d.featured_cell.mean_aot_2000_2025, 3),
      valueNote: es ? `Jaén–Granada · media ${d.period[0]}–${d.period[1]}` : `Jaén–Granada · average ${d.period[0]}–${d.period[1]}`,
      meaning: es
        ? "Cantidad de polvo en el aire sobre la zona (índice sin unidades: 0 = aire totalmente limpio). Solo es contexto: no dice cuánto se ensucian los paneles, así que no cambia el color verde."
        : "Amount of dust in the air above the zone (unitless index: 0 = perfectly clear air). Context only: it does not say how dirty panels get, so it does not change the green rating.",
      hint: es ? "Pide medidas de suciedad en el emplazamiento antes de cerrar cifras de producción." : "Ask for on-site soiling measurements before final yield figures.",
      tone: "neutral",
      series: { years: d.featured_cell.annual.map((a) => a.year), values: d.featured_cell.annual.map((a) => a.mean_aot), unit: es ? "índice" : "index" },
      how: {
        method: es
          ? "Espesor óptico del polvo a 550 nm (AOT) de MERRA-2, medias mensuales ponderadas por días. No se ha calculado tendencia ni incertidumbre: los años varían mucho y el dato es de modelo, no de suelo."
          : "MERRA-2 dust optical thickness at 550 nm (AOT), monthly values weighted by days. No trend or uncertainty was computed: years vary a lot and this is model output, not a ground measurement.",
        rows: [{ label: es ? "Años completos" : "Complete years", value: String(d.featured_cell.annual.length) }],
        source: "NASA MERRA-2 M2TMNXAER v5.12.4 · DUEXTTAU",
        sourceUrl: "https://doi.org/10.5067/FH9A0MLJPC7N",
      },
    });
  }

  // g) Outside our data.
  out.push({
    id: "outside",
    label: es ? "Fuera de nuestros datos" : "Outside our data",
    value: es ? "5 incógnitas" : "5 unknowns",
    valueNote: es ? "red · permisos · suelo · precios · producción" : "grid · permits · land · prices · output",
    meaning: es
      ? "Conexión a la red, permisos, propiedad del suelo, precios de la electricidad y electricidad producida (MWh). No hay un dato público, homogéneo y nacional para ellos en nuestro proceso, y casi todos dependen de cada parcela."
      : "Grid connection, permits, land ownership, electricity prices and electricity produced (MWh). There is no public, consistent nationwide dataset for them in our pipeline, and most depend on each parcel.",
    hint: es ? "Siguiente paso en una zona verde: pedir capacidad de conexión al gestor de red y revisar suelo y permisos." : "Next step for a green zone: ask the grid operator for connection capacity and check land and permits.",
    tone: "missing",
    how: {
      method: es ? "Solo usamos clima NASA, el mapa ambiental MITECO, el registro de plantas de Global Energy Monitor y estadísticas de Eurostat." : "We only use NASA climate data, the MITECO environmental map, the Global Energy Monitor plant register and Eurostat statistics.",
      rows: [],
      source: es ? "Ayuda para cribar, no consejo de inversión" : "A screening aid, not investment advice",
    },
  });

  return out;
}

const GLOSSARY_EN = [
  { term: "Zone", text: "One NASA map square of about 50 × 50 km." },
  { term: "MW", text: "Megawatts of installed panel power — how big a plant is, not how much electricity it makes (MWh)." },
  { term: "Proven", text: "The change passes the statistical test and the false-alarm check across many zones." },
  { term: "Likely range", text: "The range where the true trend most probably lies (95 % confidence interval)." },
  { term: "Environmental sensitivity", text: "Official MITECO map, from 0 = maximum (not recommended) to 4 = low (fewest environmental constraints)." },
];
const GLOSSARY_ES = [
  { term: "Zona", text: "Un cuadro del mapa NASA de unos 50 × 50 km." },
  { term: "MW", text: "Megavatios de potencia instalada: lo grande que es una planta, no la electricidad que produce (MWh)." },
  { term: "Probado", text: "El cambio supera la prueba estadística y el control de falsas alarmas entre muchas zonas." },
  { term: "Rango probable", text: "Intervalo donde casi seguro está la tendencia real (intervalo de confianza del 95 %)." },
  { term: "Sensibilidad ambiental", text: "Mapa oficial del MITECO, de 0 = máxima (no recomendada) a 4 = baja (menos restricciones ambientales)." },
];

export function executiveCopy(locale: Locale): ExecCopy {
  const es = locale === "es";
  return {
    heading: es ? "Resumen ejecutivo" : "Executive summary",
    intro: es ? "7 indicadores en orden de lectura. Pulsa uno para ver cómo lo sabemos." : "7 indicators in reading order. Tap one to see how we know.",
    howWeKnow: es ? "Cómo lo sabemos" : "How we know",
    decision: es ? "Decisión" : "Decision",
    sourceLabel: es ? "Fuente" : "Source",
    glossaryHeading: es ? "Glosario rápido" : "Quick glossary",
    glossary: es ? GLOSSARY_ES : GLOSSARY_EN,
    tiles: (f) => tiles(locale, f),
  };
}
