import { NAMED_PLACES, type NamedPlace } from "../globe/places-es.ts";
import { cardFor, type EvidenceCard, type EvidenceCatalog } from "./cards.ts";
import { ciRangeText, interpretCard, interpretOutcome, outcomeLabelText, unitsText } from "./interpret.ts";
import { claimById, CYL_INCLUDED_INSTALLATIONS } from "./knowledge/claims.ts";
import { matchesCurriculum, selectClaims } from "./knowledge/select.ts";
import type { KnowledgeClaim } from "./knowledge/types.ts";
import { findRegionalScope } from "./markdown-brain.ts";
import type {
  AgentActionType,
  AgentAnswer,
  AgentIntent,
  AgentLanguage,
  AgentSession,
  AgentStatus,
  AgentViewContext,
  AskRequest,
  ConversationTurn,
} from "./types.ts";
import { buildVisualizationContext } from "./visualization-context.ts";

export const MAX_QUESTION_CHARS = 800;
export const MAX_CONVERSATION_TURNS = 12;

export type StudyRegion = {
  scope: string;
  name: string;
  dest: string;
  aliases: readonly string[];
  /** Camera centre from destinations.ts (GISCO NUTS framing). Not a plant site. */
  latitude: number;
  longitude: number;
};

export const STUDY_REGIONS: readonly StudyRegion[] = [
  {
    scope: "age",
    name: "Peninsula + Balearics",
    dest: "case-r0-joint-low",
    aliases: ["peninsula", "balear", "national", "spain", "españa", "espana", "r0", "peninsular"],
    latitude: 40.2,
    longitude: -3.7,
  },
  {
    scope: "ccaa:ES11",
    name: "Galicia",
    dest: "case-es11-joint-low",
    aliases: ["galicia", "es11"],
    latitude: 42.75,
    longitude: -8.0,
  },
  {
    scope: "ccaa:ES41",
    name: "Castilla y León",
    dest: "case-es41-joint-low",
    aliases: ["castilla", "león", "leon", "es41"],
    latitude: 41.75,
    longitude: -4.5,
  },
  {
    scope: "ccaa:ES24",
    name: "Aragón",
    dest: "case-es24-joint-low",
    aliases: ["aragón", "aragon", "es24"],
    latitude: 41.6,
    longitude: -0.9,
  },
  {
    scope: "ccaa:ES61",
    name: "Andalucía",
    dest: "case-es61-joint-low",
    aliases: ["andalucía", "andalucia", "es61"],
    latitude: 37.45,
    longitude: -4.6,
  },
];

function placePinId(name: string): string {
  return fold(name).replace(/\s+/g, "-");
}

export function findMapPinById(id: string): { id: string; name: string; latitude: number; longitude: number } | undefined {
  const place = NAMED_PLACES.find((p) => placePinId(p.name) === id);
  if (!place) return undefined;
  return { id, name: place.name, latitude: place.latitude, longitude: place.longitude };
}

