import type * as CesiumNS from "cesium";

type Cesium = typeof CesiumNS;

interface SpaceAmbianceOptions {
  reduceMotion: boolean;
}

interface OrbitSpec {
  inclination: number;
  raan: number;
  periodMs: number;
  altitudeM: number;
  phase: number;
  trail: CesiumNS.Cartesian3[];
  isStation: boolean;
}

const EARTH_RADIUS_M = 6_378_137;
const TRAIL_POINTS = 18;
const FRAME_MS = 50;
const SATELLITES: Omit<OrbitSpec, "trail">[] = [
  { inclination: 0.9, raan: 0.35, periodMs: 110_000, altitudeM: 420_000, phase: 0.2, isStation: true },
  { inclination: 0.85, raan: -0.4, periodMs: 95_000, altitudeM: 550_000, phase: 1.8, isStation: false },
  { inclination: 1.05, raan: 1.1, periodMs: 130_000, altitudeM: 780_000, phase: 3.4, isStation: false },
  { inclination: 0.7, raan: -1.2, periodMs: 150_000, altitudeM: 1_100_000, phase: 4.9, isStation: false },
];

function orbitPosition(Cesium: Cesium, spec: OrbitSpec, now: number): CesiumNS.Cartesian3 {
  const theta = spec.phase + (now / spec.periodMs) * Math.PI * 2;
  const r = EARTH_RADIUS_M + spec.altitudeM;
  const x = r * Math.cos(theta);
  const yEq = r * Math.sin(theta);
  const y = yEq * Math.cos(spec.inclination);
  const z = yEq * Math.sin(spec.inclination);
  const c = Math.cos(spec.raan);
  const s = Math.sin(spec.raan);
  return new Cesium.Cartesian3(c * x - s * y, s * x + c * y, z);
}

function addOrbiter(Cesium: Cesium, source: CesiumNS.CustomDataSource, spec: OrbitSpec, id: string) {
  const color = spec.isStation
    ? Cesium.Color.fromCssColorString("#e8eef4")
    : Cesium.Color.fromCssColorString("#c5d6e4");
  return source.entities.add({
    id,
    name: spec.isStation ? "Decorative station" : "Decorative satellite",
    position: new Cesium.CallbackPositionProperty((_time, result) => {
      const pos = spec.trail[spec.trail.length - 1];
      return pos ? Cesium.Cartesian3.clone(pos, result) : undefined;
    }, false),
    point: {
      pixelSize: spec.isStation ? 5 : 3.2,
      color,
      outlineColor: color.withAlpha(0.35),
      outlineWidth: 1,
      scaleByDistance: new Cesium.NearFarScalar(6.0e5, 1.1, 1.8e7, 0.35),
    },
    polyline: {
      positions: new Cesium.CallbackProperty(() => spec.trail, false),
      width: spec.isStation ? 1.6 : 1.15,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.12,
        color: color.withAlpha(spec.isStation ? 0.45 : 0.28),
      }),
    },
  });
}

function lerpCartesian(
  Cesium: Cesium,
  a: CesiumNS.Cartesian3,
  b: CesiumNS.Cartesian3,
  t: number,
): CesiumNS.Cartesian3 {
  const u = Math.min(1, Math.max(0, t));
  return new Cesium.Cartesian3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
}

function spawnMeteor(Cesium: Cesium, source: CesiumNS.CustomDataSource, now: number) {
  const lon = -55 + Math.random() * 90;
  const lat = 8 + Math.random() * 55;
  const start = Cesium.Cartesian3.fromDegrees(lon, lat, 160_000 + Math.random() * 80_000);
  const end = Cesium.Cartesian3.fromDegrees(lon + 6 + Math.random() * 8, lat - 2 - Math.random() * 5, 90_000);
  const entity = source.entities.add({
    name: "Decorative meteor",
    polyline: {
      positions: [start, start],
      width: 1.4,
      material: Cesium.Color.fromCssColorString("#f4efe6").withAlpha(0.55),
    },
  });
  return { entity, start, end, born: now, durationMs: 900 };
}

/**
 * Sparse LEO traffic in true 3D (goes behind Earth). Real Cesium moon.
 * Not a data layer; not screen-space stickers.
 */
export function attachSpaceAmbiance(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  options: SpaceAmbianceOptions,
): () => void {
  const { scene } = viewer;
  if (scene.moon) scene.moon.show = true;
  if (options.reduceMotion) return () => undefined;

  const source = new Cesium.CustomDataSource("space-ambiance");
  void viewer.dataSources.add(source);
  const t0 = performance.now();
  const specs: OrbitSpec[] = SATELLITES.map((row) => ({ ...row, trail: [] }));
  for (const spec of specs) {
    for (let s = TRAIL_POINTS; s >= 0; s -= 1) spec.trail.push(orbitPosition(Cesium, spec, t0 - s * 400));
  }
  specs.forEach((spec, i) => addOrbiter(Cesium, source, spec, `orbit-${i}`));

  const streaks: ReturnType<typeof spawnMeteor>[] = [];
  let nextMeteorAt = t0 + 14_000;
  let raf = 0;
  let lastDraw = 0;
  let stopped = false;

  const tick = (now: number) => {
    if (stopped || viewer.isDestroyed()) return;
    raf = requestAnimationFrame(tick);
    const in3d = scene.mode === Cesium.SceneMode.SCENE3D;
    source.show = in3d;
    if (!in3d || document.hidden) return;
    if (now - lastDraw < FRAME_MS && streaks.length === 0) return;
    lastDraw = now;
    for (const spec of specs) {
      spec.trail.push(orbitPosition(Cesium, spec, now));
      if (spec.trail.length > TRAIL_POINTS) spec.trail.shift();
    }
    if (now >= nextMeteorAt) {
      streaks.push(spawnMeteor(Cesium, source, now));
      nextMeteorAt = now + 16_000 + Math.random() * 22_000;
    }
    for (let i = streaks.length - 1; i >= 0; i -= 1) {
      const streak = streaks[i];
      if (!streak) continue;
      const u = (now - streak.born) / streak.durationMs;
      if (u >= 1) {
        source.entities.remove(streak.entity);
        streaks.splice(i, 1);
        continue;
      }
      const head = lerpCartesian(Cesium, streak.start, streak.end, u);
      const tail = lerpCartesian(Cesium, streak.start, streak.end, Math.max(0, u - 0.35));
      if (streak.entity.polyline) streak.entity.polyline.positions = new Cesium.ConstantProperty([tail, head]);
    }
    scene.requestRender();
  };
  raf = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    if (!viewer.isDestroyed()) viewer.dataSources.remove(source, true);
  };
}
