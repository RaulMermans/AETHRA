"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AdminBundle,
  type AdminScopeLevel,
  type AdminScopeSelection,
  type ResolvedAdminScope,
} from "@/lib/globe/admin-scope";
import { useLocale } from "@/lib/i18n/locale";
import { Icon } from "./Icon";

interface AdminScopeBarProps {
  admin: AdminBundle | null;
  scope: AdminScopeSelection;
  resolved: ResolvedAdminScope;
  onChange: (next: AdminScopeSelection, fly?: boolean) => void;
  onFocusCamera: () => void;
}

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
  const { m } = useLocale();
  const levels: { id: AdminScopeLevel; label: string }[] = [
    { id: "age", label: m.places.spain },
    { id: "ccaa", label: m.places.region },
    { id: "provincia", label: m.places.province },
  ];
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

  const placeName =
    scope.level === "age"
      ? m.places.allSpain
      : scope.level === "provincia"
        ? resolved.province?.name ?? resolved.name
        : resolved.name;

  return (
    <section
      aria-label={m.places.aria}
      className="panel pointer-events-auto w-[min(18rem,calc(100vw-2rem))] overflow-hidden p-2 shadow-2xl"
    >
      <div
        role="tablist"
        aria-label={m.places.scale}
        className="grid grid-cols-3 gap-0.5 rounded-lg bg-black/35 p-0.5"
      >
        {levels.map((lv) => {
          const active = scope.level === lv.id;
          return (
            <button
              key={lv.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectLevel(lv.id)}
              className={`focus-ring rounded-md py-1 text-center text-[10px] font-medium transition ${
                active ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
              }`}
            >
              {lv.label}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => (scope.level === "age" ? onFocusCamera() : setPickerOpen((o) => !o))}
          aria-expanded={pickerOpen}
          className="focus-ring min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-[11px] font-medium text-ink hover:bg-white/8"
          title={scope.level === "age" ? m.places.fit : m.places.choose}
        >
          {placeName}
        </button>
        {scope.level !== "age" && (
          <button
            type="button"
            role="switch"
            aria-checked={scope.clipToScope}
            aria-label={m.places.clip}
            title={m.places.clip}
            onClick={() => onChange({ ...scope, clipToScope: !scope.clipToScope }, false)}
            className={`focus-ring rounded-md px-1.5 py-1 text-[9px] font-medium ${
              scope.clipToScope ? "bg-amber-400/20 text-amber-200" : "text-faint hover:text-muted"
            }`}
          >
            {m.places.clipShort}
          </button>
        )}
        <button
          type="button"
          onClick={onFocusCamera}
          title={m.places.focus}
          className="focus-ring rounded-md p-1 text-muted hover:bg-white/10 hover:text-ink"
        >
          <Icon name="target" className="size-3.5" />
        </button>
      </div>

      {pickerOpen && admin && scope.level !== "age" && (
              <div className="mt-1.5 rounded-xl border border-white/15 bg-[#080f1d]/95 p-2 shadow-2xl">
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
                      scope.level === "ccaa" ? m.places.searchRegion : m.places.searchProvince
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
                      {m.places.all52}
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
                      {resolved.ccaa?.name ?? m.places.region} ({siblingProvinces.length})
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
                              {pCount} {pCount === 1 ? m.places.prov : m.places.provs}
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
    </section>
  );
}
