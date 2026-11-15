/**
 * Interface copy. English is the default (submission language). Spanish is an explicit user choice.
 * Scientific numbers are never rewritten here; only the words around them.
 */

import { CONCEPTUAL_DISCLAIMER, ILLUSTRATIVE_DISCLAIMER } from "@/lib/globe/cesium/illustrative-model";

export type Locale = "en" | "es";

export const LOCALES = ["en", "es"] as const;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

type Copy = {
  lang: { group: string };
  view: {
    spain: string;
    spainTitle: string;
    mapType: string;
    flatHint: string;
    globeHint: string;
  };
  explore: {
    h1: string;
    preparing: string;
    globeUnavailable: string;
    reload: string;
    webglFailed: string;
    contextLost: string;
    renderingStopped: (detail: string) => string;
    globeAria: string;
    climateTrends: string;
    energyLab: string;
    energyLabTag: string;
    energyLabTitle: string;
    workspace: string;
    thisPlace: string;
    studyFindings: string;
    trendPanel: string;
    mapScale: string;
    hideTrend: string;
    trend: string;
    hideAdvisor: string;
    idealSites: string;
    orbitStation: string;
    orbitRanked: string;
    navOnly: (name: string) => string;
    destSource: (name: string, source: string) => string;
    screenshotFailed: string;
    screenshotSaved: string;
    linkCopied: string;
    linkInBar: string;
  };
  tools: {
    mapTools: string;
    stations: string;
    stationsHint: string;
    evidence: string;
    evidenceHint: string;
    infrastructure: string;
    infrastructureHint: string;
    relationships: string;
    relationshipsHint: string;
    screenshot: string;
    screenshotHint: string;
    share: string;
    shareHint: string;
    closeTool: string;
    closeEsc: string;
    toolAria: (title: string) => string;
  };
  camera: {
    toolbar: string;
    zoomIn: string;
    zoomOut: string;
    tiltHorizon: string;
    tiltTop: string;
    rotateLeft: string;
    rotateRight: string;
    resetNorth: string;
    resetView: string;
  };
  dock: {
    aria: string;
    tabs: string;
    map: string;
    stations: string;
    stationsTitle: string;
    tropical: string;
    hotDays: string;
    drySpell: string;
    wettest: string;
    annual: string;
    annualTitle: string;
    trend: string;
    trendTitle: string;
    prev: string;
    next: string;
    pause: string;
    play: (from: number, to: number) => string;
    slider: string;
    trendValue: (from: number, to: number) => string;
    preparingFrames: string;
    blend: string;
    nextTrend: (from: number, to: number) => string;
    slopeNote: (from: number, to: number) => string;
    pilot: string;
  };
  dimensions: Record<
    "temperature" | "precipitation" | "drought" | "snow" | "water_rivers" | "heat_extremes" | "rain_extremes",
    { short: string; label: string }
  >;
  places: {
    aria: string;
    scale: string;
    spain: string;
    region: string;
    province: string;
    allSpain: string;
    fit: string;
    choose: string;
    clip: string;
    clipShort: string;
    focus: string;
    searchRegion: string;
    searchProvince: string;
    all52: string;
    prov: string;
    provs: string;
  };
  legend: {
    aria: string;
    title: string;
    station: string;
    stationHint: string;
    wind: string;
    windHint: string;
    solar: string;
    solarHint: string;
    hydro: string;
    hydroHint: string;
    mw: string;
  };
  relations: {
    title: string;
    loading: string;
    error: string;
    exploratory: string;
    choose: string;
    maps: Record<"agreement" | "trend-gap" | "temp-precip" | "heat-drought", { tab: string; title: string; question: string }>;
    scaleLow: Record<"agreement" | "trend-gap" | "temp-precip" | "heat-drought", string>;
    scaleHigh: Record<"agreement" | "trend-gap" | "temp-precip" | "heat-drought", string>;
    agreementSummary: (n: number, r: string, sign: number) => string;
    trendGapSummary: (n: number, diff: string) => string;
    couplingSummary: (tested: number, neg: number, robust: number, qMin: string, rho: string) => string;
    compoundSummary: (tested: number, pos: number, robust: number, qMin: string, rho: string) => string;
    noRobust: string;
    signNote: string;
    cellsKey: string;
    dottedKey: string;
    blankKey: string;
    filledKey: string;
    ringKey: string;
    greyKey: string;
    agreementPoint: (r: string, n: number) => string;
    trendGapPoint: (diff: string, cell: string, station: string) => string;
    robustPoint: string;
    notRobustPoint: string;
    insufficientPoint: string;
    data: string;
    period: string;
    method: string;
    design: string;
    doNot: string;
    whyDetrend: string;
    activeHint: string;
  };
  mapKey: {
    aria: string;
    title: string;
    cells: (resolution: string) => string;
    cellsRobust: string;
    cellsDotted: string;
    cellsNoFdr: string;
    basinsValue: string;
    basinsRobust: string;
    basinsHatched: string;
    basinsNone: string;
    stationsValue: (year: number) => string;
    stationsNoField: string;
    stationRobust: string;
    stationRing: string;
    stationInsufficient: string;
    symbolRobust: string;
  };
  coords: {
    selection: string;
    point: string;
    copy: string;
    copied: string;
    clear: string;
    copiedLive: string;
    station: string;
    basinHub: string;
    reservoir: string;
    lake: string;
    lagoon: string;
    installation: string;
    river: string;
    mesh: string;
    sample: string;
    aboveSea: string;
    ellipsoid: string;
  };
  outcome: {
    increase: string;
    decrease: string;
    exploratory: string;
    noRobust: string;
    insufficient: string;
    supportedTrend: string;
    noRobustShort: string;
  };
  evidence: {
    aria: string;
    trend: string;
    spain: string;
    nationalView: string;
    clicked: string;
    nationalCanarias: string;
    close: string;
    loading: string;
    noSeries: string;
    observed: (units: string) => string;
    senLine: string;
    wetBar: string;
    dryBar: string;
    globeSlope: string;
    chartAria: (title: string, from: number, to: number, units: string) => string;
    corrected: string;
    noTrend: string;
    slopeLabel: string;
    mapSlope: (slope: string, units: string, from: string, to: string) => string;
    observedYear: (year: number, value: string, units: string) => string;
    noDataYear: (year: number) => string;
    source: string;
    method: string;
    methodBody: string;
    doNot: string;
    multiplicity: string;
    basins: string;
    box: string;
    stations: string;
    nearest: (name: string, km: string) => string;
    browse: string;
    near: (name: string) => string;
    basinBox: (name: string) => string;
    thisPlace: string;
    peninsula: string;
    stationShort: string;
    noSeriesArea: string;
    stationYears: string;
    pickStation: string;
    stationSource: (name: string) => string;
    scopeSource: (source: string, area: string) => string;
    basinSource: (name: string) => string;
    levelNational: string;
    levelRegion: string;
    levelProvince: string;
  };
  findings: {
    aria: string;
    title: string;
    close: string;
    questionLabel: string;
    question: string;
    banner: string;
    invented: string;
    howSit: string;
    diagram: string;
    air: string;
    solarWind: string;
    sameCountry: string;
    noArrow: string;
    spainExtent: string;
    finding1: string;
    loadingGate: string;
    finding2: string;
    insufficientFive: string;
    jointNote: string;
    relate: string;
    relateBody: string;
    chance: string;
    independence: string;
    notPresentable: string;
    notPresentableBody: string;
    mapNote: string;
    openCards: string;
  };
  cards: {
    title: string;
    topic: string;
    air: string;
    joint: string;
    selected: string;
    spainNational: string;
    failed: (error: string) => string;
    loading: string;
    resultFor: string;
    canarias: string;
    noCard: (topic: string, name: string) => string;
    jointScope: string;
    airTopic: string;
    jointTopic: string;
    ownTrend: string;
    openTrend: string;
    hide: string;
    show: string;
    nationalRef: (region: string, name: string) => string;
    notFor: (region: string, name: string) => string;
    what: string;
    where: string;
    when: string;
    evidence: string;
    years: string;
    bh: (p: number) => string;
    power: (value: number, units: string) => string;
    context: string;
    jointDays: (observed: number, expected: number, lo: number, hi: number, ratio: number) => string;
    nullModel: (model: string) => string;
    doNot: string;
    limits: string;
    sensitivity: string;
    sources: string;
    ci: (lo: string, hi: string) => string;
    window: (lo: string, hi: string) => string;
  };
  stations: {
    title: string;
    intro: (years: number) => string;
    which: string;
    reference: (n: number) => string;
    all: (n: number) => string;
    inScope: (name: string) => string;
    searchPlaceholder: string;
    search: string;
    record: string;
    trend: string;
    trendTitle: (year: number) => string;
    noEquivalent: string;
    loading: string;
    none: string;
    shortRecord: string;
    supported: string;
    noRobust: string;
    footnote: (year: number) => string;
    other: string;
    yr: string;
    refBadge: string;
    units: Record<"nights" | "days", string>;
    metrics: Record<
      "tavg" | "tmax" | "dtr" | "prcp" | "tropical_nights" | "hot_days_35" | "wettest_day" | "max_dry_spell" | "snow_days" | "max_snwd",
      string
    >;
  };
  taro: {
    aria: string;
    close: string;
    ready: string;
    investigating: string;
    insufficient: string;
    answerReady: string;
    intro: string;
    you: string;
    ask: string;
    placeholder: string;
    question: string;
    investigatingLine: string;
    unavailable: string;
    noInvention: string;
    requestFailed: string;
    openEvidence: string;
    showMap: string;
    showSeries: string;
    starters: readonly [string, string, string, string];
  };
  menu: {
    places: string;
    landmarks: string;
    cases: string;
    plant: string;
    explore: string;
    destinations: string;
    park: string;
    landmark: string;
    overview: string;
    installation: string;
    research: string;
    hints: Record<string, string>;
    /** Display-name overrides by destination id; ids not listed keep their proper name. */
    names: Record<string, string>;
  };
  casePanel: {
    aria: string;
    title: string;
    close: string;
    regions: string;
    caseStudy: (code: string) => string;
    historical: (nuts: string) => string;
    nationalNuts: string;
    nuts: (code: string) => string;
    banner: string;
    verdict: string;
    insufficient: string;
    seriesError: (error: string) => string;
    loading: string;
    trend: string;
    ci: (slope: string, units: string, lo: string, hi: string) => string;
    nMedian: (n: number, median: number) => string;
    pFamily: (p: string, bh: string) => string;
    overlay: string;
    overlayBody: string;
    why: string;
    whereWhen: string;
    current: string;
    horizon: string;
    reference: (name: string) => string;
    open: (name: string) => string;
    register: string;
    showPlants: string;
    plantsNote: string;
    showModel: string;
    appearance: string;
    existing: string;
    conceptual: string;
    frames: Record<"hybrid" | "wind_focus" | "solar_focus", string>;
    chartCaption: (label: string, units: string, year: number) => string;
    chartCaptionHistorical: (label: string, units: string, year: number) => string;
    complementarity: string;
    complementarityNote: string;
    observed: string;
    independent: string;
    ratio: (ratio: string, pct: number) => string;
    modelDrawn: (metres: number) => string;
    nMedianLabel: string;
    pLabel: string;
    e0Solar: string;
    e0Wind: string;
    opacity: string;
    openCard: string;
    returnSpain: string;
    noProjection: string;
    chartAria: (label: string, from: number, to: number) => string;
    chartAriaHistorical: (label: string, from: number, to: number) => string;
    illustrativeDisclaimer: string;
    conceptualDisclaimer: string;
  };
  brandStory: {
    open: string;
    close: string;
    dialog: string;
    greeting: string;
    origin: string;
    challenge: string;
    missionTitle: string;
    mission: string;
    visionTitle: string;
    vision: string;
    honestyTitle: string;
    honesty: string;
    independent: string;
    back: string;
  };
};

