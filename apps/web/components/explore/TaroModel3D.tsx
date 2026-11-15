"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationAction, AnimationMixer, Object3D } from "three";
import type { CoreVisualState } from "./AethraCoreMark";
import { TaroPortrait } from "./TaroPortrait";

/**
 * TARO 3D character (experiments/taro/export/taro.glb, copied to public/taro/taro.glb).
 * Visual only: the clip follows the panel state and never creates or changes a scientific result.
 * Falls back to the portrait PNG when WebGL or the GLB is unavailable.
 */

const MODEL_URL = "/taro/taro.glb";

/** GLB clip names (see experiments/taro/README.md). */
type TaroClip = "idle" | "greeting" | "thinking" | "explaining" | "insufficient";

const LOOPING: ReadonlySet<TaroClip> = new Set<TaroClip>(["idle", "thinking"]);

/** Face shape keys in the GLB; null = neutral. */
const EXPRESSION: Record<TaroClip, string | null> = {
  idle: null,
  greeting: "happy",
  thinking: "thinking",
  explaining: "confident",
  insufficient: "concerned",
};
/** Head framing as fractions of model height (tuned by eye on the 14 Nov 2026 GLB). */
const HEAD_CENTER = 0.8;
const HEAD_SPAN = 0.42;
const SHAPE_KEYS = ["blink", "happy", "curious", "thinking", "surprised", "confident", "concerned"] as const;

function clipFor(state: CoreVisualState): TaroClip {
  switch (state) {
    case "idle":
      return "idle";
    case "investigating":
      return "thinking";
    case "ready":
      return "explaining";
    case "insufficient":
      return "insufficient";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function applyExpression(root: Object3D, expression: string | null): void {
  root.traverse((node) => {
    if (!("morphTargetDictionary" in node) || !("morphTargetInfluences" in node)) return;
    const dictionary = node.morphTargetDictionary as Record<string, number> | undefined;
    const influences = node.morphTargetInfluences as number[] | undefined;
    if (!dictionary || !influences) return;
    for (const name of SHAPE_KEYS) {
      const index = dictionary[name];
      if (index !== undefined) influences[index] = name === expression ? 1 : 0;
    }
  });
}

type Rig = {
  mixer: AnimationMixer;
  play: (clip: TaroClip) => void;
};

/** "body" = full figure (panel stage); "head" = head and shoulders (round profile button). */
export type TaroFraming = "body" | "head";

export function TaroModel3D({
  state,
  framing = "body",
  greet = true,
  className,
}: {
  state: CoreVisualState;
  framing?: TaroFraming;
  /** Play the one-shot greeting when the model first appears. */
  greet?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<Rig | null>(null);
  const stateRef = useRef<CoreVisualState>(state);
  const framingRef = useRef<TaroFraming>(framing);
  const greetRef = useRef(greet);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | null = null;

    void (async () => {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        if (disposed) return;

        const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
        scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x1a2433, 0.95));
        const key = new THREE.DirectionalLight(0xfff6ea, 1.35);
        key.position.set(-1.4, 2.4, 2.2);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xd7e7ff, 0.55);
        rim.position.set(1.2, 1.6, -1.8);
        scene.add(rim);

        const resize = () => {
          const w = Math.max(host.clientWidth, 1);
          const h = Math.max(host.clientHeight, 1);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();

        const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
        if (disposed) {
          observer.disconnect();
          renderer.dispose();
          renderer.domElement.remove();
          return;
        }

        // Feet on y = 0. "body" fits the whole height; "head" fits the top of the figure (head + hair).
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += size.y / 2;
        scene.add(model);
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const [focusY, frameHeight] = framingRef.current === "head" ? [size.y * HEAD_CENTER, size.y * HEAD_SPAN] : [size.y * 0.5, size.y * 1.12];
        const distance = frameHeight / 2 / Math.tan(halfFov);
        camera.position.set(0, focusY + size.y * 0.02, distance);
        camera.lookAt(0, focusY, 0);

        const mixer = new THREE.AnimationMixer(model);
        let current: AnimationAction | null = null;
        const play = (name: TaroClip) => {
          const reduced = reducedQuery.matches;
          const clip = gltf.animations.find((c) => c.name === (reduced ? `${name}_reduced` : name));
          if (!clip) return; // missing clip: keep the current pose rather than fail the panel
          const loops = !reduced && LOOPING.has(name);
          const action = mixer.clipAction(clip);
          action.reset();
          action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
          action.clampWhenFinished = !loops;
          if (current && current !== action) action.crossFadeFrom(current, 0.25, false);
          action.play();
          current = action;
          applyExpression(model, EXPRESSION[name]);
        };
        // One-shot clips settle back into the state's resting clip.
        mixer.addEventListener("finished", () => {
          const resting = clipFor(stateRef.current);
          if (resting === "idle" || resting === "thinking") play(resting);
        });
        rigRef.current = { mixer, play };
        play(greetRef.current ? "greeting" : clipFor(stateRef.current));
        setLoaded(true);

        const onMotionChange = () => play(clipFor(stateRef.current));
        reducedQuery.addEventListener("change", onMotionChange);

        const clock = new THREE.Clock();
        const tick = () => {
          const delta = clock.getDelta();
          // Hidden copies (display: none) have no size: skip their draw calls.
          if (host.clientWidth > 0) {
            if (!reducedQuery.matches) mixer.update(delta);
            renderer.render(scene, camera);
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        cleanup = () => {
          cancelAnimationFrame(frame);
          reducedQuery.removeEventListener("change", onMotionChange);
          observer.disconnect();
          mixer.stopAllAction();
          scene.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.geometry.dispose();
              const materials: unknown[] = Array.isArray(node.material) ? node.material : [node.material];
              for (const m of materials) if (m instanceof THREE.Material) m.dispose();
            }
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        // WebGL or GLB unavailable: the portrait stays (loaded remains false).
      }
    })();

    return () => {
      disposed = true;
      rigRef.current = null;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    stateRef.current = state;
    rigRef.current?.play(clipFor(state));
  }, [state]);

  return (
    <div ref={hostRef} data-taro-model={framing} className={`relative ${className ?? ""}`} aria-hidden>
      {/* Portrait while the GLB loads, and as the fallback if it cannot. */}
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center">
          <TaroPortrait className={framing === "head" ? "h-full w-full" : "size-20"} />
        </div>
      )}
    </div>
  );
}
