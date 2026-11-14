/**
 * Curated geographic destinations for Cesium fly-to (D54).
 * Navigation and research-case framing only — not site recommendations.
 */

import { HOME_VIEW, SPAIN_VIEW } from "./catalog";
import type { GeoBounds, OrbitView } from "./types";

export const DESTINATION_TYPES = [
  "natural_landmark",
  "geographic_research_area",
  "existing_energy_installation",
  "scientific_case_study_region",
] as const;

export type DestinationType = (typeof DESTINATION_TYPES)[number];

export interface DestinationSource {
  name: string;
  url?: string;
  retrieved: string;
  note: string;
}

export interface GeographicDestination {
  id: string;
  name: string;
  hint: string;
  type: DestinationType;
  latitude: number;
  longitude: number;
  extent?: GeoBounds;
  view: OrbitView;
  source: DestinationSource;
  caseStudyId?: string;
  installationId?: string;
  /** National park or other protected landscape: navigation only. */
  protectedLandscape: boolean;
}

const IGN_MULHACEN: DestinationSource = {
  name: "IGN vértice geodésico Mulhacén I (102763)",
  url: "https://datos-geodesia.ign.es/Red_Geodesica/Hoja1027/102763.pdf",
  retrieved: "2026-11-14",
  note: "ETRS89 geographic: 37°03′12.22427″ N, 3°18′41.52587″ W. Orthometric height 3478.692 m (BP). Navigation, not analysis.",
};

/** IGN Mulhacén I converted to decimal degrees (ETRS89 geographic ≈ WGS84 for this use). */
export const MULHACEN_LAT = 37.053396;
export const MULHACEN_LON = -3.311535;

