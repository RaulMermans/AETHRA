---
name: typescript-strict
description: >-
  Enforces strict, honest typing in apps/web (Next.js + Cesium, TypeScript strict mode).
  Use whenever you write or edit any .ts/.tsx file: new components, lib/globe modules,
  fetch/JSON loading, event handlers, props, state, or type definitions. Covers no-any,
  validating JSON at the boundary instead of casting, narrowing instead of `as`/`!`,
  discriminated unions for outcome states, exhaustive switches, and units in types.
  Finish by running typecheck + lint.
---

# TypeScript Strict

`tsconfig.json` already has `"strict": true`. The compiler only protects us if we don't lie to it.
Every `any`, unchecked `as` and `!` is a spot where the compiler stops checking. In this project, an
unchecked cast on evidence data can put a wrong number in front of the judges.

## Hard rules

1. **No `any`.** Use `unknown` and narrow it. Use generics when the type really varies.
   If a third-party type is missing, write a small local interface rather than `any`.
2. **No unchecked casts on external data.** `fetch(...).json()`, `JSON.parse`, `localStorage`
   and URL params are all `unknown` until validated. Write a type guard or parser at the
   boundary and fail loudly when the shape is wrong.

   ```ts
   // ❌ current pattern in lib/globe/climate.ts: trusts whatever the file contains
   return r.json() as Promise<ClimateBundle>;

   // ✅ validate once at the boundary; everything downstream is genuinely typed
   const raw: unknown = await r.json();
   if (!isClimateBundle(raw)) throw new Error("climate-bundle.json: unexpected schema");
   return raw;
   ```
   A guard has to check what the UI relies on: required keys, the value types, and the
   `schema_version` when there is one. Don't write a guard that only returns `true`.
3. **Narrow DOM values and keys. Don't cast them.**
   ```ts
   // ❌ e.target.value as EnergyConceptId
   // ✅
   const CONCEPT_IDS = ["solar", "wind" /* … */] as const;
   type EnergyConceptId = (typeof CONCEPT_IDS)[number];
   const isConceptId = (v: string): v is EnergyConceptId =>
     (CONCEPT_IDS as readonly string[]).includes(v);
   onChange={(e) => { if (isConceptId(e.target.value)) onChangeConcept(e.target.value); }}
   ```
   For `Object.keys(obj) as K[]`, keep a typed `const` array of keys and derive the type from it.
4. **No non-null `!`** (e.g. `compare!.label`). Narrow with `if`, `?.` with a rendered fallback,
   or an early return. Only exception: a ref that the line above provably set, with a comment.
5. **No `@ts-ignore`.** If suppression is truly unavoidable, use `// @ts-expect-error <reason>`.
   `eslint-disable` also needs the specific rule name and a reason.
6. **`catch (e)` gives `unknown`.** Narrow it with `e instanceof Error ? e.message : String(e)`.
7. **No floating promises.** `await` them, return them, or `void` them on purpose and handle the
   rejection (`.catch`).

## Modelling rules

- **Use discriminated unions for states.** Don't use boolean flags or optional-field soup. The
  honest outcome states from `docs/UX_UI_RULES.md` should be a union the UI must handle:
  ```ts
  type TrendOutcome =
    | { kind: "robust-trend"; slopePerDecade: number; ci95: [number, number]; units: string }
    | { kind: "no-robust-trend"; reason: string }
    | { kind: "insufficient-evidence"; reason: string };
  ```
- **Make switches exhaustive** with a `never` check, so adding a variant breaks the build:
  ```ts
  default: { const _exhaustive: never = outcome; return _exhaustive; }
  ```
- **Put units in names or types:** `elevationM`, `rangeMetres`, `slopeCPerDecade`. Use a branded
  type (`number & { __unit: "degC" }`) only where mixing units is a real risk.
- **Mark loaded data `readonly`** (`readonly T[]`, `Readonly<…>`). The browser displays the
  pipeline's values and never mutates them.
- **Use string-literal unions instead of `string`** whenever the set is known (`kind`, `datum`,
  palette ids). Derive them from `as const` arrays so the values and the type can't drift apart.
- **Write explicit return types on exported functions** in `lib/`. Inferred types are fine inside
  components.
- **Don't add `| undefined` "just in case".** If a value can be missing, the type says so and the
  UI renders the missing state.

## Science boundary (AGENTS.md rule 6)

Types in the frontend describe values computed by the Python pipeline. Never add a field that
the browser derives into a scientific conclusion: slope, p-value, CI, significance label, or
an aggregation of statistics. Formatting and unit display are fine.

## Before you finish

```bash
cd apps/web && npm run typecheck && npm run lint
```
Both must pass with **zero new errors or warnings** in the files you touched. Report the exact
result. If a check fails for errors that existed before your change, say so and list them; don't
fix unrelated files silently. Never claim "types pass" without running `tsc`.
