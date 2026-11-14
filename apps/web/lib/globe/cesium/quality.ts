import type * as CesiumNS from "cesium";
import type { QualityProfile } from "../types";

interface ProfileSettings {
  /** Cap on rendered device-pixel ratio (crispness vs. fill-rate). */
  maxPixelRatio: number;
  /** Globe/terrain refinement: lower = sharper tiles, more requests. Cesium default 2. */
  maximumScreenSpaceError: number;
  msaaSamples: number;
  tileCacheSize: number;
}

export const QUALITY_PROFILES: Record<QualityProfile, ProfileSettings> = {
  high: { maxPixelRatio: 2, maximumScreenSpaceError: 1.5, msaaSamples: 4, tileCacheSize: 400 },
  balanced: { maxPixelRatio: 1.5, maximumScreenSpaceError: 2, msaaSamples: 2, tileCacheSize: 200 },
  performance: { maxPixelRatio: 1.5, maximumScreenSpaceError: 3, msaaSamples: 1, tileCacheSize: 100 },
};

const ORDER: QualityProfile[] = ["high", "balanced", "performance"];

/** Picks a starting profile from device capabilities (refined later by measured frame times). */
export function detectQualityProfile(): { profile: QualityProfile; reason: string } {
  let renderer = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    /* capability probing is best-effort */
  }
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) {
    return { profile: "performance", reason: "software renderer" };
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && Math.min(window.screen.width, window.screen.height) < 900) {
    return { profile: "performance", reason: "mobile device" };
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4) {
    return { profile: "balanced", reason: "limited memory/CPU" };
  }
  return { profile: "high", reason: "capable GPU" };
}

export function applyQualityProfile(viewer: CesiumNS.Viewer, profile: QualityProfile) {
  const s = QUALITY_PROFILES[profile];
  const dpr = window.devicePixelRatio || 1;
  const { scene } = viewer;
  viewer.useBrowserRecommendedResolution = false;
  viewer.resolutionScale = Math.min(dpr, s.maxPixelRatio) / dpr;
  scene.globe.maximumScreenSpaceError = s.maximumScreenSpaceError;
  scene.globe.tileCacheSize = s.tileCacheSize;
  if (scene.msaaSupported) scene.msaaSamples = s.msaaSamples;
  // FXAA only where MSAA is off/unsupported, to avoid double-softening imagery.
  scene.postProcessStages.fxaa.enabled = !scene.msaaSupported || s.msaaSamples <= 1;
  scene.requestRender();
}

/**
 * Measures frame times while the camera moves (render-on-demand idles otherwise) and calls
 * `onSlow` when the median frame time stays above ~22 fps. Only ever steps quality down.
 */
export function watchFrameTimes(
  viewer: CesiumNS.Viewer,
  onSlow: (medianMs: number) => void,
): () => void {
  const { scene, camera } = viewer;
  let samples: number[] = [];
  let last = 0;
  let moving = false;
  const onFrame = () => {
    if (!moving) return;
    const now = performance.now();
    if (last) samples.push(now - last);
    last = now;
  };
  const start = () => {
    moving = true;
    last = 0;
    samples = [];
  };
  const end = () => {
    moving = false;
    if (samples.length < 20) return;
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 45) onSlow(median);
  };
  const removers = [
    scene.postRender.addEventListener(onFrame),
    camera.moveStart.addEventListener(start),
    camera.moveEnd.addEventListener(end),
  ];
  return () => removers.forEach((r) => r());
}

export function nextLowerProfile(p: QualityProfile): QualityProfile | null {
  const i = ORDER.indexOf(p);
  return i < ORDER.length - 1 ? ORDER[i + 1] : null;
}