export const messages: Record<Locale, Copy> = {
  en: {
    lang: { group: "Interface language" },
    view: {
      spain: "Spain",
      spainTitle: "Return the camera to Spain",
      mapType: "Map type",
      flatHint: "Flat map seen from above",
      globeHint: "3D globe with relief",
    },
    explore: {
      h1: "Explore observed environmental trends in Spain on a 3D globe",
      preparing: "Preparing Spain…",
      globeUnavailable: "3D globe unavailable",
      reload: "Reload",
      webglFailed: "The 3D globe could not start. WebGL may be unavailable or disabled in this browser.",
      contextLost: "The GPU context was lost (driver reset or memory pressure). Reload to restore the globe.",
      renderingStopped: (detail) => `Rendering stopped: ${detail}`,
      globeAria:
        "Interactive 3D globe. Drag to rotate, scroll or pinch to zoom, Ctrl-drag or middle-drag to tilt. Keyboard: arrow keys rotate and tilt, plus and minus zoom, N resets north.",
      climateTrends: "Climate trends",
      energyLab: "Energy Lab",
      energyLabTag: "exploratory",
      energyLabTitle: "Exploratory: suitability scores are not validated results",
      workspace: "Analysis workspace mode",
      thisPlace: "This place",
      studyFindings: "Study findings",
      trendPanel: "Trend panel",
      mapScale: "Map color scale",
      hideTrend: "Hide trend",
      trend: "Trend",
      hideAdvisor: "Hide Energy Advisor",
      idealSites: "Ideal Sites & Time Series",
      orbitStation: "Drag to orbit · Scroll to zoom · Click a station",
      orbitRanked: "Drag to orbit · Scroll to zoom · Click a ranked site or station",
      navOnly: (name) => `${name}: navigation only — not an energy development candidate.`,
      destSource: (name, source) => `${name}. ${source}.`,
      screenshotFailed: "Screenshot failed",
      screenshotSaved: "Screenshot saved",
      linkCopied: "Link to this view copied",
      linkInBar: "Link is in the address bar",
    },
    tools: {
      mapTools: "Map tools",
      stations: "Station catalog",
      stationsHint: "Weather station catalog (NOAA ground truth)",
      evidence: "Evidence cards",
      evidenceHint: "Trend results with method, uncertainty, sources and limits (EvidenceCards)",
      infrastructure: "Energy infrastructure",
      infrastructureHint: "Registered wind and solar installations (Castilla y León register) and their NASA analysis region",
      relationships: "Relationship maps",
      relationshipsHint: "Maps that cross two variables: reanalysis vs stations, warm vs dry years, hot days vs dry spells",
      screenshot: "Screenshot",
      screenshotHint: "Download a PNG of the current view",
      share: "Copy link",
      shareHint: "Copy a link to this exact view",
      closeTool: "Close tool",
      closeEsc: "Close (Esc)",
      toolAria: (title) => `${title} tool`,
    },
    camera: {
      toolbar: "Camera",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      tiltHorizon: "Tilt toward horizon",
      tiltTop: "Tilt to top-down",
      rotateLeft: "Rotate left",
      rotateRight: "Rotate right",
      resetNorth: "Reset north",
      resetView: "Reset view",
    },
    dock: {
      aria: "Climate dimensions",
      tabs: "Environmental dimensions",
      map: "Map",
      stations: "Stations",
      stationsTitle:
        "NOAA reference weather stations: one per province nationally, all of them inside a selected region (or river hubs). Full list: station catalog tool.",
      tropical: "Tropical nights",
      hotDays: "Days > 35 °C",
      drySpell: "Dry spell",
      wettest: "Wettest day",
      annual: "Annual",
      annualTitle: "Observed annual value",
      trend: "Trend",
      trendTitle: "Decadal slope for the fitted period — not a forecast",
      prev: "Previous timeline step",
      next: "Next timeline step",
      pause: "Pause timeline",
      play: (from, to) => `Play observed years ${from}–${to}, then fitted trend`,
      slider: "Observed years then fitted trend summary",
      trendValue: (from, to) => `Fitted trend ${from}–${to}, not a forecast`,
      preparingFrames: "Preparing observed frames…",
      blend: "Visual blend between consecutive observed years — not a new year, not a forecast.",
      nextTrend: (from, to) =>
        `Next: Theil–Sen slope map for ${from}–${to} — not a new year, not a forecast.`,
      slopeNote: (from, to) =>
        `Theil–Sen slope per decade, complete years ${from}–${to}. Colour shows the slope; dots, hatching and rings mark trends that are not robust (see map key). Not a forecast.`,
      pilot: "Pilot",
    },
    dimensions: {
      snow: { short: "Snow", label: "Snow" },
      temperature: { short: "Temp", label: "Temperature" },
      precipitation: { short: "Rain", label: "Precipitation" },
      drought: { short: "Drought", label: "Dry / wet years" },
      water_rivers: { short: "Rivers", label: "Water & rivers" },
      heat_extremes: { short: "Heat ext.", label: "Heat extremes" },
      rain_extremes: { short: "Rain ext.", label: "Rain extremes" },
    },
    places: {
      aria: "Place",
      scale: "Place scale",
      spain: "Spain",
      region: "Region",
      province: "Province",
      allSpain: "All of Spain",
      fit: "Fit Spain in view",
      choose: "Choose another place",
      clip: "Clip map to this place",
      clipShort: "Clip",
      focus: "Focus this place",
      searchRegion: "Search region…",
      searchProvince: "Search province…",
      all52: "All (52)",
      prov: "prov",
      provs: "provs",
    },
    legend: {
      aria: "Map marker legend",
      title: "What the dots are",
      station: "Weather station (NOAA)",
      stationHint: "Temperature / rain gauge. Not a power plant.",
      wind: "Onshore wind",
      windHint: "Registered wind farm (Castilla y León). Teal triangle.",
      solar: "Solar photovoltaic",
      solarHint: "Registered PV plant (Castilla y León). Amber square.",
      hydro: "Hydropower",
      hydroHint: "Not in this register. This layer is wind + solar PV only, Castilla y León only.",
      mw: "Registered MW ≠ electricity produced. Points sit inside official perimeters.",
    },
  relations: {
      title: "Relationship maps",
      loading: "Loading relationship maps…",
      error: "Could not load relationship-maps.json.",
      exploratory: "EXPLORATORY",
      choose: "Choose a relationship",
      maps: {
        agreement: { tab: "Agreement", title: "Reanalysis vs stations: year-to-year agreement", question: "Do MERRA-2 cells and NOAA stations rise and fall together year to year?" },
        "trend-gap": { tab: "Trend gap", title: "Reanalysis vs stations: trend difference", question: "Does the MERRA-2 cell warm faster or slower than the station inside it?" },
        "temp-precip": { tab: "Warm × dry", title: "Are warm years also dry years?", question: "Year-to-year link between annual temperature (MERRA-2) and annual rainfall (GPM), trends removed." },
        "heat-drought": { tab: "Heat × drought", title: "Hot days and dry spells at stations", question: "Do years with more days above 35 °C also have longer dry spells? Trends removed." },
      },
      scaleLow: { agreement: "r 0.5 (weak)", "trend-gap": "cell warms slower", "temp-precip": "warm years drier", "heat-drought": "opposite years" },
      scaleHigh: { agreement: "r 1 (identical)", "trend-gap": "cell warms faster", "temp-precip": "warm years wetter", "heat-drought": "heat with dry spells" },
      agreementSummary: (n, r, sign) => `${n} paired stations. Median year-to-year r = ${r}. Same trend sign at ${sign} of ${n}.`,
      trendGapSummary: (n, diff) => `${n} paired stations. Median difference (cell − station) ${diff} °C/decade.`,
      couplingSummary: (tested, neg, robust, qMin, rho) => `${tested} cells tested. ${neg} have a negative rank correlation (Spearman rho, median ${rho}), but ${robust} pass FDR (lowest q = ${qMin}).`,
      compoundSummary: (tested, pos, robust, qMin, rho) => `${tested} stations tested. ${pos} have a positive rank correlation (Spearman rho, median ${rho}), but ${robust} pass FDR (lowest q = ${qMin}).`,
      noRobust: "No robust relationship detected",
      signNote: "Neighbouring cells and stations are not independent, so the sign count is descriptive, not a test.",
      cellsKey: "Each square is one MERRA-2 cell (0.5° × 0.625°); colour = Spearman rho.",
      dottedKey: "Dotted: not robust after FDR (q ≥ 0.05)",
      blankKey: "Blank: insufficient GPM coverage (< 50 % of the cell)",
      filledKey: "Filled: robust after FDR",
      ringKey: "Ring: no robust relationship detected",
      greyKey: "Small grey: insufficient evidence (< 15 paired years)",
      agreementPoint: (r, n) => `r ${r} · ${n} years`,
      trendGapPoint: (diff, cell, station) => `Δ ${diff} °C/decade (cell ${cell}, station ${station})`,
      robustPoint: "Robust after FDR",
      notRobustPoint: "No robust relationship detected",
      insufficientPoint: "Insufficient evidence",
      data: "Data",
      period: "Period",
      method: "Method",
      design: "Design fixed before computing: docs/RELATIONSHIP_MAPS.md",
      doNot: "Year-to-year co-variability only. Not causation, not a trend, not a forecast.",
      whyDetrend: "Each series is detrended first: two series that both trend would otherwise look related.",
      activeHint: "The globe shows this relationship while the panel is open. Close it to return to the climate map.",
    },
    mapKey: {
      aria: "How to read the map",
      title: "How to read the map",
      cells: (resolution) => `Each square is one native cell (${resolution}). No smoothing between cells.`,
      cellsRobust: "Plain cell: trend holds after FDR across map cells",
      cellsDotted: "Dotted cell: no robust trend detected (FDR, q ≥ 0.05)",
      cellsNoFdr: "Slopes only: this bundle has no per-cell FDR label.",
      basinsValue: "One flat colour per basin bounding box (GPM mean), not the watershed.",
      basinsRobust: "EXPLORATORY: p < 0.05 and CI excludes 0 (not adjusted for 8 basins)",
      basinsHatched: "Hatched: no robust trend detected",
      basinsNone: "Grey: insufficient evidence (GPM covers < 95 % of the box)",
      stationsValue: (year) => `Colour and size: value observed at the station in ${year}.`,
      stationsNoField: "Nothing is drawn between stations: there is no data there.",
      stationRobust: "Filled: trend holds after FDR across stations",
      stationRing: "Ring: no robust trend detected",
      stationInsufficient: "Small grey: insufficient evidence (< 15 complete years)",
      symbolRobust: "Trend holds after FDR (map family)",
    },
    coords: {
      selection: "Selection",
      point: "Point",
      copy: "Copy",
      copied: "Copied",
      clear: "Clear",
      copiedLive: "Coordinates copied",
      station: "NOAA GHCN-Daily station",
      basinHub: "River basin hub",
      reservoir: "Reservoir",
      lake: "Lake",
      lagoon: "Coastal lagoon",
      installation: "Registered installation · JCyL",
      river: "River",
      mesh: "rendered mesh, approximate",
      sample: "most detailed sample",
      aboveSea: "Above sea level.",
      ellipsoid: "Height above the WGS84 ellipsoid.",
    },
    outcome: {
      increase: "Supported increase",
      decrease: "Supported decrease",
      exploratory: "EXPLORATORY — multiplicity unadjusted",
      noRobust: "No robust trend detected",
      insufficient: "Insufficient evidence",
      supportedTrend: "supported trend",
      noRobustShort: "no robust trend detected",
    },
    evidence: {
      aria: "Trend evidence",
      trend: "Trend",
      spain: "Spain",
      nationalView: "National view",
      clicked: "Clicked on the map",
      nationalCanarias: "National view (Canarias reported separately)",
      close: "Close evidence panel",
      loading: "Loading…",
      noSeries: "No observed series for this place.",
      observed: (units) => `Observed (${units})`,
      senLine: "Theil–Sen line, fitted period only",
      wetBar: "Wetter than 2000–2024 (above 0)",
      dryBar: "Drier than 2000–2024 (below 0)",
      globeSlope: "Globe shows the slope field, not a later year.",
      chartAria: (title, from, to, units) => `${title}, observed ${from}–${to}, ${units}`,
      corrected: " (autocorrelation-corrected)",
      noTrend: "No precomputed trend for this place.",
      slopeLabel: "slope",
      mapSlope: (slope, units, from, to) => `Map: Theil–Sen slope ${slope} ${units} for ${from}–${to}. Not a forecast.`,
      observedYear: (year, value, units) => `${year}: ${value} ${units} (observed)`,
      noDataYear: (year) => `No data for ${year} at this place.`,
      source: "Source & support",
      method: "Method",
      methodBody:
        "Theil–Sen slope with 95% CI; Mann–Kendall test (ties-corrected, autocorrelation-checked). Supported = p < 0.05 and CI excludes 0. Complete calendar years only.",
      doNot: "Do not conclude: not a forecast, not a cause, not energy production or site suitability.",
      multiplicity:
        "EXPLORATORY: each region is tested on its own, without adjustment for the ~72 regions offered here. After a Benjamini–Hochberg adjustment, none of the regional rain or rain-anomaly labels and only 0 of 17 modelled-runoff labels stay supported. Temperature labels are unaffected.",
      basins: "Basin bounding boxes",
      box: "box",
      stations: "Stations",
      nearest: (name, km) => (km ? `Nearest NOAA station: ${name} · ${km} km` : `Nearest NOAA station: ${name}`),
      browse: "Browse all weather stations",
      near: (name) => `Near ${name}`,
      basinBox: (name) => `${name} basin box`,
      thisPlace: "This place",
      peninsula: "Peninsula + Balearics",
      stationShort: "NOAA GHCN-Daily stations",
      noSeriesArea: "No precomputed series for this area.",
      stationYears: "This station has fewer than 15 complete years for this metric.",
      pickStation:
        "Area trends are not computed for station metrics (the network changes over time). Pick a station on the map or in the Station catalog.",
      stationSource: (name) => `NOAA GHCN-Daily station ${name} (complete years only; not homogenized)`,
      scopeSource: (source, area) => `${source}, ${area}, area-weighted`,
      basinSource: (name) => `NASA GPM IMERG, ${name} bounding box (not the watershed)`,
      levelNational: "National State (AGE)",
      levelRegion: "Autonomous Community",
      levelProvince: "Provincial Administration",
    },
    findings: {
      aria: "Study findings",
      title: "Study findings",
      close: "Close findings",
      questionLabel: "Research question",
      question: "Are days when solar and wind resources are both low becoming more frequent in Spain (2001–2025)?",
      banner:
        "Precomputed by the Python pipeline and shown as published. EXPLORATORY until independent human review. No correlation is computed between the two questions.",
      invented: "No finding was invented.",
      howSit: "How the questions sit",
      diagram: "Two NASA questions over Spain, not causally linked",
      air: "Air temperature",
      solarWind: "Solar + wind lows",
      sameCountry: "Same country · different question",
      noArrow: "No causal arrow · not a fitted correlation",
      spainExtent: "Spain · Peninsula + Balearics",
      finding1: "Contrast · air temperature (NASA MERRA-2)",
      loadingGate: "Loading the air-temperature card…",
      finding2: "Answer · joint solar + wind lows (NASA POWER)",
      insufficientFive: "Insufficient evidence (5/5 regions)",
      jointNote:
        "No detectable trend in joint low-resource days, 2001–2025, in any of the five pre-registered regions. Not detecting a change is not proof of stability: with 25 years the test can only detect trends of about 2–3 days per decade. Not generation.",
      relate: "How solar and wind relate",
      relateBody:
        "Descriptive only: how often both resources are low on the same day, versus independence. Not a trend. Not grid reliability.",
      chance: "× chance rate",
      independence: "1.00 would match independent odds. Values below 1 mean lows coincide less often in these datasets.",
      notPresentable: "Not a presentable finding",
      notPresentableBody:
        "GPM rain and GLDAS modelled runoff exist on the map, but their regional “Supported” labels do not survive a multiple-testing adjustment, so we do not present them as findings. They are not linked to either question here.",
      mapNote:
        "The globe shows the climate map selected on the left (air temperature by default) as context. Joint solar + wind lows are results for five regions, not a map layer.",
      openCards: "Open Evidence cards",
    },
    cards: {
      title: "Evidence cards",
      topic: "Evidence topic",
      air: "Air temperature",
      joint: "Solar + wind joint lows",
      selected: "Selected region:",
      spainNational: "Spain (national view)",
      failed: (error) => `Data failed quality checks: evidence could not be loaded (${error}).`,
      loading: "Loading evidence…",
      resultFor: "Result for",
      canarias: "(Canarias reported separately)",
      noCard: (topic, name) => `No ${topic} EvidenceCard for ${name}.`,
      jointScope: "The pre-registered study covers Peninsula + Balearics, Galicia, Castilla y León, Aragón and Andalucía only.",
      airTopic: "air-temperature",
      jointTopic: "solar + wind",
      ownTrend: "This region’s own MERRA-2 temperature trend (precomputed by the same pipeline) is in the Trend panel.",
      openTrend: "Open Trend panel",
      hide: "Hide",
      show: "Show",
      nationalRef: (region, name) => `national reference (${region}, not ${name})`,
      notFor: (region, name) => `National reference: ${region}. This is not a result for ${name}.`,
      what: "What",
      where: "Where",
      when: "When",
      evidence: "Evidence",
      years: "years",
      bh: (p) => `(BH-adjusted ${p})`,
      power: (value, units) => `. Smallest trend detectable with 80% power ≈ ${value} ${units}`,
      context: "Descriptive context (not a trend)",
      jointDays: (observed, expected, lo, hi, ratio) =>
        `${observed} joint-low days in 2001–2025 vs ≈${expected} expected if same-day solar and wind lows were independent (95% range ${lo}–${hi}; ratio ${ratio}).`,
      nullModel: (model) => `Null model: ${model}. Describes resource data, not grid reliability.`,
      doNot: "Do not conclude:",
      limits: "Limitations & sensitivity",
      sensitivity: "Sensitivity:",
      sources: "Sources & provenance",
      ci: (lo, hi) => `95% CI ${lo} to ${hi}`,
      window: (lo, hi) => `window range ${lo} to ${hi}`,
    },
    stations: {
      title: "Station catalog",
      intro: (years) =>
        `NOAA GHCN-Daily weather stations: ground measurements used to check the NASA grids. The map shows one reference station per province (longest record, ≥${years} years).`,
      which: "Which stations",
      reference: (n) => `Reference · ${n}`,
      all: (n) => `All · ${n}`,
      inScope: (name) => `in ${name}`,
      searchPlaceholder: "Station, province or region",
      search: "Search stations",
      record: "Station · record",
      trend: "Trend / decade",
      trendTitle: (year) =>
        `Theil-Sen slope, 2001–${year}. ● = supported after multiple-testing control (Mann–Kendall p < 0.05, CI excludes 0, Benjamini–Hochberg q < 0.05 across stations)`,
      noEquivalent: " — no station equivalent for this layer",
      loading: "Loading stations…",
      none: "No stations match.",
      shortRecord: "short record",
      supported: "supported trend",
      noRobust: "no robust trend detected",
      footnote: (year) =>
        `Source: NOAA NCEI GHCN-Daily, 2001–${year}, annual values from daily records. Not NASA data. Theil–Sen slope, complete years only. ● supported (p < 0.05, CI excludes 0, BH q < 0.05 across stations), ○ no robust trend detected. Stations are not homogenized.`,
      other: "Other",
      yr: "yr",
      refBadge: "REF",
      units: { nights: "nights", days: "days" },
      metrics: {
        tavg: "Mean air temperature",
        tmax: "Mean daily maximum",
        dtr: "Diurnal temperature range",
        prcp: "Annual precipitation",
        tropical_nights: "Tropical nights",
        hot_days_35: "Days above 35 °C",
        wettest_day: "Wettest day",
        max_dry_spell: "Longest dry spell",
        snow_days: "Snow days",
        max_snwd: "Max snow depth",
      },
    },
    taro: {
      aria: "TARO",
      close: "Close TARO",
      ready: "Ready",
      investigating: "Investigating",
      insufficient: "Insufficient evidence",
      answerReady: "Answer ready",
      intro: "TARO — AETHRA’s research companion. NASA evidence, Earth systems, energy resources. No invented numbers.",
      you: "You",
      ask: "Ask",
      placeholder: "Ask TARO…",
      question: "Research question",
      investigatingLine: "Investigating…",
      unavailable: "TARO is unavailable",
      noInvention: "No scientific answer was invented.",
      requestFailed: "Request failed",
      openEvidence: "Open Evidence",
      showMap: "Show on map",
      showSeries: "Show series",
      starters: [
        "What is the temperature trend over Peninsula + Balearics?",
        "Why can high temperature reduce photovoltaic efficiency?",
        "Does the warming found by AETHRA imply lower photovoltaic generation?",
        "Why is Castilla y León interesting for hybrid renewable research?",
      ],
    },
    menu: {
      places: "Geographic destinations",
      landmarks: "Landmarks",
      cases: "Research cases",
      plant: "Registered plant",
      explore: "Explore Spain",
      destinations: "Destinations in Spain",
      park: "national park — not an energy site",
      landmark: "Natural landmark",
      overview: "Overview",
      installation: "Registered installation",
      research: "Research case",
      hints: {
        spain: "Return to overview",
        mulhacen: "Sierra Nevada · park",
        "picos-de-europa": "Torre Cerredo · park",
        "case-r0-joint-low": "National Gate B case",
        "case-es11-joint-low": "Wind-framed research case",
        "case-es41-joint-low": "Hybrid-framed research case",
        "case-es24-joint-low": "Wind-framed research case",
        "case-es61-joint-low": "Solar-framed research case",
        "installation-buniel": "Illustrative 3D",
      },
      names: {},
    },
    casePanel: {
      aria: "Energy research case",
      title: "Research cases",
      close: "Close research case",
      regions: "Gate B regions",
      caseStudy: (code) => `Case study ${code}`,
      historical: (nuts) => `Historical NASA evidence · Regional investigation · ${nuts}`,
      nationalNuts: "Peninsula + Balearics",
      nuts: (code) => `NUTS-2 ${code}`,
      banner: "EXPLORATORY · quotes Python · 5/5 regions insufficient evidence",
      verdict: "Verdict",
      insufficient: "Insufficient evidence",
      seriesError: (error) => `Series not loaded: ${error}`,
      loading: "Loading observed series…",
      trend: "Trend",
      ci: (slope, units, lo, hi) => `${slope} ${units} (CI ${lo} to ${hi})`,
      nMedian: (n, median) => `${n} years · ${median} days/year`,
      pFamily: (p, bh) => `${p} · ${bh} (family of 5)`,
      overlay: "Globe overlay (context, not a score)",
      overlayBody:
        "The map clips to this region so you see which cells belong to the case. That heatmap is the climate dimension you already picked — not a fruitfulness or suitability layer. Joint-low evidence lives in the chart above (POWER regional mean), not as a per-cell overlay.",
      why: "Why this region",
      whereWhen: "Where / when",
      current: "Current context",
      horizon: "Horizon 2032–2040 (not a forecast)",
      reference: (name) => `Reference: ${name} — difference not tested.`,
      open: (name) => `Open ${name}`,
      register: "CyL register (optional overlay)",
      showPlants: "Show 652 registered plants",
      plantsNote:
        "Off by default. Other autonomous communities have no plant layer here, so a dense Castilla y León map is not evidence that this region is uniquely built-out or uniquely fruitful.",
      showModel: "Illustrative 3D at Buniel",
      appearance: "Appearance",
      existing: "Existing — verified",
      conceptual: "Conceptual — not an approved project",
      frames: {
        hybrid: "Solar–wind resource complementarity",
        wind_focus: "Wind resource context",
        solar_focus: "Solar resource context",
      },
      chartCaption: (label, units, year) =>
        `${label} (${units}). Solid: observed years. Dashed: Theil–Sen on 2001–${year} only. Hatched 2026–2040: no validated projection — not a forecast.`,
      chartCaptionHistorical: (label, units, year) =>
        `${label} (${units}). Solid: observed years. Dashed: Theil–Sen fitted on 2001–${year} only; the chart ends at the last observed year.`,
      complementarity: "Complementarity (descriptive)",
      complementarityNote: "Joint-low days 2001–2025 vs year-shift independence. Not a trend.",
      observed: "Observed",
      independent: "If independent",
      ratio: (ratio, pct) =>
        `Ratio ${ratio} — joint lows about ${pct}% as often as independence would suggest.`,
      modelDrawn: (metres) => `Drawn ~${metres} m tall so it reads on the globe.`,
      nMedianLabel: "n / median",
      pLabel: "p / BH p",
      e0Solar: "E0 solar",
      e0Wind: "E0 wind",
      opacity: "Ghost opacity",
      openCard: "Open EvidenceCard",
      returnSpain: "Return to Spain",
      noProjection: "No validated projection",
      chartAria: (label, from, to) => `${label}, observed ${from}–${to}, no projection after ${to}`,
      chartAriaHistorical: (label, from, to) => `${label}, observed ${from}–${to}, with the fitted historical trend`,
      illustrativeDisclaimer: ILLUSTRATIVE_DISCLAIMER,
      conceptualDisclaimer: CONCEPTUAL_DISCLAIMER,
    },
    brandStory: {
      open: "About AETHRA",
      close: "Close",
      dialog: "About AETHRA",
      greeting: "A weekend, a globe, and a stubborn question.",
      origin:
        "We're a small team in Málaga. AETHRA started at NASA Space Apps Challenge 2026, challenge 02: Be An Earth System Trend Detective. We took that quite literally.",
      challenge:
        "The brief is unglamorous, and that's why we like it. Take NASA Earth data, pick a real place, and show whether something changed — with the numbers, the uncertainty, and the limits sitting next to the answer.",
      missionTitle: "What we're here to do",
      mission:
        "Shrink the time from a curious question about Spain to a conclusion you can trace back to NASA data. The thing that matters is an EvidenceCard — series, slope, confidence, sources — not a prettier map.",
      visionTitle: "Where we're looking",
      vision:
        "The bigger curiosity is how the environmental conditions behind clean energy in Spain are changing. That's the horizon. Today's mission is Spain: start with a trend we can stand behind, and never pretend the energy question is settled when it isn't.",
      honestyTitle: "How we talk",
      honesty:
        "“No robust trend” and “insufficient evidence” are real results. If we don't have a card for a region, we say so. We don't forecast 2030, we don't rank sites, and we don't dress reanalysis up as a thermometer in a field.",
      independent: "Independent Space Apps project. Not an official NASA product.",
      back: "Back to Spain",
    },
  },
  es: {
    lang: { group: "Idioma de la interfaz" },
    view: {
      spain: "España",
      spainTitle: "Volver a encuadrar España",
      mapType: "Tipo de mapa",
      flatHint: "Mapa plano visto desde arriba",
      globeHint: "Globo 3D con relieve",
    },
    explore: {
      h1: "Explora tendencias ambientales observadas en España sobre un globo 3D",
      preparing: "Preparando España…",
      globeUnavailable: "El globo 3D no está disponible",
      reload: "Recargar",
      webglFailed: "No se ha podido iniciar el globo 3D. Puede que WebGL no esté disponible o esté desactivado en este navegador.",
      contextLost: "Se ha perdido el contexto de la GPU (reinicio del controlador o falta de memoria). Recarga para recuperar el globo.",
      renderingStopped: (detail) => `El renderizado se ha detenido: ${detail}`,
      globeAria:
        "Globo 3D interactivo. Arrastra para girar, usa la rueda o pellizca para hacer zoom, y arrastra con Ctrl o con el botón central para inclinar. Teclado: las flechas giran e inclinan, más y menos hacen zoom, N orienta al norte.",
      climateTrends: "Tendencias climáticas",
      energyLab: "Laboratorio energético",
      energyLabTag: "exploratorio",
      energyLabTitle: "Exploratorio: las puntuaciones de idoneidad no son resultados validados",
      workspace: "Modo de análisis",
      thisPlace: "Este lugar",
      studyFindings: "Resultados del estudio",
      trendPanel: "Panel de tendencia",
      mapScale: "Escala de color del mapa",
      hideTrend: "Ocultar tendencia",
      trend: "Tendencia",
      hideAdvisor: "Ocultar asesor energético",
      idealSites: "Sitios ideales y series",
      orbitStation: "Arrastra para orbitar · Rueda para ampliar · Pulsa una estación",
      orbitRanked: "Arrastra para orbitar · Rueda para ampliar · Pulsa un sitio clasificado o una estación",
      navOnly: (name) => `${name}: solo navegación. No es un candidato de desarrollo energético.`,
      destSource: (name, source) => `${name}. ${source}.`,
      screenshotFailed: "No se ha podido capturar la pantalla",
      screenshotSaved: "Captura guardada",
      linkCopied: "Enlace de esta vista copiado",
      linkInBar: "El enlace está en la barra de direcciones",
    },
    tools: {
      mapTools: "Herramientas del mapa",
      stations: "Catálogo de estaciones",
      stationsHint: "Catálogo de estaciones meteorológicas (observación NOAA)",
      evidence: "Fichas de evidencia",
      evidenceHint: "Resultados de tendencia con método, incertidumbre, fuentes y límites (fichas de evidencia)",
      infrastructure: "Infraestructura energética",
      infrastructureHint:
        "Instalaciones eólicas y solares registradas (registro de Castilla y León) y su región de análisis NASA",
      relationships: "Mapas de relación",
      relationshipsHint: "Mapas que cruzan dos variables: reanálisis frente a estaciones, años cálidos frente a secos, días de calor frente a rachas secas",
      screenshot: "Captura",
      screenshotHint: "Descargar un PNG de la vista actual",
      share: "Copiar enlace",
      shareHint: "Copiar un enlace a esta vista exacta",
      closeTool: "Cerrar la herramienta",
      closeEsc: "Cerrar (Esc)",
      toolAria: (title) => `Herramienta: ${title}`,
    },
    camera: {
      toolbar: "Cámara",
      zoomIn: "Acercar",
      zoomOut: "Alejar",
      tiltHorizon: "Inclinar hacia el horizonte",
      tiltTop: "Vista cenital",
      rotateLeft: "Girar a la izquierda",
      rotateRight: "Girar a la derecha",
      resetNorth: "Reorientar al norte",
      resetView: "Restablecer la vista",
    },
    dock: {
      aria: "Dimensiones climáticas",
      tabs: "Dimensiones ambientales",
      map: "Mapa",
      stations: "Estaciones",
      stationsTitle:
        "Estaciones de referencia NOAA: una por provincia en la vista nacional y todas las de la región seleccionada (o nodos de cuenca). La lista completa está en el catálogo de estaciones.",
      tropical: "Noches tropicales",
      hotDays: "Días > 35 °C",
      drySpell: "Racha seca",
      wettest: "Día más lluvioso",
      annual: "Anual",
      annualTitle: "Valor anual observado",
      trend: "Tendencia",
      trendTitle: "Pendiente por década del periodo ajustado. No es un pronóstico.",
      prev: "Paso anterior de la línea de tiempo",
      next: "Paso siguiente de la línea de tiempo",
      pause: "Pausar la línea de tiempo",
      play: (from, to) => `Reproducir los años observados ${from}–${to} y después la tendencia ajustada`,
      slider: "Años observados y después el resumen de la tendencia ajustada",
      trendValue: (from, to) => `Tendencia ajustada ${from}–${to}. No es un pronóstico.`,
      preparingFrames: "Preparando los fotogramas observados…",
      blend: "Mezcla visual entre años observados consecutivos. No es un año nuevo ni un pronóstico.",
      nextTrend: (from, to) =>
        `Siguiente: mapa de pendiente Theil–Sen de ${from}–${to}. No es un año nuevo ni un pronóstico.`,
      slopeNote: (from, to) =>
        `Pendiente Theil–Sen por década, años completos ${from}–${to}. El color muestra la pendiente; puntos, rayado y anillos marcan las tendencias no robustas (ver la clave del mapa). No es un pronóstico.`,
      pilot: "Piloto",
    },
    dimensions: {
      snow: { short: "Nieve", label: "Nieve" },
      temperature: { short: "Temp.", label: "Temperatura" },
      precipitation: { short: "Lluvia", label: "Precipitación" },
      drought: { short: "Sequía", label: "Años secos / húmedos" },
      water_rivers: { short: "Ríos", label: "Agua y ríos" },
      heat_extremes: { short: "Calor ext.", label: "Extremos de calor" },
      rain_extremes: { short: "Lluvia ext.", label: "Extremos de lluvia" },
    },
    places: {
      aria: "Lugar",
      scale: "Escala del lugar",
      spain: "España",
      region: "Comunidad",
      province: "Provincia",
      allSpain: "Toda España",
      fit: "Encajar España en la vista",
      choose: "Elegir otro lugar",
      clip: "Recortar el mapa a este lugar",
      clipShort: "Recorte",
      focus: "Centrar este lugar",
      searchRegion: "Buscar comunidad…",
      searchProvince: "Buscar provincia…",
      all52: "Todas (52)",
      prov: "prov.",
      provs: "prov.",
    },
    legend: {
      aria: "Leyenda de marcadores",
      title: "Qué son los puntos",
      station: "Estación meteorológica (NOAA)",
      stationHint: "Termómetro o pluviómetro. No es una central.",
      wind: "Eólica terrestre",
      windHint: "Parque eólico registrado (Castilla y León). Triángulo verde azulado.",
      solar: "Solar fotovoltaica",
      solarHint: "Planta fotovoltaica registrada (Castilla y León). Cuadrado ámbar.",
      hydro: "Hidráulica",
      hydroHint: "No está en este registro. Esta capa solo incluye eólica y fotovoltaica, y solo en Castilla y León.",
      mw: "Los MW registrados no son electricidad producida. Los puntos están dentro de los perímetros oficiales.",
    },
  relations: {
      title: "Mapas de relación",
      loading: "Cargando mapas de relación…",
      error: "No se pudo cargar relationship-maps.json.",
      exploratory: "EXPLORATORIO",
      choose: "Elige una relación",
      maps: {
        agreement: { tab: "Acuerdo", title: "Reanálisis frente a estaciones: acuerdo año a año", question: "¿Suben y bajan a la vez las celdas MERRA-2 y las estaciones NOAA de un año a otro?" },
        "trend-gap": { tab: "Brecha", title: "Reanálisis frente a estaciones: diferencia de tendencia", question: "¿La celda MERRA-2 se calienta más rápido o más lento que la estación que contiene?" },
        "temp-precip": { tab: "Calor × seco", title: "¿Los años cálidos son también secos?", question: "Relación año a año entre la temperatura anual (MERRA-2) y la lluvia anual (GPM), sin tendencias." },
        "heat-drought": { tab: "Calor × sequía", title: "Días de calor y rachas secas en estaciones", question: "¿Los años con más días por encima de 35 °C tienen también rachas secas más largas? Sin tendencias." },
      },
      scaleLow: { agreement: "r 0,5 (débil)", "trend-gap": "la celda se calienta menos", "temp-precip": "años cálidos más secos", "heat-drought": "años opuestos" },
      scaleHigh: { agreement: "r 1 (idéntico)", "trend-gap": "la celda se calienta más", "temp-precip": "años cálidos más húmedos", "heat-drought": "calor con rachas secas" },
      agreementSummary: (n, r, sign) => `${n} estaciones emparejadas. r año a año mediana = ${r}. Mismo signo de tendencia en ${sign} de ${n}.`,
      trendGapSummary: (n, diff) => `${n} estaciones emparejadas. Diferencia mediana (celda − estación) ${diff} °C/década.`,
      couplingSummary: (tested, neg, robust, qMin, rho) => `${tested} celdas analizadas. ${neg} tienen correlación de rangos negativa (rho de Spearman, mediana ${rho}), pero ${robust} superan FDR (q mínima = ${qMin}).`,
      compoundSummary: (tested, pos, robust, qMin, rho) => `${tested} estaciones analizadas. ${pos} tienen correlación de rangos positiva (rho de Spearman, mediana ${rho}), pero ${robust} superan FDR (q mínima = ${qMin}).`,
      noRobust: "No se detecta una relación robusta",
      signNote: "Las celdas y estaciones vecinas no son independientes: el recuento de signos es descriptivo, no un test.",
      cellsKey: "Cada cuadrado es una celda MERRA-2 (0,5° × 0,625°); color = rho de Spearman.",
      dottedKey: "Punteado: no robusta tras FDR (q ≥ 0,05)",
      blankKey: "En blanco: cobertura GPM insuficiente (< 50 % de la celda)",
      filledKey: "Relleno: robusta tras FDR",
      ringKey: "Anillo: no se detecta una relación robusta",
      greyKey: "Gris pequeño: evidencia insuficiente (< 15 años emparejados)",
      agreementPoint: (r, n) => `r ${r} · ${n} años`,
      trendGapPoint: (diff, cell, station) => `Δ ${diff} °C/década (celda ${cell}, estación ${station})`,
      robustPoint: "Robusta tras FDR",
      notRobustPoint: "No se detecta una relación robusta",
      insufficientPoint: "Evidencia insuficiente",
      data: "Datos",
      period: "Periodo",
      method: "Método",
      design: "Diseño fijado antes de calcular: docs/RELATIONSHIP_MAPS.md",
      doNot: "Solo covariación año a año. No es causalidad, ni tendencia, ni pronóstico.",
      whyDetrend: "A cada serie se le quita antes su propia tendencia: dos series que crecen a la vez parecerían relacionadas.",
      activeHint: "El globo muestra esta relación mientras el panel está abierto. Ciérralo para volver al mapa climático.",
    },
    mapKey: {
      aria: "Cómo leer el mapa",
      title: "Cómo leer el mapa",
      cells: (resolution) => `Cada cuadrado es una celda nativa (${resolution}). Sin suavizado entre celdas.`,
      cellsRobust: "Celda lisa: la tendencia se mantiene tras FDR entre celdas",
      cellsDotted: "Celda punteada: no se detecta una tendencia robusta (FDR, q ≥ 0,05)",
      cellsNoFdr: "Solo pendientes: este bundle no trae la etiqueta FDR por celda.",
      basinsValue: "Un color plano por caja de cuenca (media GPM), no la cuenca hidrográfica real.",
      basinsRobust: "EXPLORATORIO: p < 0,05 y el IC excluye 0 (sin ajustar por 8 cuencas)",
      basinsHatched: "Rayado: no se detecta una tendencia robusta",
      basinsNone: "Gris: evidencia insuficiente (GPM cubre < 95 % de la caja)",
      stationsValue: (year) => `Color y tamaño: valor observado en la estación en ${year}.`,
      stationsNoField: "No se pinta nada entre estaciones: ahí no hay datos.",
      stationRobust: "Relleno: la tendencia se mantiene tras FDR entre estaciones",
      stationRing: "Anillo: no se detecta una tendencia robusta",
      stationInsufficient: "Gris pequeño: evidencia insuficiente (< 15 años completos)",
      symbolRobust: "La tendencia se mantiene tras FDR (familia del mapa)",
    },
    coords: {
      selection: "Selección",
      point: "Punto",
      copy: "Copiar",
      copied: "Copiado",
      clear: "Borrar",
      copiedLive: "Coordenadas copiadas",
      station: "Estación NOAA GHCN-Daily",
      basinHub: "Nodo de cuenca",
      reservoir: "Embalse",
      lake: "Lago",
      lagoon: "Laguna costera",
      installation: "Instalación registrada · JCyL",
      river: "Río",
      mesh: "malla renderizada, aproximada",
      sample: "muestra más detallada",
      aboveSea: "Sobre el nivel del mar.",
      ellipsoid: "Altura sobre el elipsoide WGS84.",
    },
    outcome: {
      increase: "Aumento respaldado",
      decrease: "Descenso respaldado",
      exploratory: "EXPLORATORIO — multiplicidad sin ajustar",
      noRobust: "No se detecta una tendencia robusta",
      insufficient: "Evidencia insuficiente",
      supportedTrend: "tendencia respaldada",
      noRobustShort: "no se detecta una tendencia robusta",
    },
    evidence: {
      aria: "Evidencia de la tendencia",
      trend: "Tendencia",
      spain: "España",
      nationalView: "Vista nacional",
      clicked: "Pulsado en el mapa",
      nationalCanarias: "Vista nacional (Canarias se informa aparte)",
      close: "Cerrar el panel de evidencia",
      loading: "Cargando…",
      noSeries: "No hay serie observada para este lugar.",
      observed: (units) => `Observado (${units})`,
      senLine: "Recta de Theil–Sen, solo el periodo ajustado",
      wetBar: "Más húmedo que 2000–2024 (sobre 0)",
      dryBar: "Más seco que 2000–2024 (bajo 0)",
      globeSlope: "El globo muestra el campo de pendientes, no un año posterior.",
      chartAria: (title, from, to, units) => `${title}, observado ${from}–${to}, ${units}`,
      corrected: " (corregido por autocorrelación)",
      noTrend: "No hay una tendencia precalculada para este lugar.",
      slopeLabel: "pendiente",
      mapSlope: (slope, units, from, to) =>
        `Mapa: pendiente Theil–Sen ${slope} ${units} para ${from}–${to}. No es un pronóstico.`,
      observedYear: (year, value, units) => `${year}: ${value} ${units} (observado)`,
      noDataYear: (year) => `No hay datos de ${year} en este lugar.`,
      source: "Fuente y soporte",
      method: "Método",
      methodBody:
        "Pendiente de Theil–Sen con IC del 95 %; prueba de Mann–Kendall (corregida por empates y comprobada frente a la autocorrelación). Respaldado = p < 0,05 y el IC excluye 0. Solo años civiles completos.",
      doNot: "No concluyas: no es un pronóstico, ni una causa, ni producción energética, ni idoneidad de un emplazamiento.",
      multiplicity:
        "EXPLORATORIO: cada región se contrasta por separado, sin ajuste por las ~72 regiones que se ofrecen aquí. Tras un ajuste de Benjamini–Hochberg, ninguna etiqueta regional de lluvia o de anomalía de lluvia y solo 0 de 17 etiquetas de escorrentía modelada siguen respaldadas. Las etiquetas de temperatura no cambian.",
      basins: "Cajas de cuenca",
      box: "caja",
      stations: "Estaciones",
      nearest: (name, km) => (km ? `Estación NOAA más cercana: ${name} · ${km} km` : `Estación NOAA más cercana: ${name}`),
      browse: "Ver todas las estaciones meteorológicas",
      near: (name) => `Cerca de ${name}`,
      basinBox: (name) => `Caja de la cuenca ${name}`,
      thisPlace: "Este lugar",
      peninsula: "Península y Baleares",
      stationShort: "Estaciones NOAA GHCN-Daily",
      noSeriesArea: "No hay una serie precalculada para esta zona.",
      stationYears: "Esta estación tiene menos de 15 años completos para esta variable.",
      pickStation:
        "No se calculan tendencias de área para variables de estación (la red cambia con el tiempo). Elige una estación en el mapa o en el catálogo.",
      stationSource: (name) => `Estación NOAA GHCN-Daily ${name} (solo años completos; sin homogeneizar)`,
      scopeSource: (source, area) => `${source}, ${area}, media ponderada por área`,
      basinSource: (name) => `NASA GPM IMERG, caja envolvente de ${name} (no es la cuenca hidrográfica)`,
      levelNational: "Administración General del Estado",
      levelRegion: "Comunidad autónoma",
      levelProvince: "Administración provincial",
    },
    findings: {
      aria: "Resultados del estudio",
      title: "Resultados del estudio",
      close: "Cerrar los resultados",
      questionLabel: "Pregunta de investigación",
      question: "¿Son cada vez más frecuentes en España los días en que el recurso solar y el eólico están bajos a la vez (2001–2025)?",
      banner:
        "Calculado por la cadena de Python y mostrado tal cual se publicó. EXPLORATORIO hasta la revisión humana independiente. No se calcula ninguna correlación entre las dos preguntas.",
      invented: "No se ha inventado ningún resultado.",
      howSit: "Cómo se sitúan las preguntas",
      diagram: "Dos preguntas NASA sobre España, sin vínculo causal",
      air: "Temperatura del aire",
      solarWind: "Mínimos de sol y viento",
      sameCountry: "Mismo país · pregunta distinta",
      noArrow: "Sin flecha causal · no es una correlación ajustada",
      spainExtent: "España · Península y Baleares",
      finding1: "Contraste · temperatura del aire (NASA MERRA-2)",
      loadingGate: "Cargando la ficha de temperatura del aire…",
      finding2: "Respuesta · mínimos conjuntos de sol y viento (NASA POWER)",
      insufficientFive: "Evidencia insuficiente (5/5 regiones)",
      jointNote:
        "No hay una tendencia detectable en los días de recurso conjunto bajo, 2001–2025, en ninguna de las cinco regiones preregistradas. No detectar un cambio no prueba estabilidad: con 25 años el test solo puede detectar tendencias de unos 2–3 días por década. No es generación.",
      relate: "Cómo se relacionan sol y viento",
      relateBody:
        "Solo descriptivo: con qué frecuencia ambos recursos están bajos el mismo día, frente a la independencia. No es una tendencia. No es fiabilidad de la red.",
      chance: "× tasa de azar",
      independence:
        "1,00 coincidiría con el azar independiente. Un valor inferior a 1 significa que los mínimos coinciden menos a menudo en estos datos.",
      notPresentable: "No es un resultado presentable",
      notPresentableBody:
        "La lluvia GPM y la escorrentía modelada GLDAS están en el mapa, pero sus etiquetas regionales de «respaldado» no superan un ajuste por comparaciones múltiples, así que no las presentamos como resultados. Aquí no se vinculan con ninguna de las dos preguntas.",
      mapNote:
        "El globo muestra como contexto el mapa climático elegido a la izquierda (temperatura del aire por defecto). Las bajadas conjuntas de sol y viento son resultados de cinco regiones, no una capa del mapa.",
      openCards: "Abrir las fichas de evidencia",
    },
    cards: {
      title: "Fichas de evidencia",
      topic: "Tema de la evidencia",
      air: "Temperatura del aire",
      joint: "Mínimos conjuntos de sol y viento",
      selected: "Región seleccionada:",
      spainNational: "España (vista nacional)",
      failed: (error) => `Los datos no superaron los controles de calidad: no se ha podido cargar la evidencia (${error}).`,
      loading: "Cargando la evidencia…",
      resultFor: "Resultado para",
      canarias: "(Canarias se informa aparte)",
      noCard: (topic, name) => `No hay ficha de evidencia de ${topic} para ${name}.`,
      jointScope:
        "El estudio preregistrado cubre solo Península y Baleares, Galicia, Castilla y León, Aragón y Andalucía.",
      airTopic: "temperatura del aire",
      jointTopic: "sol y viento",
      ownTrend:
        "La tendencia de temperatura MERRA-2 de esta región (precalculada por el mismo proceso) está en el panel de tendencia.",
      openTrend: "Abrir el panel de tendencia",
      hide: "Ocultar",
      show: "Mostrar",
      nationalRef: (region, name) => `la referencia nacional (${region}, no ${name})`,
      notFor: (region, name) => `Referencia nacional: ${region}. Esto no es un resultado para ${name}.`,
      what: "Qué",
      where: "Dónde",
      when: "Cuándo",
      evidence: "Evidencia",
      years: "años",
      bh: (p) => `(p ajustada BH ${p})`,
      power: (value, units) => `. Tendencia mínima detectable con un 80 % de potencia ≈ ${value} ${units}`,
      context: "Contexto descriptivo (no es una tendencia)",
      jointDays: (observed, expected, lo, hi, ratio) =>
        `${observed} días de mínimo conjunto en 2001–2025 frente a ≈${expected} esperados si los mínimos diarios de sol y viento fueran independientes (intervalo del 95 % ${lo}–${hi}; razón ${ratio}).`,
      nullModel: (model) => `Modelo nulo: ${model}. Describe datos de recurso, no la fiabilidad de la red.`,
      doNot: "No concluyas:",
      limits: "Limitaciones y sensibilidad",
      sensitivity: "Sensibilidad:",
      sources: "Fuentes y procedencia",
      ci: (lo, hi) => `IC del 95 % de ${lo} a ${hi}`,
      window: (lo, hi) => `rango entre ventanas de ${lo} a ${hi}`,
    },
    stations: {
      title: "Catálogo de estaciones",
      intro: (years) =>
        `Estaciones meteorológicas NOAA GHCN-Daily: mediciones en tierra para contrastar las mallas NASA. El mapa muestra una estación de referencia por provincia (el registro más largo, ≥${years} años).`,
      which: "Qué estaciones",
      reference: (n) => `Referencia · ${n}`,
      all: (n) => `Todas · ${n}`,
      inScope: (name) => `en ${name}`,
      searchPlaceholder: "Estación, provincia o comunidad",
      search: "Buscar estaciones",
      record: "Estación · registro",
      trend: "Tendencia / década",
      trendTitle: (year) =>
        `Pendiente Theil–Sen, 2001–${year}. ● = respaldada tras el control de comparaciones múltiples (Mann–Kendall p < 0,05, el IC excluye 0, Benjamini–Hochberg q < 0,05 entre estaciones)`,
      noEquivalent: " — esta capa no tiene equivalente de estación",
      loading: "Cargando estaciones…",
      none: "Ninguna estación coincide.",
      shortRecord: "registro corto",
      supported: "tendencia respaldada",
      noRobust: "no se detecta una tendencia robusta",
      footnote: (year) =>
        `Fuente: NOAA NCEI GHCN-Daily, 2001–${year}, valores anuales a partir de registros diarios. No son datos NASA. Pendiente Theil–Sen, solo años completos. ● respaldada (p < 0,05, el IC excluye 0, q BH < 0,05 entre estaciones), ○ no se detecta una tendencia robusta. Las estaciones no están homogeneizadas.`,
      other: "Otras",
      yr: "años",
      refBadge: "REF",
      units: { nights: "noches", days: "días" },
      metrics: {
        tavg: "Temperatura media del aire",
        tmax: "Máxima diaria media",
        dtr: "Amplitud térmica diaria",
        prcp: "Precipitación anual",
        tropical_nights: "Noches tropicales",
        hot_days_35: "Días por encima de 35 °C",
        wettest_day: "Día más lluvioso",
        max_dry_spell: "Racha seca más larga",
        snow_days: "Días de nieve",
        max_snwd: "Espesor máximo de nieve",
      },
    },
    taro: {
      aria: "TARO",
      close: "Cerrar TARO",
      ready: "Listo",
      investigating: "Investigando",
      insufficient: "Evidencia insuficiente",
      answerReady: "Respuesta lista",
      intro: "TARO, el compañero de investigación de AETHRA. Evidencia NASA, sistemas terrestres y recursos energéticos. Sin números inventados.",
      you: "Tú",
      ask: "Preguntar",
      placeholder: "Pregunta a TARO…",
      question: "Pregunta de investigación",
      investigatingLine: "Investigando…",
      unavailable: "TARO no está disponible",
      noInvention: "No se ha inventado ninguna respuesta científica.",
      requestFailed: "La solicitud ha fallado",
      openEvidence: "Abrir la evidencia",
      showMap: "Ver en el mapa",
      showSeries: "Ver la serie",
      starters: [
        "¿Cuál es la tendencia de temperatura en la Península y Baleares?",
        "¿Por qué una temperatura alta puede reducir la eficiencia fotovoltaica?",
        "¿El calentamiento que encuentra AETHRA implica menos generación fotovoltaica?",
        "¿Por qué Castilla y León es interesante para investigar renovables híbridas?",
      ],
    },
    menu: {
      places: "Destinos geográficos",
      landmarks: "Lugares de referencia",
      cases: "Casos de investigación",
      plant: "Planta registrada",
      explore: "Explorar España",
      destinations: "Destinos en España",
      park: "parque nacional: no es un emplazamiento energético",
      landmark: "Lugar natural de referencia",
      overview: "Vista general",
      installation: "Instalación registrada",
      research: "Caso de investigación",
      hints: {
        spain: "Volver a la vista general",
        mulhacen: "Sierra Nevada · parque",
        "picos-de-europa": "Torre Cerredo · parque",
        "case-r0-joint-low": "Caso nacional de la Puerta B",
        "case-es11-joint-low": "Caso con marco eólico",
        "case-es41-joint-low": "Caso con marco híbrido",
        "case-es24-joint-low": "Caso con marco eólico",
        "case-es61-joint-low": "Caso con marco solar",
        "installation-buniel": "3D ilustrativo",
      },
      names: {
        spain: "España",
        "case-r0-joint-low": "Península y Baleares",
        "installation-buniel": "Buniel (eólica registrada)",
      },
    },
    casePanel: {
      aria: "Caso de investigación energética",
      title: "Casos de investigación",
      close: "Cerrar el caso",
      regions: "Regiones de la Puerta B",
      caseStudy: (code) => `Caso de estudio ${code}`,
      historical: (nuts) => `Evidencia NASA histórica · Investigación regional · ${nuts}`,
      nationalNuts: "Península y Baleares",
      nuts: (code) => `NUTS-2 ${code}`,
      banner: "EXPLORATORIO · cita a Python · evidencia insuficiente en 5/5 regiones",
      verdict: "Veredicto",
      insufficient: "Evidencia insuficiente",
      seriesError: (error) => `No se ha cargado la serie: ${error}`,
      loading: "Cargando la serie observada…",
      trend: "Tendencia",
      ci: (slope, units, lo, hi) => `${slope} ${units} (IC ${lo} a ${hi})`,
      nMedian: (n, median) => `${n} años · ${median} días/año`,
      pFamily: (p, bh) => `${p} · ${bh} (familia de 5)`,
      overlay: "Capa del globo (contexto, no una puntuación)",
      overlayBody:
        "El mapa se recorta a esta región para ver qué celdas pertenecen al caso. Ese mapa de color es la dimensión climática que ya habías elegido, no una capa de potencial ni de idoneidad. La evidencia de mínimos conjuntos está en el gráfico de arriba (media regional POWER), no en una capa por celda.",
      why: "Por qué esta región",
      whereWhen: "Dónde / cuándo",
      current: "Contexto actual",
      horizon: "Horizonte 2032–2040 (no es un pronóstico)",
      reference: (name) => `Referencia: ${name}. La diferencia no se ha contrastado.`,
      open: (name) => `Abrir ${name}`,
      register: "Registro de CyL (capa opcional)",
      showPlants: "Mostrar 652 plantas registradas",
      plantsNote:
        "Apagado por defecto. Las demás comunidades no tienen capa de plantas aquí, así que un mapa denso de Castilla y León no demuestra que esta región esté más construida ni tenga más potencial.",
      showModel: "3D ilustrativo en Buniel",
      appearance: "Apariencia",
      existing: "Existente — verificado",
      conceptual: "Conceptual — no es un proyecto aprobado",
      frames: {
        hybrid: "Complementariedad del recurso solar y eólico",
        wind_focus: "Contexto del recurso eólico",
        solar_focus: "Contexto del recurso solar",
      },
      chartCaption: (label, units, year) =>
        `${label} (${units}). Línea continua: años observados. Discontinua: Theil–Sen solo en 2001–${year}. Trama 2026–2040: no hay proyección validada. No es un pronóstico.`,
      chartCaptionHistorical: (label, units, year) =>
        `${label} (${units}). Línea continua: años observados. Discontinua: Theil–Sen ajustada solo en 2001–${year}; el gráfico termina en el último año observado.`,
      complementarity: "Complementariedad (descriptiva)",
      complementarityNote: "Días de mínimo conjunto 2001–2025 frente a la independencia por desplazamiento de año. No es una tendencia.",
      observed: "Observado",
      independent: "Si fueran independientes",
      ratio: (ratio, pct) =>
        `Razón ${ratio}: los mínimos conjuntos ocurren alrededor del ${pct} % de lo que sugeriría la independencia.`,
      modelDrawn: (metres) => `Dibujado a unos ${metres} m de altura para que se lea en el globo.`,
      nMedianLabel: "n / mediana",
      pLabel: "p / p BH",
      e0Solar: "E0 solar",
      e0Wind: "E0 eólico",
      opacity: "Opacidad del modelo fantasma",
      openCard: "Abrir la ficha de evidencia",
      returnSpain: "Volver a España",
      noProjection: "Sin proyección validada",
      chartAria: (label, from, to) => `${label}, observado ${from}–${to}, sin proyección después de ${to}`,
      chartAriaHistorical: (label, from, to) => `${label}, observado ${from}–${to}, con la tendencia histórica ajustada`,
      illustrativeDisclaimer: "3D ilustrativo: no es una reconstrucción exacta. La altura está exagerada para que se vea.",
      conceptualDisclaimer: "Conceptual / No es un proyecto real. Solo es una vista previa de estilo, no una planta propuesta.",
    },
    brandStory: {
      open: "Sobre AETHRA",
      close: "Cerrar",
      dialog: "Sobre AETHRA",
      greeting: "Un fin de semana, un globo y una pregunta terca.",
      origin:
        "Somos un equipo pequeño en Málaga. AETHRA nació en el NASA Space Apps Challenge 2026, reto 02: sé detective de tendencias de la Tierra. Nos lo tomamos al pie de la letra.",
      challenge:
        "El encargo es poco glamuroso, y por eso nos gusta. Coger datos de la Tierra de la NASA, elegir un lugar de verdad y mostrar si algo cambió: con las cifras, la incertidumbre y los límites al lado de la respuesta.",
      missionTitle: "Para qué existimos",
      mission:
        "Acortar el tiempo entre una pregunta curiosa sobre España y una conclusión que puedas rastrear hasta datos de la NASA. Lo que vale es una ficha de evidencia — serie, pendiente, confianza, fuentes — no un mapa más bonito.",
      visionTitle: "Hacia dónde miramos",
      vision:
        "La curiosidad grande es cómo están cambiando las condiciones ambientales que rodean la energía limpia en España. Eso es el horizonte. La misión de hoy es España: empezar por una tendencia que podamos defender, y no fingir que la pregunta energética está resuelta cuando no lo está.",
      honestyTitle: "Cómo hablamos",
      honesty:
        "«Sin tendencia robusta» y «evidencia insuficiente» son resultados de verdad. Si no hay ficha para una región, lo decimos. No pronosticamos 2030, no clasificamos emplazamientos y no disfrazamos un reanálisis de un termómetro en el campo.",
      independent: "Proyecto independiente de Space Apps. No es un producto oficial de la NASA.",
      back: "Volver a España",
    },
  },
};

export type Messages = Copy;
