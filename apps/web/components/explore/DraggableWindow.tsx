"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/locale";

const STORAGE_PREFIX = "aethra.window.offset.v1.";

type Offset = { x: number; y: number };

let globalTopZ = 45;

function loadStoredOffset(id: string): Offset {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return { x: 0, y: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "x" in parsed &&
      "y" in parsed &&
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore storage errors */
  }
  return { x: 0, y: 0 };
}

function saveStoredOffset(id: string, offset: Offset): void {
  try {
    if (offset.x === 0 && offset.y === 0) {
      localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(offset));
    }
  } catch {
    /* ignore storage errors */
  }
}

function isInteractiveElement(target: EventTarget | null, root: HTMLElement | null): boolean {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest(
    'button, a, input, select, textarea, summary, label, [role="button"], [role="tab"], [role="slider"], [data-no-drag]',
  );
  if (!interactive) return false;
  // Allow dragging explicitly marked grip handles even if they are buttons
  if (interactive.hasAttribute("data-drag-handle")) return false;
  return root ? root.contains(interactive) : true;
}

export function DraggableWindow({
  windowId,
  className = "",
  style,
  handleLabel,
  children,
}: {
  windowId: string;
  className?: string;
  style?: CSSProperties;
  handleLabel?: string;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [zIndex, setZIndex] = useState<number | undefined>(undefined);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    minDx: number;
    maxDx: number;
    minDy: number;
    maxDy: number;
  } | null>(null);

  useEffect(() => {
    const saved = loadStoredOffset(windowId);
    if (saved.x !== 0 || saved.y !== 0) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const clampedX = Math.max(-vw * 0.75, Math.min(vw * 0.75, saved.x));
      const clampedY = Math.max(-vh * 0.75, Math.min(vh * 0.75, saved.y));
      setOffset({ x: clampedX, y: clampedY });
    }
  }, [windowId]);

  const bringToFront = () => {
    globalTopZ += 1;
    setZIndex(globalTopZ);
  };

  const startDrag = (e: ReactPointerEvent<HTMLElement>, fromGrip: boolean) => {
    if (e.button !== 0) return;
    const root = rootRef.current;
    if (!root) return;
    if (!fromGrip && isInteractiveElement(e.target, root)) return;

    bringToFront();
    const rect = root.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Keep at least 72px visible horizontally and 48px vertically within the viewport
    const minLeft = 8 - rect.width + 96;
    const maxLeft = vw - 72;
    const minTop = 44;
    const maxTop = vh - 56;

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      minDx: minLeft - rect.left,
      maxDx: maxLeft - rect.left,
      minDy: minTop - rect.top,
      maxDy: maxTop - rect.top,
    };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore pointer capture failure */
    }
    e.stopPropagation();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const rawDx = e.clientX - st.startX;
    const rawDy = e.clientY - st.startY;
    const dx = Math.max(st.minDx, Math.min(st.maxDx, rawDx));
    const dy = Math.max(st.minDy, Math.min(st.maxDy, rawDy));
    const next = { x: Math.round(st.originX + dx), y: Math.round(st.originY + dy) };
    setOffset(next);
  };

  const endDrag = (e: ReactPointerEvent<HTMLElement>) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    dragStateRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    saveStoredOffset(windowId, offset);
  };

  const resetPosition = () => {
    const zero = { x: 0, y: 0 };
    setOffset(zero);
    saveStoredOffset(windowId, zero);
  };

  const hasMoved = offset.x !== 0 || offset.y !== 0;
  const moveTitle =
    handleLabel ??
    (locale === "es"
      ? "Arrastra para mover la ventana (doble clic para restaurar posición)"
      : "Drag to move window (double-click to reset position)");
  const resetTitle =
    locale === "es" ? "Restaurar posición original" : "Reset to original position";

  const mergedStyle: CSSProperties = {
    ...style,
    transform: hasMoved ? `translate3d(${offset.x}px, ${offset.y}px, 0)` : style?.transform,
    zIndex: zIndex ?? style?.zIndex,
  };

  return (
    <div
      ref={rootRef}
      style={mergedStyle}
      onPointerDown={(e) => startDrag(e, false)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`${className} ${dragging ? "select-none cursor-grabbing" : ""}`}
    >
      <div className="pointer-events-auto mb-1 flex shrink-0 items-center justify-center gap-1.5">
        <div
          data-drag-handle
          onPointerDown={(e) => startDrag(e, true)}
          onDoubleClick={resetPosition}
          title={moveTitle}
          className="group flex cursor-grab items-center gap-1.5 rounded-full border border-white/12 bg-black/45 px-3 py-0.5 text-[9px] text-faint backdrop-blur-md transition-colors hover:border-white/25 hover:bg-black/65 hover:text-ink active:cursor-grabbing"
        >
          <span aria-hidden className="tracking-[0.2em] opacity-80 group-hover:opacity-100">
            ⋮⋮
          </span>
          <span className="font-mono uppercase tracking-wider">
            {locale === "es" ? "Mover" : "Move"}
          </span>
        </div>
        {hasMoved && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetPosition();
            }}
            title={resetTitle}
            aria-label={resetTitle}
            className="focus-ring rounded-full border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[9px] text-muted backdrop-blur-md hover:border-white/30 hover:bg-black/70 hover:text-ink"
          >
            ↺
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
