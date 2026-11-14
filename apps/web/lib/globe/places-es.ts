/**
 * Places for the "Go to" search: the 50 provincial capitals, Ceuta, Melilla and the highest
 * peaks. Coordinates are approximate city centres / summits (WGS84, ~0.01° ≈ 1 km), for camera
 * navigation only — not for analysis.
 */
export interface NamedPlace {
  name: string;
  latitude: number;
  longitude: number;
  kind: "city" | "peak";
}

const CITIES: [string, number, number][] = [
  ["A Coruña", 43.37, -8.4], ["Albacete", 38.99, -1.86], ["Alicante", 38.35, -0.48],
  ["Almería", 36.84, -2.46], ["Ávila", 40.66, -4.7], ["Badajoz", 38.88, -6.97],
  ["Barcelona", 41.39, 2.17], ["Bilbao", 43.26, -2.93], ["Burgos", 42.34, -3.7],
  ["Cáceres", 39.47, -6.37], ["Cádiz", 36.53, -6.29], ["Castellón de la Plana", 39.99, -0.05],
  ["Ceuta", 35.89, -5.32], ["Ciudad Real", 38.99, -3.93], ["Córdoba", 37.88, -4.78],
  ["Cuenca", 40.07, -2.13], ["Girona", 41.98, 2.82], ["Granada", 37.18, -3.6],
  ["Guadalajara", 40.63, -3.17], ["Huelva", 37.26, -6.95], ["Huesca", 42.14, -0.41],
  ["Jaén", 37.77, -3.79], ["Las Palmas de Gran Canaria", 28.12, -15.43], ["León", 42.6, -5.57],
  ["Lleida", 41.62, 0.62], ["Logroño", 42.47, -2.45], ["Lugo", 43.01, -7.56],
  ["Madrid", 40.42, -3.7], ["Málaga", 36.72, -4.42], ["Melilla", 35.29, -2.94],
  ["Murcia", 37.99, -1.13], ["Ourense", 42.34, -7.86], ["Oviedo", 43.36, -5.85],
  ["Palencia", 42.01, -4.53], ["Palma", 39.57, 2.65], ["Pamplona", 42.81, -1.64],
  ["Pontevedra", 42.43, -8.64], ["Salamanca", 40.97, -5.66], ["San Sebastián", 43.32, -1.98],
  ["Santa Cruz de Tenerife", 28.46, -16.25], ["Santander", 43.46, -3.8], ["Segovia", 40.95, -4.12],
  ["Sevilla", 37.39, -5.98], ["Soria", 41.76, -2.46], ["Tarragona", 41.12, 1.25],
  ["Teruel", 40.34, -1.11], ["Toledo", 39.86, -4.03], ["Valencia", 39.47, -0.38],
  ["Valladolid", 41.65, -4.72], ["Vitoria-Gasteiz", 42.85, -2.67], ["Zamora", 41.5, -5.75],
  ["Zaragoza", 41.65, -0.89],
];

const PEAKS: [string, number, number][] = [
  ["Teide", 28.272, -16.642], ["Mulhacén", 37.053, -3.311], ["Aneto", 42.631, 0.657],
  ["Veleta", 37.056, -3.366], ["Monte Perdido", 42.675, 0.034], ["Torre Cerredo", 43.198, -4.852],
];

export const NAMED_PLACES: NamedPlace[] = [
  ...CITIES.map(([name, latitude, longitude]) => ({ name, latitude, longitude, kind: "city" as const })),
  ...PEAKS.map(([name, latitude, longitude]) => ({ name, latitude, longitude, kind: "peak" as const })),
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Places whose name contains the query (accent/case-insensitive), prefix matches first. */
export function searchPlaces(query: string, limit = 6): NamedPlace[] {
  const q = fold(query.trim());
  if (!q) return [];
  return NAMED_PLACES.filter((p) => fold(p.name).includes(q))
    .sort((a, b) => Number(!fold(a.name).startsWith(q)) - Number(!fold(b.name).startsWith(q)) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