function matchNamedPlace(text: string): NamedPlace | undefined {
  const f = fold(text);
  // Avoid matching the hydrological term "cuenca del <río>" / "cuencas" as the city of Cuenca
  const cleaned = f
    .replace(/\bcuencas\b/g, " ")
    .replace(/\bcuenca\s+(del|de\s+la|hidrografica|hidraulica|fluvial)\b/g, " ");
  const hits = NAMED_PLACES.filter((p) => {
    const pn = fold(p.name);
    return pn === "cuenca" ? cleaned.includes("cuenca") : f.includes(pn);
  });
  if (hits.length === 0) return undefined;
  return [...hits].sort((a, b) => {
    const la = fold(a.name).length;
    const lb = fold(b.name).length;
    if (lb !== la) return lb - la;
    return f.indexOf(fold(a.name)) - f.indexOf(fold(b.name));
  })[0];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function detectLanguage(question: string): AgentLanguage {
  if (/[¿¡]/.test(question)) return "es";
  const f = fold(question);
  const es = (f.match(/\b(que|cual|por que|como|tendencia|calentamiento|lluvia|cuenca|instalaci|haria|alli|donde|sentido|hay|una|los|las)\b/g) ?? []).length;
  const en = (f.match(/\b(what|why|how|does|can|the|is|are|for|and|that|this|over|with|from|will|not|if)\b/g) ?? []).length;
  return es > en ? "es" : "en";
}

export function parseAskBody(raw: unknown): AskRequest {
  if (!isRecord(raw)) throw new Error("Body must be a JSON object");
  if (typeof raw.question !== "string") throw new Error("question must be a string");
  const question = raw.question.trim();
  if (!question) throw new Error("question is empty");
  if (question.length > MAX_QUESTION_CHARS) throw new Error("question is too long");
  const session: AgentSession = {};
  if (isRecord(raw.session) && typeof raw.session.regionScope === "string") {
    session.regionScope = raw.session.regionScope;
  }
  if (isRecord(raw.session) && typeof raw.session.sessionId === "string" && raw.session.sessionId.length < 80) {
    session.sessionId = raw.session.sessionId;
  }
  if (isRecord(raw.session) && isRecord(raw.session.viewContext)) {
    const vc = raw.session.viewContext;
    const viewContext: AgentViewContext = {};
    if (typeof vc.dimension === "string") viewContext.dimension = vc.dimension;
    if (typeof vc.year === "number" && Number.isFinite(vc.year)) viewContext.year = vc.year;
    if (vc.mode === "value" || vc.mode === "trend") viewContext.mode = vc.mode;
    if (vc.workspaceMode === "climate" || vc.workspaceMode === "energy") viewContext.workspaceMode = vc.workspaceMode;
    if (typeof vc.activeTool === "string" || vc.activeTool === null) viewContext.activeTool = vc.activeTool;
    if (typeof vc.screeningOpen === "boolean") viewContext.screeningOpen = vc.screeningOpen;
    if (
      isRecord(vc.selectedCoord) &&
      typeof vc.selectedCoord.lat === "number" &&
      typeof vc.selectedCoord.lon === "number"
    ) {
      viewContext.selectedCoord = { lat: vc.selectedCoord.lat, lon: vc.selectedCoord.lon };
    }
    if (typeof vc.selectedCellId === "string") viewContext.selectedCellId = vc.selectedCellId;
    if (typeof vc.selectedPlantName === "string") viewContext.selectedPlantName = vc.selectedPlantName;
    if (typeof vc.selectedInstallationId === "string") viewContext.selectedInstallationId = vc.selectedInstallationId;
    if (typeof vc.energyConcept === "string") viewContext.energyConcept = vc.energyConcept;
    session.viewContext = viewContext;
  }
  const conversation: ConversationTurn[] = [];
  if (Array.isArray(raw.conversation)) {
    for (const turn of raw.conversation.slice(-MAX_CONVERSATION_TURNS)) {
      if (!isRecord(turn) || (turn.role !== "user" && turn.role !== "core") || typeof turn.text !== "string") continue;
      const text = turn.text.trim().slice(0, MAX_QUESTION_CHARS);
      if (text) conversation.push({ role: turn.role, text });
    }
  }
  const language = raw.language === "en" || raw.language === "es" ? raw.language : undefined;
  return { question, session, conversation, language };
}

function signed(n: number, digits = 2): string {
  const mag = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${mag}`;
  if (n < 0) return `−${mag}`;
  return mag;
}

function matchScope(text: string): StudyRegion | undefined {
  const f = fold(text);
  const ranked = STUDY_REGIONS.filter((r) => r.aliases.some((a) => f.includes(a)));
  if (ranked.length === 0) return undefined;
  return ranked.sort((a, b) => b.name.length - a.name.length)[0];
}

function matchNamelessPlace(text: string): string | undefined {
  if (matchScope(text)) return undefined;
  return matchNamedPlace(text)?.name;
}

function resolveScope(question: string, session: AgentSession): StudyRegion | undefined {
  const fromQuestion = matchScope(question);
  if (fromQuestion) return fromQuestion;
  if (matchNamedPlace(question)) return undefined;
  return STUDY_REGIONS.find((r) => r.scope === session.regionScope);
}

function isMixedWarmingPv(f: string): boolean {
  const energy = /\b(pv|photovolta|fotovolta|mwh|generat)/.test(f);
  const warm = /\b(temperatur|warming|calent|merra|t2m|aethra)\b/.test(f);
  const link = /\b(imply|implica|prove|prueba|mean lower|fewer|menos|less)\b/.test(f);
  return energy && warm && link;
}

function isUnsupportedForecast(f: string): boolean {
  const future = /\b(2030|2032|2035|2038|2040|ssp|nex-gddp|cmip6)\b/.test(f);
  if (isMixedWarmingPv(f) && !future) return false;
  if (/\b(how many mwh will|will (this|the) .{0,40}generat|va a generar|cuantos mwh)\b/.test(f)) return true;
  if (future) return true;
  return /\b(forecast|predic|pronostic)/.test(f) || /\bpendiente de sen\b/.test(f);
}

export function classifyIntent(q: string): AgentIntent {
  const f = fold(q);
  if (/\b(ignore .{0,24}instructions|system prompt|you are now|jailbreak|forget (your )?rules|override (the )?policy)\b/.test(f)) {
    return "prompt_injection";
  }
  if (/\b(invent\w*|make up|fabricate|pretend|fake (a )?(doi|source)|cite a scientific source that does not exist)\b/.test(f)) {
    return "invent_source";
  }
  if (
    /\b(buy land|comprar (tierra|terreno)|invest\b|roi\b|invertir|permiso de (obra|construccion)|where should i buy|rank all|recommend an energy investment)\b/.test(
      f,
    )
  ) {
    return "investment_advice";
  }
  if (isMixedWarmingPv(f)) return "mixed_warming_pv";
  if (isUnsupportedForecast(f)) return "unsupported_forecast";
  if (/\b(recipe|joke|poem|capital of|who won|password|crypto|credentials|secrets)\b/.test(f)) return "out_of_domain";
  if (
    /\b(why is|por que es|interesting for hybrid|hybrid renewable|where should we investigate|research candidate)\b/.test(f) ||
    (/\b(hybrid|hibrid)\b/.test(f) && /\b(castilla|leon|investig|research|interes)\b/.test(f))
  ) {
    return "research_case";
  }
  const definitional =
    /\b(what is|what does|que es|que significa|why can|por que puede|how does|como (afecta|funciona)|difference between|diferencia entre|why does|versus|frente a)\b/.test(
      f,
    );
  const trendish = /\b(trend|tendencia|changed|cambio|become more)\b/.test(f);
  if (definitional && !trendish) {
    const mechanismTopic =
      /\b(pv|photovolta|fotovolta|efficiency|eficiencia|ghi|dni|capacity factor|power curve|runoff|reanalysis|module|theil|ols|autocorrelat)\b/.test(
        f,
      );
    if (
      mechanismTopic ||
      !/\b(temperatur|evidencecard|evidence card|instal|plant|nasa evidence)\b/.test(f)
    ) {
      return "explain_mechanism";
    }
  }
  if (/\benergy gap\b/.test(f)) return "joint_low_trend";
  if (/\b(instalar|industria energetic)/.test(f)) return "nasa_evidence";
  if (/\b(temperatur|warming|t2m|calent)/.test(f)) return "temperature_trend";
  if (
    /\bprecip\w*\b/.test(f) ||
    /\b(lluvia\w*|rainfall|\brain\b|cuenca\w*|hidraul\w*|hidrolog\w*|imerg|gpm|basin\w*|sequia\w*|drought|escorrent\w*)\b/.test(f)
  ) {
    return "precipitation_trend";
  }
  if (
    /\beolic\w*\b/.test(f) ||
    /\b(wind farm|wind energy|energia eolica|joint|low (solar|wind|resource)|complement\w*|sol y viento|fotovolta\w*|photovoltaic)\b/.test(f) ||
    /\b(parque (eolico|solar)|recurso (eolico|solar|wind))\b/.test(f)
  ) {
    return "joint_low_trend";
  }
  if (/\b(plant|instalaci\w*|installation|buniel|mw\b|capacity)\b/.test(f)) {
    return "infrastructure_metadata";
  }
  if (/\bcompar|\bobjectively better|\bmejor que\b/.test(f)) {
    if (/\b(temperatur|warming|t2m|calent)/.test(f)) return "temperature_trend";
    return "compare_joint_low";
  }
  if (/\b(additional data|what (else|more) would|need to evaluate|finer scale|parcel)\b/.test(f)) {
    return "research_gap";
  }
  if (/\b(joint|low (solar|wind|resource)|complement|solar and wind|sol y viento)\b/.test(f)) {
    return "joint_low_trend";
  }
  if (/\b(nasa evidence|evidence card|muestra|evidencia)\b/.test(f)) return "nasa_evidence";
  if (/\b(temperatur|warming|t2m|calent)/.test(f)) return "temperature_trend";
  if (/\b(trend|tendencia|changed|cambio)\b/.test(f)) return "nasa_evidence";
  if (matchesCurriculum(q)) return "explain_mechanism";
  if (
    /\b(hola|hello|hi\b|buenos dias|buenas|quien eres|who are you|que eres|what are you|que puedes hacer|what can you do|ayuda|help|taro|aethra|espana|spain|clima|climate|tierra|earth|energia|energy|nasa|satelit|mapa|globe|globo|explica|explain|resumen|summary|nota|markdown|estacion\w*|station\w*|noaa|ghcn|embalse\w*|reservoir\w*|swot|screening|cribado|miteco|eurostat|polvo|dust|calima|aerosol\w*|relacion\w*|relationship\w*|correlaci\w*|spearman|pearson|noches tropicales|tropical nights|dias calurosos|hot days|racha seca|dry spell|evapotranspir\w*|humedad del suelo|soil moisture|nieve|snow|swe|visualizaci\w*|viendo|datos)\b/.test(
      f,
    )
  ) {
    return "explain_mechanism";
  }
  return "out_of_domain";
}

export function asksToRankSites(question: string): boolean {
  const f = fold(question);
  return /\b(mejor(es)?|best|optimal|ranking|sitios para|donde (poner|construir|desarroll)|where to (build|develop)|desarrollar (una )?instalaci\w*)\b/.test(f);
}

function canned(language: AgentLanguage, en: string, es: string): string {
  return language === "es" ? es : en;
}

function base(
  question: string,
  intent: AgentIntent,
  language: AgentLanguage,
  status: AgentStatus,
  responseText: string,
): AgentAnswer {
  return {
    status,
    intent,
    question,
    language,
    scope: {},
    findings: [],
    limitations: [],
    suggestedActions: [],
    responseText,
  };
}

function formatLonLat(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

function flyAction(region: StudyRegion, label: string): AgentAnswer["suggestedActions"][number] {
  return {
    type: "FLY_TO_REGION",
    targetId: region.dest,
    label,
    latitude: region.latitude,
    longitude: region.longitude,
  };
}

function actionsFor(card: EvidenceCard, dest: string): AgentAnswer["suggestedActions"] {
  const open: { type: AgentActionType; targetId: string } = { type: "OPEN_EVIDENCE_CARD", targetId: card.id };
  const series: { type: AgentActionType; targetId: string } = { type: "SHOW_TIME_SERIES", targetId: card.id };
  const region = STUDY_REGIONS.find((r) => r.dest === dest);
  const fly = region ? flyAction(region, "Show on map") : { type: "FLY_TO_REGION" as const, targetId: dest };
  return [open, fly, series];
}

/** Wind-framed study region used as a camera guide, not a suitability rank (destinations.ts). */
const WIND_FRAMED_GUIDE: StudyRegion | undefined = STUDY_REGIONS.find((r) => r.scope === "ccaa:ES24");

function claimTexts(question: string, language: AgentLanguage): string {
  return selectClaims(question)
    .map((claim: KnowledgeClaim) => (language === "es" ? claim.textEs : claim.text))
    .join(" ");
}

function jointLowBriefing(
  question: string,
  language: AgentLanguage,
  catalog: EvidenceCatalog,
  focus: StudyRegion,
  missingPlace?: string,
): AgentAnswer {
  const named = matchScope(question);
  const surveyAll = asksToRankSites(question) || !named || named.scope === "age";
  const rows: { region: StudyRegion; card: EvidenceCard }[] = [];
  const targets = surveyAll ? STUDY_REGIONS : [focus];
  for (const region of targets) {
    const card = cardFor(catalog, "joint_low", region.scope);
    if (card) rows.push({ region, card });
  }
  const coord = formatLonLat(focus.latitude, focus.longitude);
  const survey = rows
    .map(({ region, card }) => {
      const here = formatLonLat(region.latitude, region.longitude);
      const ci = ciRangeText(card, language);
      const ciLabel = language === "es" ? "IC 95 %" : "95% CI";
      return `${region.name}: ${outcomeLabelText(card, language)}, ${signed(card.how_much.slope_per_decade)} ${unitsText(card, language)} (${ciLabel} ${ci}) · ${here}`;
    })
    .join(" ");
  const missing = missingPlace
    ? canned(
        language,
        `No EvidenceCard exists for ${missingPlace}; I will not invent one. `,
        `No hay EvidenceCard para ${missingPlace}; no invento una. `,
      )
    : "";
  const focusCard = cardFor(catalog, "joint_low", focus.scope) ?? rows[0]?.card;
  const reading = focusCard ? interpretCard(focusCard, language) : "";
  const extra = claimTexts(question, language);
  const responseText = surveyAll
    ? canned(
        language,
        `${missing}I am not picking a place to build. I opened the five NASA POWER joint-low cards: ${survey} ${focus.name} is the wind-framed research case — interesting to inspect, not a permit. I am leaving it here at ${coord}. Check it on the globe. ${reading} ${extra}`,
        `${missing}No te voy a decir dónde construir. He abierto las cinco cards NASA POWER de recurso conjunto bajo: ${survey} ${focus.name} es el caso wind-framed del proyecto — un recorte bien interesante para mirar, no un permiso de obra. Te lo dejo aquí, ${coord}. Échale un ojo en el globo. ${reading} ${extra}`,
      )
    : canned(
        language,
        `${missing}${reading} Joint-low resource days are not blackouts. ${extra} I am not ranking sites.`,
        `${missing}${reading} Los días de recurso conjunto bajo no son apagones. ${extra} No hago ranking de sitios.`,
      );
  const fly = flyAction(focus, language === "es" ? `Mira ${focus.name}` : `Check ${focus.name}`);
  const open = focusCard
    ? ({ type: "OPEN_EVIDENCE_CARD" as const, targetId: focusCard.id, label: language === "es" ? "Abre la evidencia" : "Open Evidence" })
    : undefined;
  return {
    ...base(question, "joint_low_trend", language, "INSUFFICIENT_EVIDENCE", responseText),
    scope: { regionId: focus.scope, regionName: focus.name, spatialSupport: focusCard?.where },
    findings: rows.map(({ card }) => findingFrom(card)),
    limitations: [
      "Camera target is a research-case centre, not a recommended construction site.",
      ...rows.map(({ card }) => card.do_not_conclude),
    ],
    suggestedActions: [fly, open].filter((a): a is NonNullable<typeof a> => a !== undefined),
  };
}

function asksEnergyInstall(question: string): boolean {
  return /\b(instalar|industria|energetic|haria sentido|sentido instalar)\b/.test(fold(question));
}

function placeBriefing(question: string, language: AgentLanguage, intent: AgentIntent, place: NamedPlace): AgentAnswer {
  const coord = formatLonLat(place.latitude, place.longitude);
  const energy = asksEnergyInstall(question);
  const scopeDigest = findRegionalScope(place.name);
  const tempInfo = scopeDigest?.temperature
    ? language === "es"
      ? ` En el bundle precalculado (${scopeDigest.name}, MERRA-2 2000–2025) la tendencia provincial es ${signed(scopeDigest.temperature.slopePerDecade)} °C/década (IC 95% ${signed(scopeDigest.temperature.ci95[0])} a ${signed(scopeDigest.temperature.ci95[1])}; p = ${scopeDigest.temperature.pValue}; n = ${scopeDigest.temperature.n}).`
      : ` In the precomputed bundle (${scopeDigest.name}, MERRA-2 2000–2025) the provincial trend is ${signed(scopeDigest.temperature.slopePerDecade)} °C/decade (95% CI ${signed(scopeDigest.temperature.ci95[0])} to ${signed(scopeDigest.temperature.ci95[1])}; p = ${scopeDigest.temperature.pValue}; n = ${scopeDigest.temperature.n}).`
    : "";
  const responseText = canned(
    language,
    `There is no EvidenceCard for ${place.name}, and I will not use the national Peninsula + Balearics result instead.${energy ? " I also cannot say which energy industry to install there: that would be a site ranking, which I do not do." : ""}${tempInfo} Published EvidenceCards cover national temperature and five pre-registered solar–wind regions, not ${place.name}. Here is ${place.name} (${coord}).`,
    `No hay EvidenceCard para ${place.name}, y no sustituyo el resultado nacional de Península + Baleares.${energy ? " Tampoco puedo decir qué industria energética instalar ahí: eso sería un ranking de sitios, y no lo hago." : ""}${tempInfo} Las tendencias publicadas en EvidenceCards cubren temperatura nacional y cinco CCAA de recurso solar-viento, no ${place.name}. Aquí tienes ${place.name} (${coord}).`,
  );
  return {
    ...base(question, intent, language, "NOT_AVAILABLE", responseText),
    scope: { regionId: scopeDigest?.scopeKey, regionName: place.name },
    limitations: ["Geographic scope must match the card exactly (D50).", "Not a site ranking or investment recommendation."],
    suggestedActions: [
      {
        type: "FLY_TO_REGION",
        targetId: placePinId(place.name),
        label: language === "es" ? `Mira ${place.name}` : `Check ${place.name}`,
        latitude: place.latitude,
        longitude: place.longitude,
      },
    ],
  };
}

function formatSupplementalVizText(
  question: string,
  language: AgentLanguage,
  regionScope?: string,
  viewContext?: AgentViewContext,
): string {
  const f = fold(question);
  const ctx = buildVisualizationContext({ question, regionScope, viewContext });
  const parts: string[] = [];

  if (ctx.stationDigest) {
    const st = ctx.stationDigest;
    const tavg = st.metrics.tavg;
    const tr = st.metrics.tropical_nights;
    const hd = st.metrics.hot_days_35;
    if (language === "es") {
      parts.push(
        `En la estación NOAA ${st.name} (${st.id}, ${st.elevationM} m):${tavg ? ` temperatura media ${signed(tavg.slopePerDecade)} °C/década (p = ${tavg.pValue}${tavg.series ? `, último año ${tavg.series.lastYear}: ${tavg.series.lastValue} °C` : ""})` : ""}${tr ? `; noches tropicales ${signed(tr.slopePerDecade)} noches/década` : ""}${hd ? `; días > 35 °C ${signed(hd.slopePerDecade)} días/década` : ""}.`,
      );
    } else {
      parts.push(
        `At NOAA station ${st.name} (${st.id}, ${st.elevationM} m):${tavg ? ` mean temperature ${signed(tavg.slopePerDecade)} °C/decade (p = ${tavg.pValue}${tavg.series ? `, latest year ${tavg.series.lastYear}: ${tavg.series.lastValue} °C` : ""})` : ""}${tr ? `; tropical nights ${signed(tr.slopePerDecade)} nights/decade` : ""}${hd ? `; hot days > 35 °C ${signed(hd.slopePerDecade)} days/decade` : ""}.`,
      );
    }
  }

  if (ctx.basinDigests && ctx.basinDigests.length > 0 && /\b(cuenca\w*|basin\w*|ebro|duero|tajo|guadiana|guadalquivir|jucar|segura|mino|sil)\b/.test(f)) {
    const b = ctx.basinDigests[0]!;
    if (b.rain || b.runoff) {
      if (language === "es") {
        parts.push(
          `En las series precalculadas de ${b.name} (EXPLORATORY):${b.rain ? ` lluvia GPM ${signed(b.rain.slopePerDecade)} mm/década (IC 95% ${signed(b.rain.ci95[0])} a ${signed(b.rain.ci95[1])}; p = ${b.rain.pValue})` : ""}${b.runoff ? `; escorrentía modelada GLDAS ${signed(b.runoff.slopePerDecade)} mm/década (p = ${b.runoff.pValue})` : ""}.`,
        );
      } else {
        parts.push(
          `In the precomputed series for ${b.name} (EXPLORATORY):${b.rain ? ` GPM rainfall ${signed(b.rain.slopePerDecade)} mm/decade (95% CI ${signed(b.rain.ci95[0])} to ${signed(b.rain.ci95[1])}; p = ${b.rain.pValue})` : ""}${b.runoff ? `; GLDAS modelled runoff ${signed(b.runoff.slopePerDecade)} mm/decade (p = ${b.runoff.pValue})` : ""}.`,
        );
      }
    }
  }

  if (ctx.reservoirDigests && ctx.reservoirDigests.length > 0 && /\b(embalse\w*|reservoir\w*|swot|solar flotante|floating solar|fpv|mediano|alcantara|buendia|serena|cijara|almendra|ricobayo)\b/.test(f)) {
    const r = ctx.reservoirDigests[0]!;
    if (language === "es") {
      parts.push(
        `Datos satelitales NASA/CNES SWOT (2023–2026, EXPLORATORY) para ${r.name} (${r.provinceName}): ${r.nObs} pases, área media ${r.areaMeanKm2} km² (${r.areaMinKm2}–${r.areaMaxKm2} km², CV = ${r.areaCv}), cota media WSE ${r.wseMeanM} m (±${r.wseStdM} m).`,
      );
    } else {
      parts.push(
        `NASA/CNES SWOT satellite data (2023–2026, EXPLORATORY) for ${r.name} (${r.provinceName}): ${r.nObs} passes, mean area ${r.areaMeanKm2} km² (${r.areaMinKm2}–${r.areaMaxKm2} km², CV = ${r.areaCv}), mean WSE ${r.wseMeanM} m (±${r.wseStdM} m).`,
      );
    }
  }

  if (ctx.solarScreening) {
    const s = ctx.solarScreening.summary;
    const fc = ctx.solarScreening.featuredCase;
    const lm = ctx.solarScreening.matchedLandmark;
    if (language === "es") {
      parts.push(
        `En la visualización de cribado solar FV (pv-screening.json, EXPLORATORY, 2000–2025): de ${s.cellsTested} celdas MERRA-2 analizadas, ${s.cellsGood} son compatibles, ${s.cellsMixed} mixtas y ${s.cellsAvoid} de alta sensibilidad ambiental MITECO; 0/195 celdas tienen tendencia significativa de irradiancia tras FDR (mediana ${signed(s.irrTrendMedianPctDecade)} %/década), mientras ${s.tempCellsSignificantUp}/195 presentan calentamiento estival significativo (penalización térmica mediana ${signed(s.heatPenaltyMedianPctDecade)} %/década).${fc ? ` Caso destacado ${fc.place} (${fc.cellId}): ${fc.irrMeanKwhM2Day} kWh/m²/día, ${fc.mitecoLowModeratePct}% suelo de baja/moderada sensibilidad, ${fc.plantsOperatingN} plantas (${fc.plantsOperatingMw} MW).` : ""}${lm ? ` Planta de referencia ${lm.name}: ${lm.mw} MW en celda ${lm.cellId} (${lm.verdict}).` : ""}`,
      );
    } else {
      parts.push(
        `In the solar PV screening visualization (pv-screening.json, EXPLORATORY, 2000–2025): of ${s.cellsTested} MERRA-2 cells tested, ${s.cellsGood} are compatible, ${s.cellsMixed} mixed and ${s.cellsAvoid} high MITECO sensitivity; 0/195 cells show a significant irradiance trend after FDR (median ${signed(s.irrTrendMedianPctDecade)} %/decade), while ${s.tempCellsSignificantUp}/195 show significant summer warming (median heat penalty ${signed(s.heatPenaltyMedianPctDecade)} %/decade).${fc ? ` Featured case ${fc.place} (${fc.cellId}): ${fc.irrMeanKwhM2Day} kWh/m²/day, ${fc.mitecoLowModeratePct}% low/moderate sensitivity land, ${fc.plantsOperatingN} plants (${fc.plantsOperatingMw} MW).` : ""}${lm ? ` Landmark plant ${lm.name}: ${lm.mw} MW in cell ${lm.cellId} (${lm.verdict}).` : ""}`,
      );
    }
  }

  if (ctx.solarCapacity) {
    const sc = ctx.solarCapacity;
    if (language === "es") {
      parts.push(
        `Según estadísticas oficiales Eurostat (nrg_inf_epcrw), España alcanzó ${sc.latestMw} MW de potencia solar fotovoltaica en ${sc.latestYear} (+${sc.added2024Mw} MW en 2024), siendo #${sc.euRank} de la UE-27 (${sc.euSharePct}% del total tras Alemania con ${sc.germanyMw} MW), con pendiente Theil–Sen 2015–2024 de +${sc.senSlope2015_2024MwYr} MW/año (IC 95% +${sc.ci95_2015_2024[0]} a +${sc.ci95_2015_2024[1]}; p = ${sc.pValue2015_2024}) y CAGR 2019–2024 del ${sc.cagr2019_2024Pct}%.`,
      );
    } else {
      parts.push(
        `According to official Eurostat statistics (nrg_inf_epcrw), Spain reached ${sc.latestMw} MW of installed solar PV capacity in ${sc.latestYear} (+${sc.added2024Mw} MW in 2024), ranking #${sc.euRank} in the EU-27 (${sc.euSharePct}% share after Germany's ${sc.germanyMw} MW), with a 2015–2024 Theil–Sen slope of +${sc.senSlope2015_2024MwYr} MW/yr (95% CI +${sc.ci95_2015_2024[0]} to +${sc.ci95_2015_2024[1]}; p = ${sc.pValue2015_2024}) and 2019–2024 CAGR of ${sc.cagr2019_2024Pct}%.`,
      );
    }
  }

  if (ctx.relationships) {
    const r1 = ctx.relationships.r1Validation;
    const r2 = ctx.relationships.r2WarmDry;
    const r3 = ctx.relationships.r3HeatDrought;
    if (language === "es") {
      parts.push(
        `En los mapas de relaciones (relationship-maps.json): R1 (validación MERRA-2 vs ${r1.nStations} estaciones NOAA) muestra acuerdo de signo en ${r1.signAgreement}/${r1.nStations} estaciones y correlación mediana r = ${r1.pearsonRMedian}; R2 (años cálidos × secos, EXPLORATORY) tiene rho mediano = ${r2.rhoMedian} en ${r2.nTested} celdas pero ${r2.nRobustFdr} superan FDR q < 0,05 (q mín = ${r2.qMin}); R3 (días > 35 °C × racha seca, EXPLORATORY) tiene rho mediano = +${r3.rhoMedian} en ${r3.nTested} estaciones (${r3.nRobustFdr} superan FDR).`,
      );
    } else {
      parts.push(
        `In the relationship maps (relationship-maps.json): R1 (MERRA-2 vs ${r1.nStations} NOAA stations validation) shows sign agreement in ${r1.signAgreement}/${r1.nStations} stations and median Pearson r = ${r1.pearsonRMedian}; R2 (warm × dry years, EXPLORATORY) has median Spearman rho = ${r2.rhoMedian} across ${r2.nTested} cells with ${r2.nRobustFdr} passing FDR q < 0.05 (min q = ${r2.qMin}); R3 (hot days > 35 °C × dry spell, EXPLORATORY) has median rho = +${r3.rhoMedian} across ${r3.nTested} stations (${r3.nRobustFdr} passing FDR).`,
      );
    }
  }

  if (ctx.dust) {
    const d = ctx.dust;
    if (language === "es") {
      parts.push(
        `En la serie de polvo sahariano NASA Giovanni (${d.dataset}, DUEXTTAU en celda ${d.cellId}, ${d.period}, EXPLORATORY): el espesor óptico medio es ${d.meanAot2000_2025}, con máximo anual en ${d.peakYear} (${d.peakAot}) y mínimo en ${d.minYear} (${d.minAot}).`,
      );
    } else {
      parts.push(
        `In the NASA Giovanni Saharan dust series (${d.dataset}, DUEXTTAU in cell ${d.cellId}, ${d.period}, EXPLORATORY): mean aerosol optical thickness is ${d.meanAot2000_2025}, peaking in ${d.peakYear} (${d.peakAot}) with a minimum in ${d.minYear} (${d.minAot}).`,
      );
    }
  }

  if (
    parts.length === 0 &&
    ctx.scopeDigest &&
    (/\b(visualizaci\w*|viendo|datos|serie\w*|ano|year|200\d|201\d|202[0-5]|noches tropicales|tropical nights|dias calurosos|hot days|racha seca|dry spell|evapotranspir\w*|humedad del suelo|soil moisture|nieve|snow|swe|verano|summer)\b/.test(f))
  ) {
    const sd = ctx.scopeDigest;
    const t = sd.metrics.temperature;
    const st = sd.metrics.summer_temp_c;
    const hd = sd.metrics.hot_days_35;
    const tn = sd.metrics.tropical_nights;
    const ds = sd.metrics.max_dry_spell;
    if (language === "es") {
      parts.push(
        `Datos precalculados de visualización en ${sd.name}:${t ? ` temperatura anual MERRA-2 ${signed(t.slopePerDecade)} °C/década${t.series ? ` (${t.series.firstYear}: ${t.series.firstValue} °C → ${t.series.lastYear}: ${t.series.lastValue} °C; máx ${t.series.maxYear}: ${t.series.maxValue} °C${t.series.queriedYear !== undefined ? `, en ${t.series.queriedYear}: ${t.series.queriedValue} °C` : ""})` : ""}` : ""}${st ? `; verano (JJA, EXPLORATORY) ${signed(st.slopePerDecade)} °C/década` : ""}${hd ? `; días > 35 °C (NOAA) ${signed(hd.slopePerDecade)} días/década` : ""}${tn ? `; noches tropicales (NOAA) ${signed(tn.slopePerDecade)} noches/década` : ""}${ds ? `; racha seca máxima ${signed(ds.slopePerDecade)} días/década` : ""}.`,
      );
    } else {
      parts.push(
        `Precomputed visualization data in ${sd.name}:${t ? ` annual MERRA-2 temperature ${signed(t.slopePerDecade)} °C/decade${t.series ? ` (${t.series.firstYear}: ${t.series.firstValue} °C → ${t.series.lastYear}: ${t.series.lastValue} °C; max ${t.series.maxYear}: ${t.series.maxValue} °C${t.series.queriedYear !== undefined ? `, in ${t.series.queriedYear}: ${t.series.queriedValue} °C` : ""})` : ""}` : ""}${st ? `; summer (JJA, EXPLORATORY) ${signed(st.slopePerDecade)} °C/decade` : ""}${hd ? `; hot days > 35 °C (NOAA) ${signed(hd.slopePerDecade)} days/decade` : ""}${tn ? `; tropical nights (NOAA) ${signed(tn.slopePerDecade)} nights/decade` : ""}${ds ? `; max dry spell ${signed(ds.slopePerDecade)} days/decade` : ""}.`,
      );
    }
  }

  return parts.join(" ");
}

