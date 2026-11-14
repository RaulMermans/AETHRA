import { LoopOnce, LoopRepeat } from "three";

/** Experimental visual states. An LLM does not choose these. */
export const TARO_STATES = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "explaining",
  "discovery",
  "insufficient",
  "error",
  "guiding",
];

const LOOPING = new Set(["idle", "listening", "thinking"]);

const EXPRESSIONS = {
  idle: null,
  greeting: "happy",
  listening: "curious",
  thinking: "thinking",
  explaining: "confident",
  discovery: "surprised",
  insufficient: "concerned",
  error: "concerned",
  guiding: "confident",
};

/**
 * @param {string} value
 * @returns {value is (typeof TARO_STATES)[number]}
 */
export function isTaroState(value) {
  return TARO_STATES.includes(value);
}

/**
 * @param {string} state
 * @param {boolean} reducedMotion
 */
export function clipNameFor(state, reducedMotion) {
  if (!isTaroState(state)) {
    throw new Error(`Unknown TARO state: ${state}`);
  }
  return reducedMotion ? `${state}_reduced` : state;
}

/**
 * @param {import("three").Object3D} root
 * @param {string | null} expression
 */
export function applyExpression(root, expression) {
  const names = ["blink", "happy", "curious", "thinking", "surprised", "confident", "concerned"];
  root.traverse((node) => {
    if (!("morphTargetDictionary" in node) || !("morphTargetInfluences" in node)) {
      return;
    }
    const dictionary = /** @type {Record<string, number> | undefined} */ (node.morphTargetDictionary);
    const influences = /** @type {number[] | undefined} */ (node.morphTargetInfluences);
    if (dictionary === undefined || influences === undefined) {
      return;
    }
    for (const name of names) {
      const index = dictionary[name];
      if (index === undefined) {
        continue;
      }
      influences[index] = name === expression ? 1 : 0;
    }
  });
}

/**
 * @param {import("three").AnimationMixer} mixer
 * @param {import("three").AnimationClip[]} clips
 * @param {string} state
 * @param {boolean} reducedMotion
 */
export function playTaroState(mixer, clips, state, reducedMotion) {
  const name = clipNameFor(state, reducedMotion);
  const clip = clips.find((item) => item.name === name);
  if (clip === undefined) {
    throw new Error(`GLB is missing animation ${name}`);
  }
  const loops = !reducedMotion && LOOPING.has(state);
  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.setLoop(loops ? LoopRepeat : LoopOnce, loops ? Infinity : 1);
  action.clampWhenFinished = !loops;
  action.reset();
  action.play();
  const expression = EXPRESSIONS[state];
  if (expression === undefined) {
    throw new Error(`No expression mapping for ${state}`);
  }
  applyExpression(mixer.getRoot(), expression);
  return action;
}
