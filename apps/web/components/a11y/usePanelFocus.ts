"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";

/**
 * Focus management for the non-modal side panels (WCAG 2.4.3 focus order, 2.1.1 keyboard):
 *  - when a panel opens because the user activated a control, focus moves to the panel heading;
 *  - when it closes, focus returns to that control (if it still exists);
 *  - Escape inside the panel closes it.
 * Panels that open by themselves at page load (focus still on <body>) do not steal focus, so the
 * skip link stays the first Tab stop.
 */
export function usePanelFocus<P extends HTMLElement = HTMLElement, H extends HTMLElement = HTMLHeadingElement>(onClose?: () => void) {
  const panelRef = useRef<P>(null);
  const headingRef = useRef<H>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const active = document.activeElement as HTMLElement | null;
    const trigger = active && active !== document.body && !panel?.contains(active) ? active : null;
    if (trigger) (headingRef.current ?? panel)?.focus({ preventScroll: true });
    return () => {
      if (!trigger || !trigger.isConnected) return;
      const now = document.activeElement;
      // Only restore when focus was inside the panel (now removed) or got lost to <body>.
      if (!now || now === document.body || (panel && panel.contains(now))) trigger.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || !closeRef.current) return;
    e.stopPropagation();
    closeRef.current();
  }, []);

  return { panelRef, headingRef, onKeyDown };
}