function explainBriefing(question: string, language: AgentLanguage, session?: AgentSession): AgentAnswer {
  const claims = selectClaims(question);
  const limitations = claims.flatMap((c) => [...c.limitations]);
  const vizExtra = formatSupplementalVizText(question, language, session?.regionScope, session?.viewContext);
  if (claims.length === 0) {
    if (vizExtra) {
      const responseText = canned(
        language,
        `I'm TARO, AETHRA's research companion. ${vizExtra} Precomputed visualization data — not a new calculation in this session.`,
        `Soy TARO, el compañero de investigación de AETHRA. ${vizExtra} Datos precalculados de las visualizaciones — no un cálculo nuevo en esta sesión.`,
      );
      return {
        ...base(question, "explain_mechanism", language, "DESCRIPTIVE", responseText),
        limitations: ["Precomputed pipeline visualization data; not a newly computed statistic."],
      };
    }
    return {
      ...base(
        question,
        "explain_mechanism",
        language,
        "DESCRIPTIVE",
        canned(
          language,
          "I'm TARO. That concept is in domain, but I do not have a curated knowledge claim for it. I will not invent a definition or a number. Ask about a published EvidenceCard, NASA POWER resource vs generation, or a listed mechanism (PV temperature, GHI vs POA, Theil–Sen, confidence intervals).",
          "Soy TARO. El tema está en dominio, pero no tengo una claim curada para eso. No invento una definición ni un número. Pregunta por una EvidenceCard publicada, recurso NASA POWER frente a generación, o un mecanismo listado (temperatura FV, GHI vs POA, Theil–Sen, intervalos de confianza).",
        ),
      ),
      limitations: ["No curriculum claim matched; not a new measurement."],
    };
  }
  const body = claims.map((c) => (language === "es" ? c.textEs : c.text)).join(" ");
  // The identity claim already introduces TARO; don't introduce it twice.
  const introducesItself = /^(I am TARO|I'm TARO|Soy TARO)\b/.test(body);
  const responseText = canned(
    language,
    `${introducesItself ? "" : "I'm TARO, AETHRA's research companion. "}${body}${vizExtra ? ` ${vizExtra}` : ""} Documented knowledge — not a new AETHRA measurement.`,
    `${introducesItself ? "" : "Soy TARO, el compañero de investigación de AETHRA. "}${body}${vizExtra ? ` ${vizExtra}` : ""} Conocimiento documentado — no una medición nueva de AETHRA.`,
  );
  return {
    ...base(question, "explain_mechanism", language, "DESCRIPTIVE", responseText),
    limitations: [...limitations, "Not a scientific finding computed in this session."],
  };
}

function mixedWarmingPvBriefing(question: string, language: AgentLanguage, catalog: EvidenceCatalog): AgentAnswer {
  const card = cardFor(catalog, "temperature", "age");
  const mechanism = claimById("claim-warming-not-pv-generation");
  if (!card) {
    return base(question, "mixed_warming_pv", language, "NOT_AVAILABLE", "Temperature EvidenceCard is missing.");
  }
  const extra = selectClaims(question)
    .filter((c) => c.id !== "claim-warming-not-pv-generation")
    .map((c) => (language === "es" ? c.textEs : c.text))
    .join(" ");
  const responseText = canned(
    language,
    `${interpretCard(card, language)} ${mechanism?.text ?? ""} ${extra}`,
    `${interpretCard(card, language)} ${mechanism?.textEs ?? ""} ${extra}`,
  );
  return {
    ...withCard(base(question, "mixed_warming_pv", language, "DESCRIPTIVE", responseText), card, "case-r0-joint-low"),
    status: "DESCRIPTIVE",
    limitations: [
      "Historical warming is not photovoltaic generation.",
      ...(mechanism?.limitations ?? []),
      card.do_not_conclude,
    ],
  };
}

function researchCaseBriefing(question: string, language: AgentLanguage, catalog: EvidenceCatalog): AgentAnswer {
  const card = cardFor(catalog, "joint_low", "ccaa:ES41");
  const region = STUDY_REGIONS.find((r) => r.scope === "ccaa:ES41");
  const register = claimById("claim-cyl-register-scope");
  const levels = claimById("claim-complementarity-levels");
  if (!card || !region) {
    return base(question, "research_case", language, "NOT_AVAILABLE", "Castilla y León joint-low card is missing.");
  }
  const responseText = canned(
    language,
    `${interpretCard(card, language)} ${levels?.text ?? ""} ${register?.text ?? ""} This is a research candidate (level 3), not a ranking and not a construction recommendation. Difference versus Aragón was not tested.`,
    `${interpretCard(card, language)} ${levels?.textEs ?? ""} ${register?.textEs ?? ""} Es un candidato de investigación (nivel 3), no un ranking ni una recomendación de obra. La diferencia frente a Aragón no se ha contrastado.`,
  );
  return {
    ...withCard(base(question, "research_case", language, "INSUFFICIENT_EVIDENCE", responseText), card, region.dest),
    limitations: [
      "Recommendation level 3 (research candidate), not level 5.",
      `Register count ${CYL_INCLUDED_INSTALLATIONS} is metadata from energy-infrastructure.json, not generation.`,
      card.do_not_conclude,
    ],
  };
}

function precipitationBriefing(question: string, language: AgentLanguage, session?: AgentSession): AgentAnswer {
  const pin = matchNamedPlace(question);
  const wantsCustomWindow = /\b(2020|2021|2022|2023|2024|2025)\b/.test(question);
  const coord = pin ? formatLonLat(pin.latitude, pin.longitude) : "";
  const place = pin?.name ?? (language === "es" ? "esa zona" : "that place");
  const scopeDigest = pin ? findRegionalScope(pin.name) : undefined;
  const vizExtra = formatSupplementalVizText(question, language, session?.regionScope, session?.viewContext);
  const rainInfo = scopeDigest?.precipitation
    ? language === "es"
      ? ` En el bundle completo 2000–2024 (GPM IMERG, EXPLORATORY sin ajuste BH), la pendiente en ${scopeDigest.name} es ${signed(scopeDigest.precipitation.slopePerDecade)} mm/década (IC 95% ${signed(scopeDigest.precipitation.ci95[0])} a ${signed(scopeDigest.precipitation.ci95[1])}; p = ${scopeDigest.precipitation.pValue}).`
      : ` Over the full 2000–2024 bundle (GPM IMERG, EXPLORATORY without BH adjustment), the slope in ${scopeDigest.name} is ${signed(scopeDigest.precipitation.slopePerDecade)} mm/decade (95% CI ${signed(scopeDigest.precipitation.ci95[0])} to ${signed(scopeDigest.precipitation.ci95[1])}; p = ${scopeDigest.precipitation.pValue}).`
    : "";
  const responseText = canned(
    language,
    `I do not have a published precipitation EvidenceCard for ${place}${wantsCustomWindow ? " over 2020–2025" : ""}, so I cannot draw hydraulic-basin conclusions from a custom window.${rainInfo}${vizExtra ? ` ${vizExtra}` : ""} On the globe, Rain shows NASA GPM IMERG rainfall and Rivers shows basin boxes of that rainfall — not river discharge. ${pin ? `Here is ${pin.name} (${coord}).` : "Open Rain or Rivers to look around."}`,
    `No tengo una EvidenceCard de precipitación publicada para ${place}${wantsCustomWindow ? " en 2020–2025" : ""}, así que no puedo sacar conclusiones de cuencas a partir de una ventana a medida.${rainInfo}${vizExtra ? ` ${vizExtra}` : ""} En el globo, Rain muestra la lluvia NASA GPM IMERG y Rivers las cajas de cuenca de esa lluvia — no el caudal del río. ${pin ? `Aquí tienes ${pin.name} (${coord}).` : "Abre Rain o Rivers para mirar."}`,
  );
  const fly = pin
    ? {
        type: "FLY_TO_REGION" as const,
        targetId: placePinId(pin.name),
        label: language === "es" ? `Mira ${pin.name}` : `Check ${pin.name}`,
        latitude: pin.latitude,
        longitude: pin.longitude,
      }
    : undefined;
  return {
    ...base(question, "precipitation_trend", language, "NOT_AVAILABLE", responseText),
    scope: pin ? { regionName: pin.name } : {},
    limitations: [
      "No precipitation EvidenceCard is published; provincial GPM series are on the Trend panel, not invented here.",
      "GLDAS runoff is modelled, not river discharge.",
      "A custom 2020–2025 window is not a pipeline product.",
    ],
    suggestedActions: fly ? [fly] : [],
  };
}

function findingFrom(card: EvidenceCard): AgentAnswer["findings"][number] {
  return {
    claim: `${card.outcome_label}: ${signed(card.how_much.slope_per_decade)} ${card.how_much.units} (95% CI ${signed(card.how_much.ci95_per_decade[0])} to ${signed(card.how_much.ci95_per_decade[1])})`,
    variable: card.what,
    units: card.how_much.units,
    period: card.when,
    evidenceId: card.id,
    provenanceId: card.provenance.bundle_sha256,
  };
}

function withCard(answer: AgentAnswer, card: EvidenceCard, dest: string): AgentAnswer {
  const status: AgentStatus =
    card.outcome === "supported_increase" || card.outcome === "supported_decrease"
      ? "SUPPORTED"
      : card.outcome === "insufficient_evidence"
        ? "INSUFFICIENT_EVIDENCE"
        : "DESCRIPTIVE";
  return {
    ...answer,
    status,
    scope: { regionId: card.region.scope, regionName: card.region.name, spatialSupport: card.where },
    findings: [findingFrom(card)],
    limitations: [...card.limitations, card.do_not_conclude],
    suggestedActions: actionsFor(card, dest),
  };
}

function trendSentence(card: EvidenceCard, language: AgentLanguage): string {
  const slope = `${signed(card.how_much.slope_per_decade)} ${unitsText(card, language)}`;
  const ci = ciRangeText(card, language);
  if (language === "es") {
    const label = outcomeLabelText(card, language);
    const region = card.region.name === "Peninsula + Balearics" ? "Península y Baleares" : card.region.name;
    return `He ido a la ficha. Mira: ${region}, ${label}. ${slope} (IC del 95 % ${ci}; n = ${card.evidence.n_years}; p = ${card.evidence.p}). ${interpretOutcome(card, language)} Te dejo la evidencia aquí. Fuente: ${card.provenance.bundle}.`;
  }
  return `I pulled the card. Look: ${card.region.name}, ${card.outcome_label}. ${slope} (95% CI ${ci}; n = ${card.evidence.n_years}; p = ${card.evidence.p}). ${interpretOutcome(card, language)} I am leaving the evidence here. Source: ${card.provenance.bundle}.`;
}

export function answerQuestion(request: AskRequest, catalog: EvidenceCatalog): AgentAnswer {
  const detected = detectLanguage(request.question);
  const f = fold(request.question);
  const hasExplicitEs = /[¿¡áéíóúñ]/.test(request.question.toLowerCase()) || /\b(hola|que|cual|como|donde|por que|tendencia|españa|espana|segun)\b/.test(f);
  const language: AgentLanguage = hasExplicitEs ? "es" : (request.language ?? detected);
  const intent = classifyIntent(request.question);
  const region = resolveScope(request.question, request.session);
  const unnamed = matchNamelessPlace(request.question);

  if (intent === "prompt_injection" || intent === "out_of_domain" || intent === "invent_source") {
    return base(
      request.question,
      intent === "invent_source" ? "invent_source" : intent === "prompt_injection" ? "prompt_injection" : "out_of_domain",
      language,
      "OUT_OF_DOMAIN",
      canned(
        language,
        "I'm TARO, AETHRA's Earth-intelligence research companion. I can help with Earth-system trends, NASA evidence, Spanish geography and clean-energy resource conditions. That question is outside my supported research domain.",
        "Soy TARO, el compañero de investigación de AETHRA. Puedo ayudar con tendencias del sistema Tierra, evidencia NASA, geografía de España y condiciones de recurso de energía limpia. Esa pregunta está fuera de mi dominio de investigación.",
      ),
    );
  }

  if (intent === "investment_advice") {
    return {
      ...base(
        request.question,
        intent,
        language,
        "OUT_OF_DOMAIN",
        canned(
          language,
          "I do not provide investment, siting or construction advice. I can only report validated NASA evidence and registered metadata.",
          "No ofrezco consejo de inversión, localización o construcción. Solo puedo informar evidencia NASA validada y metadatos registrados.",
        ),
      ),
      limitations: ["Not a recommendation engine."],
    };
  }

  if (intent === "unsupported_forecast") {
    return {
      ...base(
        request.question,
        intent,
        language,
        "NOT_AVAILABLE",
        canned(
          language,
          "No validated generation forecast or climate projection is available. A historical Theil–Sen confidence interval is not a 2038 prediction interval. Building one would need a validated scenario artifact, a plant model, and operational constraints — none of which are in AETHRA yet. I can provide historical NASA evidence for supported Spanish study regions.",
          "No hay un pronóstico de generación ni una proyección climática validada. Un intervalo de confianza de Theil–Sen histórico no es un intervalo de predicción para 2038. Haría falta un artefacto de escenario validado, un modelo de planta y restricciones de operación, que AETHRA aún no tiene. Puedo aportar evidencia NASA histórica para las regiones de estudio disponibles.",
        ),
      ),
      limitations: ["A historical trend confidence interval is not a forecast interval."],
    };
  }

  if (intent === "explain_mechanism") {
    return explainBriefing(request.question, language, request.session);
  }
  if (intent === "mixed_warming_pv") {
    return mixedWarmingPvBriefing(request.question, language, catalog);
  }
  if (intent === "research_case") {
    return researchCaseBriefing(request.question, language, catalog);
  }

  if (intent === "infrastructure_metadata") {
    const infraExtra = formatSupplementalVizText(request.question, language, request.session.regionScope, request.session.viewContext);
    const infraCtx = buildVisualizationContext({
      question: request.question,
      regionScope: request.session.regionScope,
      viewContext: request.session.viewContext,
    }).infrastructure;
    const matchedTextEs =
      infraCtx && infraCtx.matchedInstallations.length > 0
        ? ` En el registro PRETOR de Castilla y León (${infraCtx.totalInstallations} plantas: ${infraCtx.solarPvCount} solares FV y ${infraCtx.windOnshoreCount} eólicas) figura: ${infraCtx.matchedInstallations.map((i) => `${i.name} (${i.capacityMw} MW, ${i.technology}, ${i.municipality}, ${i.provinceName})`).join("; ")}.`
        : "";
    const matchedTextEn =
      infraCtx && infraCtx.matchedInstallations.length > 0
        ? ` In the Castilla y León PRETOR register (${infraCtx.totalInstallations} plants: ${infraCtx.solarPvCount} solar PV and ${infraCtx.windOnshoreCount} wind) matched: ${infraCtx.matchedInstallations.map((i) => `${i.name} (${i.capacityMw} MW, ${i.technology}, ${i.municipality}, ${i.provinceName})`).join("; ")}.`
        : "";
    return {
      ...base(
        request.question,
        intent,
        language,
        "NOT_AVAILABLE",
        canned(
          language,
          `No validated generation time series is available for that installation. Registered CyL plant metadata is an exploratory overlay, not on the judge path.${matchedTextEn}${infraExtra ? ` ${infraExtra}` : ""} I can quote regional NASA evidence instead.`,
          `No hay una serie de generación validada para esa instalación. Los metadatos de plantas de CyL son una capa exploratoria, no el camino del jurado.${matchedTextEs}${infraExtra ? ` ${infraExtra}` : ""} Puedo citar evidencia NASA regional.`,
        ),
      ),
      limitations: ["Registered capacity (MW) is not actual generation (MWh).", "Plant coordinates are not NASA grid-cell measurements."],
    };
  }

  const namedPlace = matchNamedPlace(request.question);
  if (namedPlace && !matchScope(request.question) && intent !== "precipitation_trend") {
    return placeBriefing(request.question, language, intent, namedPlace);
  }

  if (unnamed && !region && intent !== "joint_low_trend") {
    return {
      ...base(
        request.question,
        intent,
        language,
        "NOT_AVAILABLE",
        canned(
          language,
          `No EvidenceCard exists for ${unnamed}. I will not substitute the national Peninsula + Balearics result. Temperature evidence is currently published for that national extent; joint-low cards exist for five pre-registered regions.`,
          `No hay EvidenceCard para ${unnamed}. No sustituyo el resultado nacional de Península + Baleares. La evidencia de temperatura está publicada para ese ámbito nacional; las tarjetas de mínimos conjuntos cubren cinco regiones pre-registradas.`,
        ),
      ),
      scope: { regionName: unnamed },
      limitations: ["Geographic scope must match the card exactly (D50)."],
    };
  }

  const scope = region ?? STUDY_REGIONS[0];
  const mentioned = Boolean(matchScope(request.question) || request.session.regionScope);

  if (intent === "compare_joint_low") {
    const a = cardFor(catalog, "joint_low", "ccaa:ES41");
    const b = cardFor(catalog, "joint_low", "ccaa:ES24");
    if (!a || !b) {
      return base(request.question, intent, language, "NOT_AVAILABLE", "Comparison cards are missing from the catalog.");
    }
    return {
      ...base(
        request.question,
        intent,
        language,
        "INSUFFICIENT_EVIDENCE",
        canned(
          language,
          `Castilla y León and Aragón both have insufficient evidence of a joint-low-day trend. Difference between regions was not tested. ${trendSentence(a, language)} ${trendSentence(b, language)}`,
          `Castilla y León y Aragón tienen ambos evidencia insuficiente de tendencia en días de recurso conjunto bajo. La diferencia entre regiones no se ha contrastado. ${trendSentence(a, language)} ${trendSentence(b, language)}`,
        ),
      ),
      scope: { regionName: "Castilla y León vs Aragón" },
      findings: [findingFrom(a), findingFrom(b)],
      limitations: ["Difference not tested.", a.do_not_conclude, b.do_not_conclude],
      suggestedActions: [
        { type: "OPEN_EVIDENCE_CARD", targetId: a.id },
        { type: "OPEN_EVIDENCE_CARD", targetId: b.id },
      ],
    };
  }

  if (intent === "research_gap") {
    return {
      ...base(
        request.question,
        intent,
        language,
        "DESCRIPTIVE",
        canned(
          language,
          `${scope.name} has regional NASA POWER evidence, not parcel-scale data. Further study would need finer irradiance and wind fields, plant-level generation, and grid/operational constraints. That does not identify sites to build.`,
          `${scope.name} tiene evidencia NASA POWER regional, no a escala de parcela. Harían falta campos más finos de irradiancia y viento, generación a escala de planta y restricciones de red. Eso no identifica dónde construir.`,
        ),
      ),
      scope: { regionId: scope.scope, regionName: scope.name },
      limitations: ["Research candidate, not a suitability rank."],
      suggestedActions: [{ type: "FLY_TO_REGION", targetId: scope.dest }],
    };
  }

  if (intent === "precipitation_trend") {
    return precipitationBriefing(request.question, language, request.session);
  }

  if (intent === "joint_low_trend") {
    const focus =
      region && region.scope !== "age"
        ? region
        : (WIND_FRAMED_GUIDE ?? STUDY_REGIONS[0]);
    return jointLowBriefing(request.question, language, catalog, focus, unnamed);
  }

  const topic = intent === "temperature_trend" ? "temperature" : "joint_low";
  const wantedScope = intent === "temperature_trend" ? (mentioned && scope.scope !== "age" ? scope.scope : "age") : scope.scope;
  const card = cardFor(catalog, topic, wantedScope);

  if (intent === "temperature_trend" && /\bprovin/.test(fold(request.question)) && wantedScope === "age") {
    return {
      ...base(
        request.question,
        intent,
        language,
        "NOT_AVAILABLE",
        canned(
          language,
          "No temperature EvidenceCard is published at province support. I will not invent a provincial slope or substitute the national Peninsula + Balearics card.",
          "No hay EvidenceCard de temperatura a escala provincial. No invento una pendiente provincial ni sustituyo la tarjeta nacional de Península + Baleares.",
        ),
      ),
      limitations: ["Scope-exact cards only (D50)."],
    };
  }

  if (intent === "temperature_trend" && wantedScope !== "age") {
    const scopeDigest = findRegionalScope(scope.scope);
    const tempInfo = scopeDigest?.temperature
      ? language === "es"
        ? ` En el bundle precalculado (${scopeDigest.name}, MERRA-2 2000–2025) la tendencia regional es ${signed(scopeDigest.temperature.slopePerDecade)} °C/década (IC 95% ${signed(scopeDigest.temperature.ci95[0])} a ${signed(scopeDigest.temperature.ci95[1])}; p = ${scopeDigest.temperature.pValue}; n = ${scopeDigest.temperature.n}).`
        : ` In the precomputed bundle (${scopeDigest.name}, MERRA-2 2000–2025) the regional trend is ${signed(scopeDigest.temperature.slopePerDecade)} °C/decade (95% CI ${signed(scopeDigest.temperature.ci95[0])} to ${signed(scopeDigest.temperature.ci95[1])}; p = ${scopeDigest.temperature.pValue}; n = ${scopeDigest.temperature.n}).`
      : "";
    return {
      ...base(
        request.question,
        intent,
        language,
        "NOT_AVAILABLE",
        canned(
          language,
          `No temperature EvidenceCard is published for ${scope.name}. I will not silently use the national result.${tempInfo} A Peninsula + Balearics card exists if you ask for that extent.`,
          `No hay EvidenceCard de temperatura para ${scope.name}. No uso en silencio el resultado nacional.${tempInfo} Existe una tarjeta de Península + Baleares si preguntas por ese ámbito.`,
        ),
      ),
      scope: { regionId: scope.scope, regionName: scope.name },
      limitations: ["Scope-exact cards only (D50)."],
    };
  }

  if (!card) {
    return {
      ...base(
        request.question,
        intent,
        language,
        "NOT_AVAILABLE",
        canned(
          language,
          `No validated EvidenceCard for that topic and region (${scope.name}).`,
          `No hay EvidenceCard validada para ese tema y región (${scope.name}).`,
        ),
      ),
      scope: { regionId: scope.scope, regionName: scope.name },
    };
  }

  const ranked = asksToRankSites(request.question);
  const body = trendSentence(card, language);
  const responseText = ranked
    ? canned(
        language,
        `I cannot rank sites or advise where to build. I can report NASA POWER resource conditions for pre-registered study regions. ${body}`,
        `No puedo ordenar emplazamientos ni aconsejar dónde construir. Sí puedo informar condiciones de recurso NASA POWER en las regiones de estudio pre-registradas. ${body}`,
      )
    : body;
  const answered = withCard(base(request.question, intent, language, "SUPPORTED", responseText), card, scope.dest);
  if (!ranked) return answered;
  return {
    ...answered,
    limitations: ["Not a site ranking or investment recommendation.", ...answered.limitations],
  };
}
