import type { Locale } from "./messages";

/**
 * EN/ES copy for the inclusive mode (accessibility menu, colour-blind legends).
 * Agents B (blind) and C (deaf) may append keys; keep both locales in sync.
 */

export interface A11yCopy {
  menuButton: string;
  menuTitle: string;
  menuIntro: string;
  close: string;
  screenReader: string;
  screenReaderHint: string;
  deaf: string;
  deafHint: string;
  colorblind: string;
  colorblindHint: string;
  on: string;
  off: string;
  /** Announcement after a switch changes, e.g. "Colour-blind safe colours: on". */
  changed: (name: string, on: boolean) => string;
  /** Legend shown on the map while colour-blind mode is on. */
  cvdLegendTitle: string;
  cvdLegendNote: string;
  verdictGood: string;
  verdictMixed: string;
  verdictAvoid: string;
  mitecoTitle: string;
  mitecoClasses: [string, string, string, string, string];
  sequentialNote: string;
  divergingNote: string;
}

const EN: A11yCopy = {
  menuButton: "Accessibility",
  menuTitle: "Accessibility",
  menuIntro: "Turn on the help you need. Your choice is remembered on this device.",
  close: "Close accessibility menu",
  screenReader: "Blind / low vision (screen reader)",
  screenReaderHint: "Describes the map in words and announces every change.",
  deaf: "Deaf / hard of hearing",
  deafHint: "Every sound or voice is also shown as on-screen text.",
  colorblind: "Colour-blind safe colours",
  colorblindHint: "Map colours readable with any colour vision, plus symbols ✓ ~ ✕.",
  on: "on",
  off: "off",
  changed: (name, on) => `${name}: ${on ? "on" : "off"}`,
  cvdLegendTitle: "Colour-blind safe colours",
  cvdLegendNote: "Meaning is also given by symbol and text, never by colour alone.",
  verdictGood: "✓ Good evidence for PV",
  verdictMixed: "~ Mixed evidence",
  verdictAvoid: "✕ Avoid / not supported",
  mitecoTitle: "MITECO environmental sensitivity",
  mitecoClasses: ["0 · Maximum (not recommended)", "1 · Very high", "2 · High", "3 · Moderate", "4 · Low"],
  sequentialNote: "Values: dark = low, bright = high.",
  divergingNote: "Trends: blue = down, white = no change, orange = up.",
};

const ES: A11yCopy = {
  menuButton: "Accesibilidad",
  menuTitle: "Accesibilidad",
  menuIntro: "Activa la ayuda que necesites. Se recuerda en este dispositivo.",
  close: "Cerrar menú de accesibilidad",
  screenReader: "Ceguera / baja visión (lector de pantalla)",
  screenReaderHint: "Describe el mapa con palabras y anuncia cada cambio.",
  deaf: "Sordera / hipoacusia",
  deafHint: "Todo sonido o voz se muestra también como texto en pantalla.",
  colorblind: "Colores aptos para daltonismo",
  colorblindHint: "Colores del mapa legibles con cualquier visión del color, más símbolos ✓ ~ ✕.",
  on: "activado",
  off: "desactivado",
  changed: (name, on) => `${name}: ${on ? "activado" : "desactivado"}`,
  cvdLegendTitle: "Colores aptos para daltonismo",
  cvdLegendNote: "El significado también se indica con símbolo y texto, nunca solo con color.",
  verdictGood: "✓ Buena evidencia para FV",
  verdictMixed: "~ Evidencia mixta",
  verdictAvoid: "✕ Evitar / sin respaldo",
  mitecoTitle: "Sensibilidad ambiental MITECO",
  mitecoClasses: ["0 · Máxima (no recomendada)", "1 · Muy alta", "2 · Alta", "3 · Moderada", "4 · Baja"],
  sequentialNote: "Valores: oscuro = bajo, claro = alto.",
  divergingNote: "Tendencias: azul = baja, blanco = sin cambio, naranja = sube.",
};

export function a11yCopy(locale: Locale): A11yCopy {
  return locale === "es" ? ES : EN;
}
