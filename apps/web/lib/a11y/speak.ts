/**
 * Read-aloud helper (Web Speech API) with a built-in caption channel.
 *
 * Every call to speak() emits {text, state:"start"} to subscribers BEFORE any audio is produced and
 * {text, state:"end"} when it finishes (or is cancelled / unsupported). <CaptionBar/>, mounted inside
 * AccessibilityProvider, subscribes via onSpeech() so the exact spoken text is always shown on screen:
 * no audio in AETHRA exists without a text equivalent (WCAG 1.2.x / deaf & hard-of-hearing users).
 *
 * SSR-safe: on the server or in browsers without speechSynthesis, speak() still emits caption events
 * (so the text is visible) and simply produces no sound.
 */

export type SpeechState = "start" | "end";
export type SpeechEvent = { text: string; state: SpeechState };
export type SpeechListener = (event: SpeechEvent) => void;
export type SpeakOptions = { lang?: "en" | "es" };

const listeners = new Set<SpeechListener>();
let speaking = false;
let currentText = "";

function emit(event: SpeechEvent): void {
  listeners.forEach((l) => {
    try {
      l(event);
    } catch {
      /* a broken listener must not stop speech or other captions */
    }
  });
}

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return "speechSynthesis" in window && window.speechSynthesis ? window.speechSynthesis : null;
}

/** Subscribe to speech events. Returns an unsubscribe function. */
export function onSpeech(listener: SpeechListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Speak `text` aloud (if supported) and always emit it as a caption. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  const clean = (text ?? "").trim();
  if (!clean) return;
  const s = synth();
  if (speaking) stopSpeaking();
  speaking = true;
  currentText = clean;
  emit({ text: clean, state: "start" });

  const finish = () => {
    if (currentText !== clean) return; // superseded by a newer utterance
    speaking = false;
    currentText = "";
    emit({ text: clean, state: "end" });
  };

  if (!s || typeof SpeechSynthesisUtterance === "undefined") {
    // No audio available: caption stays visible a reading-friendly time, then ends.
    if (typeof window !== "undefined") window.setTimeout(finish, Math.max(5000, clean.length * 60));
    else finish();
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = opts.lang === "es" ? "es-ES" : "en-US";
    u.onend = finish;
    u.onerror = finish;
    s.speak(u);
  } catch {
    finish();
  }
}

/** Cancel any ongoing speech (captions get an "end" event). */
export function stopSpeaking(): void {
  const text = currentText;
  const s = synth();
  speaking = false;
  currentText = "";
  try {
    s?.cancel();
  } catch {
    /* ignore */
  }
  if (text) emit({ text, state: "end" });
}

export function isSpeaking(): boolean {
  return speaking;
}
