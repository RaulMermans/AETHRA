"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AdminBundle,
  type AdminScopeLevel,
  type AdminScopeSelection,
  type ResolvedAdminScope,
} from "@/lib/globe/admin-scope";
import { Icon } from "./Icon";

interface AdminScopeBarProps {
  admin: AdminBundle | null;
  scope: AdminScopeSelection;
  resolved: ResolvedAdminScope;
  onChange: (next: AdminScopeSelection, fly?: boolean) => void;
  onFocusCamera: () => void;
}

const LEVELS: { id: AdminScopeLevel; label: string; sub: string }[] = [
  { id: "age", label: "Estado", sub: "AGE" },
  { id: "ccaa", label: "CCAA", sub: "19" },
  { id: "provincia", label: "Provincia", sub: "52" },
];

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function AdminScopeBar({
  admin,
  scope,
  resolved,
  onChange,
  onFocusCamera,
}: AdminScopeBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyCurrentCcaa, setOnlyCurrentCcaa] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pickerOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else {
      setQuery("");
    }
  }, [pickerOpen]);

  // Provinces belonging to the currently active CCAA
  const siblingProvinces = useMemo(() => {
    if (!admin) return [];
    return admin.provinces.filter((p) => p.ccaaId === scope.ccaaId);
  }, [admin, scope.ccaaId]);

  const filteredCcaa = useMemo(() => {
    if (!admin) return [];
    const q = fold(query.trim());
    if (!q) return admin.ccaa;
    return admin.ccaa.filter((c) => fold(c.name).includes(q) || fold(c.institution).includes(q));
  }, [admin, query]);

  const filteredProvinces = useMemo(() => {
    if (!admin) return [];
    const q = fold(query.trim());
    let list = admin.provinces;
    if (onlyCurrentCcaa && !q) {
      list = list.filter((p) => p.ccaaId === scope.ccaaId);
    }
    if (!q) return list;
    return list
      .filter((p) => fold(p.name).includes(q) || fold(p.ccaaName).includes(q) || fold(p.capital).includes(q))
      .sort(
        (a, b) =>
          Number(!fold(a.name).startsWith(q)) - Number(!fold(b.name).startsWith(q)) ||
          a.name.localeCompare(b.name),
      );
  }, [admin, query, onlyCurrentCcaa, scope.ccaaId]);

  const selectLevel = (level: AdminScopeLevel) => {
    if (!admin) {
      onChange({ ...scope, level }, true);
      return;
    }
    const next: AdminScopeSelection = { ...scope, level };
    if (level === "provincia") {
      const currentProv = admin.provinces.find((p) => p.id === scope.provinceId);
      if (!currentProv || currentProv.ccaaId !== scope.ccaaId) {
        const firstInCcaa = admin.provinces.find((p) => p.ccaaId === scope.ccaaId);
        if (firstInCcaa) next.provinceId = firstInCcaa.id;
      }
    }
    setPickerOpen(false);
    onChange(next, true);
  };

  const handlePickCcaa = (ccaaId: string) => {
    if (!admin) return;
    const firstProv = admin.provinces.find((p) => p.ccaaId === ccaaId);
    setPickerOpen(false);
    onChange(
      {
        ...scope,
        level: "ccaa",
        ccaaId,
        provinceId: firstProv ? firstProv.id : scope.provinceId,
      },
      true,
    );
  };

  const handlePickProvince = (provinceId: string) => {
    if (!admin) return;
    const prov = admin.provinces.find((p) => p.id === provinceId);
    setPickerOpen(false);
    onChange(
      {
        ...scope,
        level: "provincia",
        ccaaId: prov ? prov.ccaaId : scope.ccaaId,
        provinceId,
      },
      true,
    );
  };

  return (
    <section
      aria-label="Acotación territorial por nivel administrativo"
      className="panel pointer-events-auto w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-2.5 shadow-2xl"
    >
      {/* 1. Sleek 3-segment pill bar: Estado (AGE) | CCAA | Provincia */}
      <div
        role="tablist"
        aria-label="Nivel de acotación administrativa"
        className="grid grid-cols-3 gap-1 rounded-xl bg-black/40 p-1 border border-white/8"
      >
        {LEVELS.map((lv) => {
          const active = scope.level === lv.id;
          return (
            <button
              key={lv.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectLevel(lv.id)}
              className={`focus-ring flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-[11px] font-medium transition-all ${
                active
                  ? "bg-accent text-accent-ink shadow-md shadow-accent/20 font-semibold"
                  : "text-muted hover:bg-white/6 hover:text-ink"
              }`}
            >
              <span>{lv.label}</span>
              <span
                className={`rounded-full px-1.5 py-px font-mono text-[9px] ${
                  active ? "bg-black/20 text-accent-ink" : "bg-white/6 text-faint"
                }`}
              >
                {lv.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Interactive Breadcrumb & Active Territory Trigger Card */}
      <div className="mt-2">
        {scope.level === "age" ? (
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent">
                  <span className="size-1.5 rounded-full bg-accent" />
                  Nivel Nacional · Estado (AGE)
                </span>
                <p className="mt-0.5 text-xs font-semibold text-ink">España · Territorio Completo</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted">
                  MITECO · D.G. del Agua · AEMET · PNIEC
                </p>
              </div>
              <button
                type="button"
                onClick={onFocusCamera}
                title="Centrar vista en España"
                className="focus-ring shrink-0 rounded-lg border border-white/10 bg-white/6 p-1.5 text-muted transition hover:bg-white/12 hover:text-ink"
              >
                <Icon name="target" className="size-3.5" />
              </button>
            </div>

            {/* Quick featured CCAA chips to jump straight in without any dropdown */}
            {admin && (
              <div className="mt-2 border-t border-white/8 pt-2">
                <div className="mb-1 flex items-center justify-between text-[9.5px] text-faint">
                  <span>Explorar por Comunidad Autónoma:</span>
                  <button
                    type="button"
                    onClick={() => {
                      selectLevel("ccaa");
                      setPickerOpen(true);
                    }}
                    className="focus-ring text-accent hover:underline"
                  >
                    Ver las 19 →
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["ES61", "ES51", "ES30", "ES41", "ES52", "ES11", "ES70"].map((cid) => {
                    const c = admin.ccaa.find((x) => x.id === cid);
                    if (!c) return null;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handlePickCcaa(c.id)}
                        className="focus-ring rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted transition hover:border-accent/40 hover:bg-accent/15 hover:text-ink"
                      >
                        {c.name.replace("Comunidad de ", "").replace("Comunitat ", "")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Breadcrumb bar */}
            <div className="flex items-center justify-between gap-1 px-0.5 text-[10px]">
              <div className="flex min-w-0 items-center gap-1 text-muted">
                <button
                  type="button"
                  onClick={() => selectLevel("age")}
                  className="focus-ring shrink-0 rounded px-1 py-0.5 hover:bg-white/8 hover:text-ink"
                >
                  España
                </button>
                <span className="text-faint">/</span>
                {scope.level === "provincia" && resolved.ccaa ? (
                  <>
                    <button
                      type="button"
                      onClick={() => selectLevel("ccaa")}
                      className="focus-ring truncate rounded px-1 py-0.5 hover:bg-white/8 hover:text-ink"
                    >
                      {resolved.ccaa.name}
                    </button>
                    <span className="text-faint">/</span>
                    <span className="truncate font-semibold text-amber-300">
                      {resolved.province?.name}
                    </span>
                  </>
                ) : (
                  <span className="truncate font-semibold text-amber-300">{resolved.name}</span>
                )}
              </div>
              <button
                type="button"
                onClick={onFocusCamera}
                title="Enfocar territorio en el globo"
                className="focus-ring shrink-0 rounded-md p-1 text-muted hover:bg-white/10 hover:text-ink"
              >
                <Icon name="target" className="size-3.5" />
              </button>
            </div>

            {/* Tactile Selector Trigger Button (replaces ugly native <select>) */}
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              aria-expanded={pickerOpen}
              className="focus-ring group flex w-full items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-gradient-to-r from-amber-400/12 via-amber-400/6 to-transparent px-3 py-2 text-left transition hover:border-amber-400/60 hover:from-amber-400/18"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                  <span className="truncate text-xs font-semibold text-ink">
                    {resolved.name}
                  </span>
                </div>
                <p className="mt-0.5 truncate pl-3.5 text-[10px] text-muted">
                  {resolved.institution}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-lg bg-white/8 px-2 py-1 text-[10px] font-medium text-amber-200 group-hover:bg-white/14">
                <span>{pickerOpen ? "Cerrar" : "Elegir"}</span>
                <Icon
                  name="chevron"
                  className={`size-3 transition-transform ${pickerOpen ? "-rotate-90" : "rotate-90"}`}
                />
              </div>
            </button>

            {/* Custom Visual Picker Panel (Search + Tactile Chip Grid) */}
            {pickerOpen && admin && (
              <div className="rounded-xl border border-white/15 bg-[#080f1d]/95 p-2 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-black/50 px-2.5 py-1.5">
                  <Icon name="search" className="size-3.5 shrink-0 text-muted" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setPickerOpen(false);
                    }}
                    placeholder={
                      scope.level === "ccaa"
                        ? "Buscar Comunidad Autónoma…"
                        : "Buscar provincia (ej. Málaga, Madrid, Bizkaia…)"
                    }
                    className="w-full bg-transparent text-[11px] text-ink placeholder:text-faint focus:outline-none"
                  />
                </div>

                {/* Filter tabs when in Provincia mode */}
                {scope.level === "provincia" && !query.trim() && (
                  <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setOnlyCurrentCcaa(false)}
                      className={`focus-ring flex-1 rounded-md py-1 text-center transition ${
                        !onlyCurrentCcaa
                          ? "bg-white/14 font-semibold text-ink"
                          : "bg-white/4 text-muted hover:text-ink"
                      }`}
                    >
                      Todas (52)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlyCurrentCcaa(true)}
                      className={`focus-ring flex-1 truncate rounded-md px-1.5 py-1 text-center transition ${
                        onlyCurrentCcaa
                          ? "bg-amber-400/20 font-semibold text-amber-200"
                          : "bg-white/4 text-muted hover:text-ink"
                      }`}
                    >
                      {resolved.ccaa?.name ?? "Esta CCAA"} ({siblingProvinces.length})
                    </button>
                  </div>
                )}

                {/* Scrollable Tactile Grid */}
                <div className="mt-1.5 max-h-52 overflow-y-auto pr-0.5">
                  {scope.level === "ccaa" ? (
                    <div className="grid grid-cols-1 gap-1">
                      {filteredCcaa.map((c) => {
                        const isSelected = c.id === scope.ccaaId;
                        const pCount = admin.provinces.filter((p) => p.ccaaId === c.id).length;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handlePickCcaa(c.id)}
                            className={`focus-ring flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] transition ${
                              isSelected
                                ? "bg-amber-400/20 font-semibold text-amber-200 border border-amber-400/40"
                                : "hover:bg-white/8 text-ink"
                            }`}
                          >
                            <span className="truncate">{c.name}</span>
                            <span className="shrink-0 rounded-full bg-white/8 px-1.5 py-px font-mono text-[9px] text-muted">
                              {pCount} {pCount === 1 ? "prov" : "provs"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {filteredProvinces.map((p) => {
                        const isSelected = p.id === scope.provinceId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePickProvince(p.id)}
                            className={`focus-ring flex flex-col rounded-lg border px-2 py-1.5 text-left transition ${
                              isSelected
                                ? "border-amber-400/50 bg-amber-400/20 text-amber-100"
                                : "border-white/6 bg-white/[0.03] text-ink hover:border-white/20 hover:bg-white/10"
                            }`}
                          >
                            <span className="truncate text-[11px] font-medium">{p.name}</span>
                            <span className="truncate text-[9px] text-faint">{p.ccaaName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Province Chips inside the active CCAA (for instant 1-click jump without opening any menu!) */}
            {!pickerOpen && siblingProvinces.length > 1 && (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                <p className="mb-1.5 text-[9.5px] font-medium text-muted">
                  {scope.level === "ccaa"
                    ? `Provincias de ${resolved.ccaa?.name} (clic para acotar):`
                    : `Provincias en ${resolved.ccaa?.name}:`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {siblingProvinces.map((p) => {
                    const active = scope.level === "provincia" && p.id === scope.provinceId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePickProvince(p.id)}
                        className={`focus-ring rounded-lg px-2 py-0.5 text-[10px] font-medium transition ${
                          active
                            ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                            : "border border-white/10 bg-white/5 text-muted hover:border-amber-400/40 hover:text-ink"
                        }`}
                      >
                        {p.name.split(" / ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modern Switch for Map Clipping */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
              <span className="text-[10px] text-muted">Recortar mapa al territorio</span>
              <button
                type="button"
                role="switch"
                aria-checked={scope.clipToScope}
                onClick={() => onChange({ ...scope, clipToScope: !scope.clipToScope }, false)}
                className={`focus-ring relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  scope.clipToScope ? "bg-amber-400" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block size-3.5 transform rounded-full bg-slate-950 shadow transition-transform ${
                    scope.clipToScope ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
