import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const cesiumVersion: string = JSON.parse(
  readFileSync(path.join(__dirname, "node_modules/cesium/package.json"), "utf8"),
).version;

const nextConfig: NextConfig = {
  // apps/web is a self-contained npm project; don't let stray lockfiles in parent
  // directories change the inferred workspace root.
  outputFileTracingRoot: path.join(__dirname),
  // Used to cache-bust /cesium/Cesium.js when the package is upgraded.
  env: { NEXT_PUBLIC_CESIUM_VERSION: cesiumVersion },
  reactStrictMode: true,
};

export default nextConfig;
