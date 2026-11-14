// Copies the prebuilt CesiumJS bundle (Cesium.js) and its runtime assets (Workers, Assets,
// Widgets, ThirdParty) into public/cesium, served at CESIUM_BASE_URL (/cesium/). Cesium is loaded
// from there at runtime instead of being bundled: Next's minifier corrupts Cesium's shader strings.
// Runs before dev/build.
import { cpSync, existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "node_modules/cesium/package.json"), "utf8"));
const src = join(root, "node_modules/cesium/Build/Cesium");
const dest = join(root, "public/cesium");
const marker = join(dest, ".version");
const stamp = `${pkg.version}+bundle`; // bump suffix if the copied file set changes

if (existsSync(marker) && readFileSync(marker, "utf8") === stamp) {
  console.log(`[cesium] assets up to date (v${pkg.version})`);
} else {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const dir of ["Workers", "Assets", "Widgets", "ThirdParty"]) {
    cpSync(join(src, dir), join(dest, dir), { recursive: true });
  }
  cpSync(join(src, "Cesium.js"), join(dest, "Cesium.js"));
  writeFileSync(marker, stamp);
  console.log(`[cesium] copied assets v${pkg.version} -> public/cesium`);
}
