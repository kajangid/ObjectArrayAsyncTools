# System Architecture & Design Specification

This document details the architectural principles, module decomposition, boundary contracts, memory safety strategies, and bundling pipeline for `@omnidev-tools/object-array-async-tools`.

---

## 1. High-Level Architectural Principles

1. **Zero Runtime Dependencies**:
   - Built 100% from ECMAScript first principles.
   - Shields applications from transitive supply-chain risks, malicious dependency hijacking, and unpredictable dependency version drift.
2. **Deterministic Immutability**:
   - Data transformation utilities (`objectClean`, `uniqueArray`, `smartSort`, `chunk`, `deepClone`) never mutate source data.
   - Operations produce clean, independent memory structures.
3. **Security by Default**:
   - Defensive coding against prototype pollution attacks on every input vector.
   - Prototype-less internal records (`Object.create(null)`) for property lookups and grouping.
4. **Universal Interoperability**:
   - Pure standard ECMAScript APIs (ES2022) ensures identical semantics in Node.js (>= 18), Bun, Deno, modern web browsers, and Cloudflare Workers.
5. **Granular Tree-Shaking**:
   - Strict module decoupling allows consumers to bundle only the individual functions they use.

---

## 2. Module Boundaries & Decomposition

```
src/
├── version.ts                     # Compile-time package version
├── shared/                        # Shared runtime primitives
│   ├── types.ts                   # Type guards and structural types
│   ├── security.ts                # Prototype pollution guards & safe factories
│   └── errors.ts                  # Domain error hierarchy
├── deep-clone/                    # Tool 1: deep-clone
├── deep-equal/                    # Tool 2: deep-equal
├── object-diff/                   # Tool 3: object-diff
├── object-clean/                  # Tool 4: object-clean
├── chunk/                         # Tool 5: chunk
├── group-by/                      # Tool 6: group-by & group-by-map
├── unique-array/                  # Tool 7: unique-array
├── smart-sort/                    # Tool 8: smart-sort
├── debounce/                      # Tool 9: debounce
├── throttle/                      # Tool 10: throttle
├── retry/                         # Tool 11: retry & calculate-delay
├── promise-timeout/               # Tool 12: promise-timeout
├── async-queue/                   # Tool 13: async-queue
├── index.ts                       # Unified library re-export
└── bin/
    └── cli.ts                     # Standalone CLI & binary entrypoints
```

### Decoupling Rules
- Utilities in `src/<tool>` must not import from sibling `<tool>` modules unless architecturally intended (e.g. `throttle` delegating to `debounce`, `unique-array` and `object-diff` utilizing `deep-equal`).
- Submodules depend only on `src/shared/*` or explicit child utilities.

---

## 3. Data Flow & Memory Management

### Circular Reference Graph Resolution
Both `deepClone` and `deepEqual` navigate cyclic object graphs using `WeakMap` mappings:
- In `deepClone`, `seen: WeakMap<object, object>` tracks every instantiated clone instance. If a cyclic reference is encountered, the previously instantiated clone reference is returned immediately, preventing call-stack overflows.
- In `deepEqual`, `visited: Map<object, Set<object>>` records visited pairs `(A, B)`. If `(A, B)` is revisited during traversal, equality is presumed for the cycle.

### Event-Loop & Timer Lifecycle
In asynchronous utilities (`promiseTimeout`, `retry`, `debounce`, `throttle`, `AsyncQueue`):
- All allocated `setTimeout` handles are strictly tracked.
- On promise settlement (`resolve` / `reject`) or abort signals (`AbortSignal`), timers are cleared synchronously via `clearTimeout(timerId)`.
- Event listeners added to `AbortSignal` are registered with `{ once: true }` and explicitly removed in cleanup blocks to avoid listener retention leaks in long-lived Node.js processes.

---

## 4. Prototype Pollution Defenses

In JavaScript, assigning to properties named `__proto__`, `prototype`, or `constructor` on plain object instances can modify `Object.prototype`, affecting all objects in the runtime.

```
                    ┌───────────────────────────┐
                    │ Untrusted External Input  │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │   isDangerousKey(key)     │
                    │   Checks: __proto__,      │
                    │   constructor, prototype  │
                    └─────────────┬─────────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
               [Dangerous]                    [Safe]
                   │                             │
                   ▼                             ▼
       ┌────────────────────────┐   ┌────────────────────────┐
       │ Omit from destination  │   │ Object.defineProperty  │
       │ or safeRecord[key]     │   │ or Object.create(null) │
       └────────────────────────┘   └────────────────────────┘
```

The package implements three defense layers:
1. **Key Filtering**: All property iterations (`Object.keys`, `Object.getOwnPropertySymbols`, `for...in`) filter out dangerous keys before copying or setting.
2. **Prototype-less Storage**: Dictionary outputs from `groupBy`, `createSafeRecord()`, and `objectDiff` are instantiated via `Object.create(null)`.
3. **Safe Property Checkers**: Property membership uses `Object.prototype.hasOwnProperty.call(target, key)` to protect against objects where `hasOwnProperty` has been overridden.

---

## 5. Dual ESM & CommonJS Bundling Pipeline

Bundling is orchestrated via `tsup` using `esbuild`:
- **Dual Formats**:
  - `dist/**/*.mjs`: Pure ECMAScript modules with native `import`/`export`.
  - `dist/**/*.cjs`: CommonJS modules with `module.exports` and `require`.
- **Type Emission**:
  - `dist/**/*.d.ts` (ESM declaration)
  - `dist/**/*.d.cts` (CJS declaration)
- **Granular Package Exports**:
  `package.json` `"exports"` defines explicit subpath mappings with conditional keys (`types`, `import`, `require`) for maximum bundler compatibility across Next.js, Vite, Webpack, Rollup, and Node.js loaders.
