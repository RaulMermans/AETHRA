import type * as CesiumNS from "cesium";
import type { GlobeController, OrbitView } from "../types";
import { sampleTerrainHeight } from "./providers";

type Cesium = typeof CesiumNS;

const MIN_PITCH = -89.5; // degrees (looking straight down)
const MAX_PITCH = -8; // degrees (near-horizon)
const TILT_STEP = 15;
const ROTATE_STEP = 30;
const STEP_DURATION = 0.7;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Places the camera on an orbit view immediately (no animation). */
export function setOrbitView(Cesium: Cesium, viewer: CesiumNS.Viewer, view: OrbitView) {
  const { camera } = viewer.scene;
  const target = Cesium.Cartesian3.fromDegrees(view.target.longitude, view.target.latitude);
  camera.lookAt(
    target,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(view.heading),
      Cesium.Math.toRadians(view.pitch),
      view.range,
    ),
  );
  camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

/** Camera controls that orbit the point at the centre of the screen. */
export function createCameraController(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
): Pick<GlobeController, "flyTo" | "zoom" | "tilt" | "rotate" | "resetNorth" | "getCamera" | "setCamera"> & {
  /** Ground point at the centre of the screen, if any. */
  centre(): { latitude: number; longitude: number } | null;
} {
  const { scene } = viewer;
  const { camera } = scene;

  const centerTarget = (): CesiumNS.Cartesian3 | undefined => {
    const canvas = scene.canvas;
    const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    const ray = camera.getPickRay(center);
    const hit = ray ? scene.globe.pick(ray, scene) : undefined;
    return hit ?? camera.pickEllipsoid(center, scene.globe.ellipsoid) ?? undefined;
  };

  const orbit = (headingDeg: number, pitchDeg: number, rangeFactor = 1) => {
    const target = centerTarget();
    if (!target) return; // Centre of screen is sky: nothing to orbit around.
    const range = Cesium.Cartesian3.distance(camera.positionWC, target) * rangeFactor;
    camera.cancelFlight();
    camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(headingDeg),
        Cesium.Math.toRadians(Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitchDeg))),
        Math.min(Math.max(range, 150), 40_000_000),
      ),
      duration: reducedMotion() ? 0 : STEP_DURATION,
    });
  };

  // Increments on every flyTo so a slow terrain sample never overrides a newer request.
  let flightId = 0;

  const deg = Cesium.Math.toDegrees;
  // In the flat 2D map there is no tilt or heading rotation; zoom moves the camera height.
  const flat = () => scene.mode === Cesium.SceneMode.SCENE2D;

  return {
    flyTo(view) {
      const id = ++flightId;
      camera.cancelFlight();
      const go = (targetHeight: number) => {
        if (id !== flightId || viewer.isDestroyed()) return;
        const target = Cesium.Cartesian3.fromDegrees(view.target.longitude, view.target.latitude, targetHeight);
        camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(view.heading),
            Cesium.Math.toRadians(view.pitch),
            view.range,
          ),
          duration: reducedMotion() ? 0 : (view.durationSeconds ?? 2.5),
          easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
        });
      };
      if (!view.terrainAware) return go(0);
      // Orbit around the real ground point so oblique mountain views don't clip into slopes.
      // Rendered relief is scaled by the vertical exaggeration.
      void sampleTerrainHeight(Cesium, viewer, view.target.latitude, view.target.longitude, 10).then(
        (h) => go((h ?? 0) * (viewer.scene.verticalExaggeration || 1)),
      );
    },
    zoom(direction) {
      if (flat()) {
        const h = camera.positionCartographic.height;
        if (direction > 0) camera.zoomIn(h / 2);
        else camera.zoomOut(h);
        scene.requestRender();
        return;
      }
      orbit(deg(camera.heading), deg(camera.pitch), direction > 0 ? 0.5 : 2);
    },
    tilt(direction) {
      if (flat()) return;
      orbit(deg(camera.heading), deg(camera.pitch) + direction * TILT_STEP);
    },
    rotate(direction) {
      if (flat()) return;
      orbit(deg(camera.heading) + direction * ROTATE_STEP, deg(camera.pitch));
    },
    resetNorth() {
      if (flat()) return;
      orbit(0, deg(camera.pitch));
    },
    centre() {
      const t = centerTarget();
      if (!t) return null;
      const c = Cesium.Cartographic.fromCartesian(t);
      return c ? { latitude: deg(c.latitude), longitude: deg(c.longitude) } : null;
    },
    getCamera() {
      const c = camera.positionCartographic;
      // In 2D the scale is the orthographic frustum width, not the camera height: convert it to
      // the equivalent height of a top-down 3D view (60° field of view).
      const f = camera.frustum as CesiumNS.OrthographicOffCenterFrustum;
      const width = (f.right ?? NaN) - (f.left ?? NaN);
      const height = flat() && Number.isFinite(width) ? width * 0.87 : c.height;
      return {
        latitude: deg(c.latitude),
        longitude: deg(c.longitude),
        height,
        heading: deg(camera.heading),
        pitch: deg(camera.pitch),
      };
    },
    setCamera(c, durationSeconds = 2) {
      ++flightId;
      camera.cancelFlight();
      camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(c.longitude, c.latitude, c.height),
        orientation: { heading: Cesium.Math.toRadians(c.heading), pitch: Cesium.Math.toRadians(c.pitch), roll: 0 },
        duration: reducedMotion() ? 0 : durationSeconds,
      });
    },
  };
}