export const DESTINATIONS: readonly GeographicDestination[] = [
  {
    id: "spain",
    name: "Spain",
    hint: "Return to overview",
    type: "geographic_research_area",
    latitude: SPAIN_VIEW.target.latitude,
    longitude: SPAIN_VIEW.target.longitude,
    view: SPAIN_VIEW,
    source: {
      name: "AETHRA camera framing (Peninsula + Balearics)",
      retrieved: "2026-11-14",
      note: "Overview orbit, not a scientific extent.",
    },
    protectedLandscape: false,
  },
  {
    id: "mulhacen",
    name: "Mulhacén",
    hint: "Sierra Nevada · park",
    type: "natural_landmark",
    latitude: MULHACEN_LAT,
    longitude: MULHACEN_LON,
    view: {
      target: { latitude: MULHACEN_LAT, longitude: MULHACEN_LON },
      heading: 345,
      pitch: -20,
      range: 42_000,
      durationSeconds: 3.4,
      terrainAware: true,
    },
    source: IGN_MULHACEN,
    protectedLandscape: true,
  },
  {
    id: "picos-de-europa",
    name: "Picos de Europa",
    hint: "Torre Cerredo · park",
    type: "natural_landmark",
    latitude: 43.1975,
    longitude: -4.8525,
    view: {
      target: { latitude: 43.1975, longitude: -4.8525 },
      heading: 0,
      pitch: -22,
      range: 34_000,
      durationSeconds: 3.4,
      terrainAware: true,
    },
    source: {
      name: "Navigation coordinates (Torre Cerredo summit, catalog)",
      retrieved: "2026-11-14",
      note: "≈43.1975° N, 4.8525° W. Not an IGN vertex reseña. Parque Nacional de Picos de Europa.",
    },
    protectedLandscape: true,
  },
  {
    id: "case-r0-joint-low",
    name: "Peninsula + Balearics",
    hint: "National Gate B case",
    type: "scientific_case_study_region",
    latitude: SPAIN_VIEW.target.latitude,
    longitude: SPAIN_VIEW.target.longitude,
    view: { ...SPAIN_VIEW, durationSeconds: 2.6 },
    source: {
      name: "AETHRA camera framing (Peninsula + Balearics)",
      retrieved: "2026-11-14",
      note: "National aggregate. NASA evidence is the POWER regional mean, not this camera point.",
    },
    caseStudyId: "case-r0-joint-low",
    protectedLandscape: false,
  },
  {
    id: "case-es11-joint-low",
    name: "Galicia",
    hint: "Wind-framed research case",
    type: "scientific_case_study_region",
    latitude: 42.75,
    longitude: -8.0,
    extent: { west: -9.3, south: 41.8, east: -6.7, north: 43.8 },
    view: {
      target: { latitude: 42.75, longitude: -8.0 },
      heading: 12,
      pitch: -48,
      range: 280_000,
      durationSeconds: 2.8,
      terrainAware: false,
    },
    source: {
      name: "GISCO NUTS 2021 ES11 (camera centre is approximate)",
      retrieved: "2026-11-14",
      note: "Framing only. NASA evidence is the regional POWER mean, not this point.",
    },
    caseStudyId: "case-es11-joint-low",
    protectedLandscape: false,
  },
  {
    id: "case-es41-joint-low",
    name: "Castilla y León",
    hint: "Hybrid-framed research case",
    type: "scientific_case_study_region",
    latitude: 41.75,
    longitude: -4.5,
    extent: { west: -7.1, south: 40.0, east: -1.7, north: 43.3 },
    view: {
      target: { latitude: 41.75, longitude: -4.5 },
      heading: 8,
      pitch: -48,
      range: 520_000,
      durationSeconds: 2.8,
      terrainAware: false,
    },
    source: {
      name: "GISCO NUTS 2021 ES41 (camera centre is approximate)",
      retrieved: "2026-11-14",
      note: "Framing only. NASA evidence is the regional POWER mean, not this point.",
    },
    caseStudyId: "case-es41-joint-low",
    protectedLandscape: false,
  },
  {
    id: "case-es24-joint-low",
    name: "Aragón",
    hint: "Wind-framed research case",
    type: "scientific_case_study_region",
    latitude: 41.6,
    longitude: -0.9,
    extent: { west: -2.2, south: 39.8, east: 0.8, north: 42.9 },
    view: {
      target: { latitude: 41.6, longitude: -0.9 },
      heading: 10,
      pitch: -48,
      range: 380_000,
      durationSeconds: 2.8,
      terrainAware: false,
    },
    source: {
      name: "GISCO NUTS 2021 ES24 (camera centre is approximate)",
      retrieved: "2026-11-14",
      note: "Framing only. NASA evidence is the regional POWER mean, not this point.",
    },
    caseStudyId: "case-es24-joint-low",
    protectedLandscape: false,
  },
  {
    id: "case-es61-joint-low",
    name: "Andalucía",
    hint: "Solar-framed research case",
    type: "scientific_case_study_region",
    latitude: 37.45,
    longitude: -4.6,
    extent: { west: -7.5, south: 36.0, east: -1.6, north: 38.7 },
    view: {
      target: { latitude: 37.45, longitude: -4.6 },
      heading: 5,
      pitch: -48,
      range: 480_000,
      durationSeconds: 2.8,
      terrainAware: false,
    },
    source: {
      name: "GISCO NUTS 2021 ES61 (camera centre is approximate)",
      retrieved: "2026-11-14",
      note: "Framing only. NASA evidence is the regional POWER mean, not this point. Parks in this CCAA are navigation-only.",
    },
    caseStudyId: "case-es61-joint-low",
    protectedLandscape: false,
  },
  {
    id: "installation-buniel",
    name: "Buniel (registered wind)",
    hint: "Illustrative 3D",
    type: "existing_energy_installation",
    latitude: 42.29663,
    longitude: -3.80515,
    view: {
      target: { latitude: 42.29663, longitude: -3.80515 },
      heading: 40,
      pitch: -32,
      range: 1_600,
      durationSeconds: 2.4,
      terrainAware: true,
    },
    source: {
      name: "Junta de Castilla y León register (PRETOR), installation RE-114777",
      url: "https://idecyl.jcyl.es/geonetwork/srv/api/records/spagobcyltemenerenipepol",
      retrieved: "2026-11-14",
      note: "Point inside official perimeter. 3D model is illustrative, not a reconstruction.",
    },
    installationId: "RE-114777",
    caseStudyId: "case-es41-joint-low",
    protectedLandscape: false,
  },
];

export const HOME_DESTINATION_VIEW: OrbitView = HOME_VIEW;

export function destinationById(id: string): GeographicDestination | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}

export function destinationsOfType(type: DestinationType): readonly GeographicDestination[] {
  return DESTINATIONS.filter((d) => d.type === type);
}

export function destinationTypeLabel(type: DestinationType): string {
  switch (type) {
    case "natural_landmark":
      return "Natural landmark";
    case "geographic_research_area":
      return "Overview";
    case "existing_energy_installation":
      return "Registered installation";
    case "scientific_case_study_region":
      return "Research case";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
