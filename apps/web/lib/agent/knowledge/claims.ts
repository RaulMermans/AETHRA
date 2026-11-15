import type { KnowledgeClaim } from "./types.ts";

export const CYL_INCLUDED_INSTALLATIONS = 652;

function k(
  claim: KnowledgeClaim,
): KnowledgeClaim {
  return claim;
}

export const KNOWLEDGE_CLAIMS: readonly KnowledgeClaim[] = [
  k({
    id: "claim-taro-identity",
    claimType: "DEFINITION",
    text: "I am TARO, AETHRA's Earth-intelligence research companion for Mission 01 — Spain. I read and synthesize validated NASA EvidenceCards (MERRA-2 temperature and NASA POWER solar–wind complementarity), precomputed regional climate series across Spain's 19 CCAA and 52 provinces, and physical/energy-system mechanisms, while recording our findings in my Markdown research notebook (RESEARCH_NOTES.md).",
    textEs:
      "Soy TARO, el compañero de investigación de inteligencia terrestre de AETHRA para la Misión 01 — España. Consulto y sintetizo las EvidenceCards validadas de NASA (temperatura MERRA-2 y complementariedad solar-viento de NASA POWER), las series climáticas precalculadas en las 19 CCAA y 52 provincias de España, y los mecanismos físicos y energéticos, recopilando nuestros hallazgos en mi cuaderno Markdown (RESEARCH_NOTES.md).",
    subjectIds: ["ResearchCandidate", "ClimateTrend"],
    sourceIds: ["src-evidence-cards", "src-datasets-md"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Does not compute new statistics in the browser."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-pv-temperature-mechanism",
    claimType: "PHYSICAL_MECHANISM",
    text: "Typical photovoltaic modules convert a smaller fraction of incident light to electricity as the cells get hotter. Cell temperature is not MERRA-2 2 m air temperature; it also depends on irradiance, wind, mounting and the module. AETHRA has not modelled a Spanish plant.",
    textEs:
      "Los módulos fotovoltaicos típicos convierten una fracción menor de la luz en electricidad cuando las celdas se calientan. La temperatura de celda no es el T2M de MERRA-2; también depende de irradiancia, viento, montaje y la ficha del módulo. AETHRA no ha modelado una planta en España.",
    subjectIds: ["PVModuleTemperature", "SolarIrradiance"],
    sourceIds: ["src-pvgis"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["No plant-specific derate in this repo.", "Not an EvidenceCard."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-resource-not-generation",
    claimType: "DEFINITION",
    text: "NASA POWER irradiance and 50 m wind describe meteorological resource. They are not AC generation, capacity factor, or grid reliability.",
    textEs:
      "La irradiancia NASA POWER y el viento a 50 m describen recurso meteorológico. No son generación AC, factor de capacidad ni fiabilidad de red.",
    subjectIds: ["SolarIrradiance", "WindSpeed50m", "ObservedGeneration"],
    sourceIds: ["src-energy-research", "src-power-docs"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["No power curves or PV system model in Gate B."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-complementarity-levels",
    claimType: "DEFINITION",
    text: "Resource complementarity (how solar and wind vary together) is not generation complementarity and not system value. AETHRA currently has evidence only for the first, and Gate B E1 is insufficient evidence of a trend.",
    textEs:
      "La complementariedad de recurso (cómo varían juntos sol y viento) no es complementariedad de generación ni valor de sistema. AETHRA solo tiene evidencia del primer nivel, y E1 de Gate B es evidencia insuficiente de tendencia.",
    subjectIds: ["JointLowResourceDay"],
    sourceIds: ["src-energy-gap-bundle", "src-energy-research"],
    scientificStatus: "DESCRIPTIVE",
    limitations: ["No validated system-value model."],
    maxRecommendationLevel: 3,
  }),
  k({
    id: "claim-ci-not-forecast",
    claimType: "DEFINITION",
    text: "A confidence interval around a historical Theil–Sen slope is not a future prediction interval. NEX-GDDP-CMIP6 is not ingested. 2032–2040 is a planning discussion window, not a projection.",
    textEs:
      "Un intervalo de confianza alrededor de una pendiente Theil–Sen histórica no es un intervalo de predicción futura. NEX-GDDP-CMIP6 no está ingerido. 2032–2040 es una ventana de discusión, no una proyección.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-nex-gddp"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["No validated projection artifact."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-cyl-register-scope",
    claimType: "DESCRIPTIVE_PATTERN",
    text: `The project register overlay includes ${CYL_INCLUDED_INSTALLATIONS} solar and wind installations in Castilla y León only (INGESTED, NOT VALIDATED). It is not national coverage and contains no generation.`,
    textEs: `La capa de registro del proyecto incluye ${CYL_INCLUDED_INSTALLATIONS} instalaciones solares y eólicas solo en Castilla y León (INGESTED, NOT VALIDATED). No es cobertura nacional y no contiene generación.`,
    subjectIds: ["InstalledCapacity", "ResearchCandidate"],
    sourceIds: ["src-cyl-register", "src-jcyl"],
    scientificStatus: "EXPLORATORY",
    limitations: ["Judge mode hides the overlay (D51/D61).", "MW ≠ MWh."],
    maxRecommendationLevel: 3,
  }),
  k({
    id: "claim-warming-not-pv-generation",
    claimType: "HYPOTHESIS",
    text: "Gate A documents a historical warming of Peninsula + Balearics 2 m air temperature. That does not imply lower photovoltaic generation. Linking the two would need POA irradiance, a thermal/electrical model, and observed or modelled output — none of which AETHRA has validated.",
    textEs:
      "Gate A documenta un calentamiento histórico del T2M en Península + Baleares. Eso no implica menor generación fotovoltaica. Habría que unir irradiancia en el plano del array, un modelo térmico/eléctrico y producción observada o modelada, que AETHRA no ha validado.",
    subjectIds: ["ClimateTrend", "ObservedGeneration", "PVModuleTemperature"],
    sourceIds: ["src-evidence-cards", "src-pvgis"],
    evidenceId: "gate-a-temperature-R0",
    scientificStatus: "INSUFFICIENT",
    limitations: ["Do not treat MERRA-2 T2M as module temperature."],
    maxRecommendationLevel: 3,
  }),
  k({
    id: "claim-weather-vs-climate",
    claimType: "DEFINITION",
    text: "Weather is the state of the atmosphere over hours to days. Climate is the statistics of weather over a long, stated period. A 26-year series can support a trend test; it is not a century-scale climatology.",
    textEs:
      "El tiempo meteorológico es el estado de la atmósfera en horas o días. El clima son las estadísticas de ese tiempo en un periodo largo y declarado. Una serie de 26 años puede alimentar un test de tendencia; no es una climatología de un siglo.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-datasets-md"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Gate A uses 2000–2025 complete years."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-confidence-interval",
    claimType: "DEFINITION",
    text: "A 95% confidence interval for a Theil–Sen slope is a range for the historical rate under the method's assumptions. It is not the probability that the world will do that next decade, and it is not importance.",
    textEs:
      "Un intervalo de confianza del 95% para una pendiente Theil–Sen es un rango para la tasa histórica bajo los supuestos del método. No es la probabilidad de lo que hará el mundo la próxima década, ni mide importancia.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-scientific-review"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Does not replace the outcome label on the card."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-pvalue-not-importance",
    claimType: "DEFINITION",
    text: "A p-value is not importance, and an insignificant result is not proof of zero change. Insufficient evidence is a valid AETHRA outcome.",
    textEs:
      "Un valor p no mide importancia, y un resultado no significativo no prueba cambio cero. Evidencia insuficiente es un resultado válido en AETHRA.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-scientific-review"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: [],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-correlation-not-causation",
    claimType: "DEFINITION",
    text: "Correlation or a fitted slope is not causation. TARO will not say NASA warming caused energy-production changes without a separate validated chain.",
    textEs:
      "Una correlación o una pendiente ajustada no es causalidad. TARO no dirá que el calentamiento NASA causó cambios de generación sin una cadena validada aparte.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-scientific-review"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: [],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-power-lineage",
    claimType: "DEFINITION",
    text: "NASA POWER solar (ALLSKY_SFC_SW_DWN) is CERES SYN1deg-based flux on a ~1° grid, not a pyranometer on a roof. POWER WS50M is MERRA-2 reanalysis wind at 50 m, not hub-height site wind. Gate B starts in 2001 to avoid the SRB→SYN1deg break and ends 2025 to exclude FLASHFlux/GEOS-IT.",
    textEs:
      "El solar NASA POWER (ALLSKY_SFC_SW_DWN) es flujo CERES SYN1deg (~1°), no un piranómetro en un tejado. WS50M es viento de reanálisis MERRA-2 a 50 m, no viento de buje. Gate B empieza en 2001 para evitar la rotura SRB→SYN1deg y acaba en 2025 para excluir FLASHFlux/GEOS-IT.",
    subjectIds: ["SolarIrradiance", "WindSpeed50m"],
    sourceIds: ["src-power-docs", "src-energy-research"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Not parcel scale."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-merra-vs-nex",
    claimType: "DEFINITION",
    text: "MERRA-2 is a historical reanalysis. NEX-GDDP-CMIP6 would be downscaled climate-model scenarios. AETHRA has a MERRA-2 temperature chain; it has no validated NEX-GDDP artifact.",
    textEs:
      "MERRA-2 es un reanálisis histórico. NEX-GDDP-CMIP6 serían escenarios de modelos climáticos reducidos de escala. AETHRA tiene una cadena de temperatura MERRA-2; no tiene un artefacto NEX-GDDP validado.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-merra2", "src-nex-gddp"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["NEX-GDDP is P2 / DEFERRED."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-nasa-not-parcel",
    claimType: "DEFINITION",
    text: "NASA grids cannot certify conditions on a specific property. Native support is tens of kilometres (MERRA-2 ~0.5° × 0.625°; POWER solar ~1°). An empty-looking map pixel is not land availability.",
    textEs:
      "Las mallas NASA no certifican una parcela. El soporte nativo es de decenas de kilómetros (MERRA-2 ~0,5° × 0,625°; solar POWER ~1°). Un píxel vacío en el mapa no es suelo disponible.",
    subjectIds: ["ResearchCandidate"],
    sourceIds: ["src-power-docs", "src-merra2"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: [],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-ghi-dni",
    claimType: "DEFINITION",
    text: "GHI is global horizontal irradiance; DNI is direct normal; DHI is diffuse horizontal. POWER ALLSKY_SFC_SW_DWN is all-sky surface shortwave on a horizontal plane — closer to GHI than to plane-of-array irradiance.",
    textEs:
      "GHI es irradiancia global horizontal; DNI es directa normal; DHI es difusa horizontal. ALLSKY_SFC_SW_DWN de POWER es onda corta de cielo total en plano horizontal: más cerca de GHI que de irradiancia en el plano del array.",
    subjectIds: ["SolarIrradiance"],
    sourceIds: ["src-power-docs", "src-pvgis"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["AETHRA does not publish a DNI EvidenceCard."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-radiation-not-electricity",
    claimType: "PHYSICAL_MECHANISM",
    text: "More radiation does not automatically mean more electricity. Conversion depends on POA irradiance, temperature, soiling, availability, inverter limits, clipping, curtailment and grid connection. Southern Spain is not 'always better' without those constraints.",
    textEs:
      "Más radiación no es automáticamente más electricidad. La conversión depende de POA, temperatura, suciedad, disponibilidad, límites del inversor, clipping, vertidos y conexión. El sur de España no es «siempre mejor» sin esas restricciones.",
    subjectIds: ["SolarIrradiance", "ObservedGeneration"],
    sourceIds: ["src-pvgis"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["No AETHRA plant yield."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-power-curve",
    claimType: "PHYSICAL_MECHANISM",
    text: "A turbine power curve maps wind speed to electrical power: cut-in, a cubic-ish rise, rated, then cut-out. Mean regional WS50M cannot be multiplied into MWh. Hub height, air density, turbulence and wakes are not in the POWER grid.",
    textEs:
      "Una curva de potencia relaciona velocidad de viento y potencia eléctrica: cut-in, subida casi cúbica, nominal y cut-out. Un WS50M medio regional no se multiplica a MWh. Altura de buje, densidad, turbulencia y estelas no están en la malla POWER.",
    subjectIds: ["WindSpeed50m", "ObservedGeneration"],
    sourceIds: ["src-power-docs"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["TARO will not invent a power curve."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-rain-not-hydro",
    claimType: "PHYSICAL_MECHANISM",
    text: "Less rain does not by itself mean less hydropower. Runoff, snowpack, reservoir operation, head, environmental flows and turbine availability sit in between. GLDAS runoff is modelled, not measured discharge. GPM IMERG is a satellite–gauge precipitation estimate.",
    textEs:
      "Menos lluvia no implica por sí sola menos hidroeléctrica. En medio están escorrentía, nieve, operación del embalse, salto, caudales ambientales y disponibilidad de turbinas. La escorrentía GLDAS es modelada, no un aforo. GPM IMERG es una estimación satélite–pluviómetro.",
    subjectIds: ["Runoff"],
    sourceIds: ["src-datasets-md"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["No hydro EvidenceCard.", "D53: rain/runoff Supported labels are not judge-presentable as-is."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-mw-vs-mwh",
    claimType: "DEFINITION",
    text: "MW is power (installed or instantaneous capacity). MWh is energy over time. Capacity factor is energy produced divided by energy at continuous rated capacity. Curtailment is energy that could have been generated but was not accepted by the system.",
    textEs:
      "MW es potencia (capacidad instalada o instantánea). MWh es energía en el tiempo. El factor de capacidad es energía producida entre la que habría a potencia nominal continua. El vertido (curtailment) es energía que podría haberse generado y el sistema no aceptó.",
    subjectIds: ["InstalledCapacity", "ObservedGeneration", "CapacityFactor"],
    sourceIds: ["src-cyl-register"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["CyL overlay stores MW, never MWh."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-joint-low-not-blackout",
    claimType: "DEFINITION",
    text: "A joint low-resource day in Gate B is a meteorological coincidence on POWER solar and WS50M. It is not a blackout, not adequacy, and not proof the energy gap is growing (E1: insufficient evidence in 5/5 regions).",
    textEs:
      "Un día de recurso conjunto bajo en Gate B es coincidencia meteorológica en solar POWER y WS50M. No es un apagón, ni adecuación, ni prueba de que el energy gap crezca (E1: evidencia insuficiente en 5/5 regiones).",
    subjectIds: ["JointLowResourceDay"],
    sourceIds: ["src-energy-gap-bundle"],
    scientificStatus: "DESCRIPTIVE",
    limitations: ["No electricity-system model."],
    maxRecommendationLevel: 1,
  }),
  k({
    id: "claim-spain-institutions",
    claimType: "DEFINITION",
    text: "Red Eléctrica operates Spain's transmission system. OMIE runs wholesale markets. CNMC, MITECO and IDAE are regulator / ministry / energy-agency roles. TARO has no ingested ESIOS, OMIE or BOE time series, so it will not quote live prices, permits or connection capacity.",
    textEs:
      "Red Eléctrica opera el transporte en España. OMIE opera mercados mayoristas. CNMC, MITECO e IDAE son regulador / ministerio / agencia. TARO no tiene series ESIOS, OMIE o BOE ingeridas, así que no cita precios, permisos ni capacidad de acceso en vivo.",
    subjectIds: ["ResearchCandidate"],
    sourceIds: ["src-ree"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Tier C not ingested except CyL register."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-recommendation-levels",
    claimType: "DEFINITION",
    text: "TARO may explain (0), retrieve a card (1), compare like-for-like (2), or flag a research candidate (3). Feasibility (4) and investment or construction (5) are out of scope without a dedicated validated decision model.",
    textEs:
      "TARO puede explicar (0), traer una card (1), comparar con el mismo soporte (2) o señalar un candidato de investigación (3). Factibilidad (4) e inversión u obra (5) quedan fuera sin un modelo de decisión validado.",
    subjectIds: ["ResearchCandidate"],
    sourceIds: ["src-energy-research"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Never jump from 2 to 5."],
    maxRecommendationLevel: 3,
  }),
  k({
    id: "claim-other-tech-not-modules",
    claimType: "DEFINITION",
    text: "CSP, offshore wind, batteries, hydrogen, biomass, geothermal, marine and nuclear are useful energy-system context. They are not active AETHRA research modules and have no EvidenceCards here.",
    textEs:
      "CSP, eólica marina, baterías, hidrógeno, biomasa, geotérmica, marina y nuclear son contexto de sistema. No son módulos de investigación activos de AETHRA y no tienen EvidenceCards aquí.",
    subjectIds: ["ResearchCandidate"],
    sourceIds: ["src-datasets-md"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Do not invent module results."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-studied-regions",
    claimType: "DESCRIPTIVE_PATTERN",
    text: "AETHRA's published joint-low study regions are Peninsula + Balearics, Galicia, Castilla y León, Aragón and Andalucía. Headline temperature is Peninsula + Balearics. Canarias are a separate climate regime and are not averaged into that headline.",
    textEs:
      "Las regiones publicadas de recurso conjunto bajo son Península + Baleares, Galicia, Castilla y León, Aragón y Andalucía. La temperatura titular es Península + Baleares. Canarias son otro régimen y no se promedian en ese titular.",
    subjectIds: ["JointLowResourceDay", "ClimateTrend"],
    sourceIds: ["src-evidence-cards"],
    scientificStatus: "DESCRIPTIVE",
    limitations: ["No ranking of CCAA."],
    maxRecommendationLevel: 2,
  }),
  k({
    id: "claim-theil-sen-vs-ols",
    claimType: "DEFINITION",
    text: "Theil–Sen is AETHRA's published slope: the median of pairwise slopes, robust to outliers. Ordinary least squares is a different estimator and is not what the EvidenceCards report. Switching method after seeing results would be a new analysis, not a reread of the card.",
    textEs:
      "Theil–Sen es la pendiente publicada de AETHRA: la mediana de pendientes por pares, robusta a atípicos. Mínimos cuadrados ordinarios es otro estimador y no es lo que reportan las EvidenceCards. Cambiar el método después de ver resultados sería un análisis nuevo, no una relectura de la card.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-scientific-review"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["The browser does not recompute slopes."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-autocorrelation-n",
    claimType: "DEFINITION",
    text: "Serial correlation means successive years are not independent, so the effective sample size is smaller than n calendar years. AETHRA's tests account for that in the published p-value; TARO does not recompute it in the browser.",
    textEs:
      "La autocorrelación serial hace que años sucesivos no sean independientes, así que el tamaño efectivo es menor que n años de calendario. Los tests de AETHRA ya lo tienen en el p publicado; TARO no lo recalcula en el navegador.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-scientific-review"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["n on the card is complete years, not effective n."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-two-datasets-temperature",
    claimType: "DEFINITION",
    text: "Two temperature datasets can differ because of spatial support, vertical level, bias correction, missing-data rules and period. MERRA-2 T2M is reanalysis air temperature, not a GHCN station and not a PV module. AETHRA does not average them into one unofficial number.",
    textEs:
      "Dos conjuntos de temperatura pueden diferir por soporte espacial, nivel vertical, corrección de sesgo, datos faltantes y periodo. MERRA-2 T2M es reanálisis, no una estación GHCN ni un módulo FV. AETHRA no los promedia en un número extraoficial.",
    subjectIds: ["ClimateTrend"],
    sourceIds: ["src-datasets-md", "src-merra2"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["Do not splice datasets into a new slope here."],
    maxRecommendationLevel: 0,
  }),
  k({
    id: "claim-ghi-commercial",
    claimType: "DEFINITION",
    text: "A high solar resource is not a commercial opportunity by itself. Yield, capture price, connection, land, environment and financing sit outside AETHRA's validated evidence.",
    textEs:
      "Un recurso solar alto no es por sí solo una oportunidad comercial. El yield, el capture price, la conexión, el suelo, el ambiente y la financiación quedan fuera de la evidencia validada de AETHRA.",
    subjectIds: ["SolarIrradiance"],
    sourceIds: ["src-pvgis", "src-ree"],
    scientificStatus: "DOCUMENTED_GENERAL_KNOWLEDGE",
    limitations: ["No LCOE in this repo."],
    maxRecommendationLevel: 0,
  }),
];

export function claimById(id: string): KnowledgeClaim | undefined {
  return KNOWLEDGE_CLAIMS.find((c) => c.id === id);
}
