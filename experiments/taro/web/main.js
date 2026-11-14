import * as THREE from "three";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";
import { isTaroState, playTaroState } from "./taro-controller.js";

const canvas = document.querySelector("canvas");
const status = document.querySelector("[data-status]");
const fallback = document.querySelector("[data-fallback]");
if (!(canvas instanceof HTMLCanvasElement) || !(status instanceof HTMLElement) || !(fallback instanceof HTMLImageElement)) {
  throw new Error("TARO viewer markup is missing");
}

const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xe8e4dc, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
camera.position.set(0, 0.95, 3.1);
const target = new THREE.Vector3(0, 0.85, 0);
camera.lookAt(target);

scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x1a2433, 0.85));
const key = new THREE.DirectionalLight(0xfff6ea, 1.35);
key.position.set(-1.4, 2.4, 2.2);
scene.add(key);
const rim = new THREE.DirectionalLight(0xd7e7ff, 0.45);
rim.position.set(1.2, 1.6, -1.8);
scene.add(rim);

/** @type {import("three").Object3D | null} */
let model = null;
/** @type {import("three").AnimationMixer | null} */
let mixer = null;
/** @type {import("three").AnimationClip[]} */
let clips = [];
/** @type {string} */
let currentState = "idle";
let yaw = 0;

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

function reducedMotion() {
  return reducedQuery.matches;
}

function showState(state) {
  if (!isTaroState(state) || mixer === null) {
    return;
  }
  currentState = state;
  playTaroState(mixer, clips, state, reducedMotion());
  const motion = reducedMotion() ? "reduced motion" : "full motion";
  status.textContent = `${state} · ${motion}. Visual only. This does not create a scientific result.`;
  for (const button of document.querySelectorAll("[data-state]")) {
    if (button instanceof HTMLButtonElement) {
      button.setAttribute("aria-pressed", button.dataset.state === state ? "true" : "false");
    }
  }
}

const loader = new GLTFLoader();
loader.load(
  "../export/taro.glb",
  (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += box.getSize(new THREE.Vector3()).y * 0.5;
    scene.add(model);
    mixer = new THREE.AnimationMixer(model);
    clips = gltf.animations;
    fallback.hidden = true;
    showState("idle");
  },
  undefined,
  () => {
    status.textContent = "3D model failed to load. Showing the rendered front view.";
    canvas.hidden = true;
    fallback.hidden = false;
  },
);

for (const button of document.querySelectorAll("[data-state]")) {
  button.addEventListener("click", () => {
    const state = button instanceof HTMLElement ? button.dataset.state : undefined;
    if (state !== undefined) {
      showState(state);
    }
  });
}

document.querySelector("[data-turn]")?.addEventListener("click", () => {
  yaw += Math.PI / 2;
});

reducedQuery.addEventListener("change", () => {
  showState(currentState);
});

window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
function frame() {
  const delta = reducedMotion() ? 0 : clock.getDelta();
  if (mixer !== null) {
    mixer.update(delta);
  }
  if (model !== null) {
    model.rotation.y = yaw;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
