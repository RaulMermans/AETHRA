import type * as CesiumNS from "cesium";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
    Cesium?: typeof CesiumNS;
  }
}

const BASE_URL = "/cesium/";
let pending: Promise<typeof CesiumNS> | null = null;

/**
 * Loads the prebuilt CesiumJS bundle from /cesium/Cesium.js (copied by
 * scripts/copy-cesium-assets.mjs) once per page. Browser-only.
 */
export function loadCesium(): Promise<typeof CesiumNS> {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  pending ??= new Promise((resolve, reject) => {
    window.CESIUM_BASE_URL = BASE_URL;
    const script = document.createElement("script");
    script.src = `${BASE_URL}Cesium.js?v=${process.env.NEXT_PUBLIC_CESIUM_VERSION ?? ""}`;
    script.async = true;
    script.onload = () =>
      window.Cesium ? resolve(window.Cesium) : reject(new Error("CesiumJS loaded but did not initialise."));
    script.onerror = () => {
      pending = null;
      script.remove();
      reject(new Error("Could not load the CesiumJS library (/cesium/Cesium.js)."));
    };
    document.head.appendChild(script);
  });
  return pending;
}
