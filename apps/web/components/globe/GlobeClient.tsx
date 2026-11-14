"use client";

import dynamic from "next/dynamic";

/** Client-only entry point: Cesium touches `window`/WebGL, so it is never rendered on the server. */
const GlobeClient = dynamic(() => import("./Globe"), { ssr: false });

export default GlobeClient;
