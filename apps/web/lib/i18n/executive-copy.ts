import type { GiovanniDustFile, PvCell, PvRegionValidation, PvScreeningFile, SolarCapacityTrendFile } from "@/lib/globe/pv-screening";
import type { Locale } from "./messages";
import { formatScreeningNumber as fmt, formatScreeningP as fmtP } from "./screening-copy";

/**
 * Executive summary for the solar screen (EN + ES): seven indicators in a fixed reading order.
 * Every number comes from a pipeline JSON; this file only chooses words and formats values.
 * Technical vocabulary (Theil–Sen, p, FDR, AOT…) is confined to the "How we know" rows.
 */

export type ExecTileId = "boom" | "where" | "reality" | "heat" | "sun" | "dust";
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
  /** One closing line: what to check outside these datasets. */
  checkSeparately: string;
  /** Review status and scope; shown only inside the glossary/"How we know" details. */
  status: string;
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
        value: `${fmt(l, t.sen_mw_per_year, 0, true)} MW/${es ? "año" : "yr"} · ${es ? "rango probable 95 %" : "likely range 95%"} ${range(l, t.ci95, 0, "MW/" + (es ? "año" : "yr"))} · p ${fmtP(l, t.p)} · ${t.significant ? (es ? "probada" : "proven") : (es ? "no significativa" : "not significant")}`,
      });
    }
    if (sp.added_mw_trend) {
      const a = sp.added_mw_trend;
      rows.push({
        label: es ? `Ritmo de instalación (${a.period[0]}–${a.period[1]})` : `Pace of new installs (${a.period[0]}–${a.period[1]})`,
        value: `${fmt(l, a.sen_mw_per_year2, 0, true)} MW/${es ? "año²" : "yr²"} · ${es ? "rango probable" : "likely range"} ${range(l, a.ci95, 0, "")} · p ${fmtP(l, a.p)} · ${a.significant ? (es ? "probado" : "proven") : (es ? "no significativo" : "not significant")}`,
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
        : es ? `; el ritmo desde ${recent.period[0]} varía de un año a otro: planifica con el crecimiento medio, no con un acelerón reciente.` : `; the pace since ${recent.period[0]} varies year to year: plan with the average growth, not a recent speed-up.`
      : ".";
    out.push({
      id: "boom",
      label: es ? "El auge solar de España" : "Spain's solar boom",
      value: `${int(l, sp.latest.mw)} MW`,
      valueNote: cap.eu ? (es ? `n.º ${cap.eu.spain_rank} de ${cap.eu.n_countries} en la UE (${cap.eu.year})` : `#${cap.eu.spain_rank} of ${cap.eu.n_countries} in the EU (${cap.eu.year})`) : undefined,
      meaning: (es ? `Potencia de paneles solares instalada en España a final de ${sp.latest.year} (MW = megavatios de potencia instalada: lo que pueden dar las placas a pleno sol; 1 GW = 1000 MW). ` : `Solar-panel power installed in Spain at the end of ${sp.latest.year} (MW = megawatts of installed power: what the panels can give at full sun; 1 GW = 1,000 MW). `) + (growth ? growth + trendLine : ""),
      hint: es ? "El mercado solar español es grande y crece: hay demanda, cadena de suministro y competencia; elige bien la zona." : "Spain's solar market is large and growing: demand, supply chain and competition are all there, so pick your zone well.",
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
        ? "Aquí aparece la potencia solar instalada oficial (Eurostat). El resto del resumen funciona sin ella."
        : "Official installed solar capacity (Eurostat) appears here. The rest of this summary works without it.",
      hint: es ? "Sigue con los indicadores de abajo; vuelve a abrir el panel para ver esta cifra." : "Carry on with the indicators below; reopen the panel to see this figure.",
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
          ? `Ejemplo destacado: Jaén–Granada, entre el ${top} % de zonas más soleadas de España y con el ${fmt(l, c.miteco_low_moderate_pct, 1)} % de su suelo de sensibilidad ambiental baja o moderada (pocas trabas ambientales).`
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
      valueNote: s.t_cells_significant_up !== undefined ? (es ? `subida comprobada en ${s.t_cells_significant_up} de ${f.tTested} zonas` : `rise confirmed in ${s.t_cells_significant_up} of ${f.tTested} zones`) : undefined,
      meaning: es
        ? `°C/década = grados que sube el verano cada 10 años (zona típica, ${per}). Un panel más caliente rinde menos: ≈ ${fmt(l, Math.abs(s.heat_penalty_pct_decade_median), 2)} % menos de producción por década solo por el calor (regla orientativa).`
        : `°C/decade = degrees summer warms every 10 years (typical zone, ${per}). Hotter panels produce less: ≈ ${fmt(l, Math.abs(s.heat_penalty_pct_decade_median), 2)}% less output per decade from heat alone (rule of thumb).`,
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
            value: `${fmt(l, c.t_trend_c_decade, 2, true)} °C/${dec}${c.t_ci_c_decade ? ` · ${es ? "rango probable" : "likely range"} ${range(l, c.t_ci_c_decade, 2, "°C")}` : ""} · p ${fmtP(l, c.t_p)} · ${es ? "tras control de falsas alarmas" : "after false-alarm check"} ${fmtP(l, c.t_p_bh)} · ${c.t_significant ? (es ? "probada" : "proven") : (es ? "no significativa aquí (p ≥ 0,05)" : "not significant here (p ≥ 0.05)")}`,
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
      valueNote: stable ? (es ? `sin cambio en ${s.irr_cells_tested} zonas · ${per}` : `no change in ${s.irr_cells_tested} zones · ${per}`) : (es ? `zonas con subida · bajada comprobada · ${per}` : `zones with confirmed rise · fall · ${per}`),
      meaning: stable
        ? es
          ? `Estable: el sol de las ${s.irr_cells_tested} zonas no ha cambiado en ${period[1] - period[0] + 1} años. Para un proyecto de 25 años, planifica con el sol medio histórico.`
          : `Stable: sunshine in all ${s.irr_cells_tested} zones has not changed over ${period[1] - period[0] + 1} years. For a 25-year project, plan with the historical average sunshine.`
        : es
          ? `${up} zonas con subida comprobada y ${down} con bajada comprobada de ${s.irr_cells_tested}; el resto, estable.`
          : `${up} zones with a confirmed rise and ${down} with a confirmed fall, out of ${s.irr_cells_tested}; the rest are stable.`,
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
        ? "Cantidad de polvo en el aire sobre la zona (índice de turbidez: 0 = aire totalmente limpio). No cambia el color verde de la zona."
        : "Amount of dust in the air above the zone (haze index: 0 = perfectly clear air). It does not change the zone's green rating.",
      hint: es ? "Presupuesta limpieza de paneles y mide la suciedad en el emplazamiento antes de cerrar cifras de producción." : "Budget panel cleaning and measure soiling on site before final yield figures.",
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

  return out;
}

const GLOSSARY_EN = [
  { term: "Zone", text: "One NASA map square of about 50 × 50 km." },
  { term: "MW", text: "Megawatts of installed panel power — how big a plant is, not how much electricity it makes (MWh)." },
  { term: "GW", text: "Gigawatts: 1 GW = 1,000 MW." },
  { term: "kWh/m²/day", text: "Solar energy reaching each square metre per day; more = more electricity from the same panels." },
  { term: "°C/decade · %/decade", text: "How much temperature (degrees) or sunshine (percent) changes every 10 years." },
  { term: "p", text: "Chance that a change is just a fluke; below 5 % (0.05) counts as confirmed." },
  { term: "Confirmed / stable", text: "Confirmed = the change passes the statistical test and the false-alarm check across many zones. Stable = no such change: plan with the historical average." },
  { term: "Likely range", text: "The range where the true trend most probably lies (95 % confidence interval)." },
  { term: "Environmental sensitivity", text: "Official MITECO map, from 0 = maximum (not recommended) to 4 = low (fewest environmental constraints)." },
];
const GLOSSARY_ES = [
  { term: "Zona", text: "Un cuadro del mapa NASA de unos 50 × 50 km." },
  { term: "MW", text: "Megavatios de potencia instalada: lo grande que es una planta, no la electricidad que produce (MWh)." },
  { term: "GW", text: "Gigavatios: 1 GW = 1000 MW." },
  { term: "kWh/m²/día", text: "Energía solar que llega a cada metro cuadrado al día; más = más electricidad con los mismos paneles." },
  { term: "°C/década · %/década", text: "Cuánto cambia la temperatura (grados) o el sol (porcentaje) cada 10 años." },
  { term: "p", text: "Probabilidad de que un cambio sea casualidad; por debajo del 5 % (0,05) cuenta como comprobado." },
  { term: "Comprobado / estable", text: "Comprobado = el cambio supera la prueba estadística y el control de falsas alarmas entre muchas zonas. Estable = sin ese cambio: planifica con la media histórica." },
  { term: "Rango probable", text: "Intervalo donde casi seguro está la tendencia real (intervalo de confianza del 95 %)." },
  { term: "Sensibilidad ambiental", text: "Mapa oficial del MITECO, de 0 = máxima (no recomendada) a 4 = baja (menos restricciones ambientales)." },
];

export function executiveCopy(locale: Locale): ExecCopy {
  const es = locale === "es";
  return {
    heading: es ? "Resumen ejecutivo" : "Executive summary",
    intro: es ? "Indicadores clave en orden de lectura. Pulsa uno para ver cómo lo sabemos." : "Key indicators in reading order. Tap one to see how we know.",
    howWeKnow: es ? "Cómo lo sabemos" : "How we know",
    decision: es ? "Decisión" : "Decision",
    sourceLabel: es ? "Fuente" : "Source",
    glossaryHeading: es ? "Glosario rápido" : "Quick glossary",
    glossary: es ? GLOSSARY_ES : GLOSSARY_EN,
    tiles: (f) => tiles(locale, f),
    checkSeparately: es ? "Comprobar aparte: conexión a red, permisos, precios." : "Check separately: grid connection, permits, prices.",
    status: es
      ? "Estado: exploratorio, pendiente de segunda revisión; regla fijada antes de ver los datos. Fuera de estos datos: conexión a red, permisos, propiedad del suelo, precios y electricidad producida (MWh). Ayuda para cribar, no consejo de inversión."
      : "Status: exploratory, pending a second review; rule fixed before seeing the data. Not in these datasets: grid connection, permits, land ownership, prices and electricity produced (MWh). A screening aid, not investment advice.",
  };
}
