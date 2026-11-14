import type * as CesiumNS from "cesium";
import type { GlobeController, OrbitView } from "../types";

type Cesium = typeof CesiumNS;

const MIN_PITCH = -89.5; // degrees (looking straight down)
const MAX_PITCH = -8; // degrees (near-horizon)
const TILT_STEP = 15;
const ROTATE_STEP = 30;
const STEP_DURATION = 0.7;

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
export function createCameraController(Cesium: Cesium, viewer: CesiumNS.Viewer): GlobeController {
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
      duration: STEP_DURATION,
    });
  };

  const deg = Cesium.Math.toDegrees;

  return {
    flyTo(view) {
      camera.cancelFlight();
      const target = Cesium.Cartesian3.fromDegrees(view.target.longitude, view.target.latitude);
      camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(view.heading),
          Cesium.Math.toRadians(view.pitch),
          view.range,
        ),
        duration: view.durationSeconds ?? 2.5,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    },
    zoom(direction) {
      orbit(deg(camera.heading), deg(camera.pitch), direction > 0 ? 0.5 : 2);
    },
    tilt(direction) {
      orbit(deg(camera.heading), deg(camera.pitch) + direction * TILT_STEP);
    },
    rotate(direction) {
      orbit(deg(camera.heading) + direction * ROTATE_STEP, deg(camera.pitch));
    },
    resetNorth() {
      orbit(0, deg(camera.pitch));
    },
  };
}
