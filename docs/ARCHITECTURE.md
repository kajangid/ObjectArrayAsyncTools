# System Architecture & Design Specification

This document details the architectural principles, complete file structure, module boundaries, data flow, memory safety strategies, version synchronization design, and bundling pipeline for `@kjangid/array-async-tools`.

---

## 1. High-Level Architectural Principles

1. **Zero Runtime Dependencies**:
   - Built 100% from ECMAScript first principles.
   - Shields consumer applications from transitive supply-chain attacks and unpredictable dependency version drift.
2. **Deterministic Immutability**:
   - Data transformation utilities (`objectClean`, `uniqueArray`, `smartSort`, `chunk`, `deepClone`) never mutate source data.
   - Operations allocate fresh, independent memory structures.
3. **Security by Default**:
   - Built-in defenses against prototype pollution attacks across all object traversal pathways.
   - Internal prototype-free records (`Object.create(null)`) for property lookups and grouping.
4. **Universal Interoperability**:
   - Pure standard ECMAScript APIs (ES2022) ensure identical semantics in Node.js (>= 18), Bun, Deno, modern web browsers, and Cloudflare Workers.
5. **Granular Tree-Shaking & Subpath Exports**:
   - Configured with `"sideEffects": false` in `package.json` to enable dead-code elimination in consumer web bundlers (Webpack, Vite, Rollup).
   - Dedicated subpaths allow importing individual tools with minimal footprint.

---

## 2. Complete Directory Structure

```
ObjectArrayAsyncTools/
├── .gitignore
├── LICENSE
├── package.json                   # Manifest with dual exports and "sideEffects": false
├── package-lock.json
├── prompt.md                      # Package specification prompt
├── README.md                      # Primary package documentation
├── tsconfig.json                  # Strict TypeScript configuration (moduleResolution: bundler)
├── tsup.config.ts                 # Dual ESM/CJS, DTS emit, and __PACKAGE_VERSION__ injection
├── vitest.config.ts               # Vitest runner with v8 coverage provider
├── docs/
│   ├── ARCHITECTURE.md            # High-level architecture & directory tree
│   ├── DEPLOYMENT.md              # Publishing workflow & CI/CD pipeline
│   ├── FEATURES.md                # Comprehensive API guide & CLI reference
│   ├── INSTALLATION.md            # Cross-runtime installation & TypeScript setup
│   ├── LIMITATIONS.md             # Operational boundaries & edge cases
│   └── TESTING.md                 # Test matrix, breakdown table, and coverage report
└── src/
    ├── index.ts                   # Primary entrypoint re-exporting all tools
    ├── index.test.ts              # Root entrypoint integration test suite
    ├── version.ts                 # Version synchronization from package.json
    ├── version.test.ts            # Version synchronization test
    ├── shared/
    │   ├── errors.ts              # Custom error hierarchy
    │   ├── parser.ts              # CLI argument parser & flag evaluator
    │   ├── parser.test.ts         # CLI argument parser unit tests
    │   ├── security.ts            # Prototype pollution defenses & safe object factories
    │   ├── security.test.ts       # Security & error class unit tests
    │   └── types.ts               # Universal primitives and generic types
    ├── deep-clone/
    │   ├── index.ts               # Tool 1: deep-clone implementation
    │   └── index.test.ts          # deep-clone unit tests
    ├── deep-equal/
    │   ├── index.ts               # Tool 2: deep-equal implementation
    │   └── index.test.ts          # deep-equal unit tests
    ├── object-diff/
    │   ├── index.ts               # Tool 3: object-diff implementation
    │   └── index.test.ts          # object-diff unit tests
    ├── object-clean/
    │   ├── index.ts               # Tool 4: object-clean implementation
    │   └── index.test.ts          # object-clean unit tests
    ├── chunk/
    │   ├── index.ts               # Tool 5: chunk implementation
    │   └── index.test.ts          # chunk unit tests
    ├── group-by/
    │   ├── index.ts               # Tool 6: group-by & groupByMap implementation
    │   └── index.test.ts          # group-by unit tests
    ├── unique-array/
    │   ├── index.ts               # Tool 7: unique-array implementation
    │   └── index.test.ts          # unique-array unit tests
    ├── smart-sort/
    │   ├── index.ts               # Tool 8: smart-sort implementation
    │   └── index.test.ts          # smart-sort unit tests
    ├── debounce/
    │   ├── index.ts               # Tool 9: debounce implementation
    │   └── index.test.ts          # debounce unit tests
    ├── throttle/
    │   ├── index.ts               # Tool 10: throttle implementation
    │   └── index.test.ts          # throttle unit tests
    ├── retry/
    │   ├── index.ts               # Tool 11: retry implementation
    │   └── index.test.ts          # retry unit tests
    ├── promise-timeout/
    │   ├── index.ts               # Tool 12: promise-timeout implementation
    │   └── index.test.ts          # promise-timeout unit tests
    ├── async-queue/
    │   ├── index.ts               # Tool 13: async-queue implementation
    │   └── index.test.ts          # async-queue unit tests
    └── bin/
        ├── cli.ts                 # CLI command runner & binary entrypoint
        └── cli.test.ts            # CLI integration test suite
```

---

## 3. Automated Version Streamlining (Single Source of Truth)

To eliminate version drift across documentation, CLI output, and source code:

1. **Single Source of Truth**: `package.json` is the sole authority for package versioning.
2. **Build-Time Injection**: Both `tsup.config.ts` and `vitest.config.ts` read `package.json` dynamically and inject `__PACKAGE_VERSION__` via compile-time define:
   ```typescript
   define: {
     __PACKAGE_VERSION__: JSON.stringify(pkg.version),
   }
   ```
3. **Runtime Fallback**: `src/version.ts` references `__PACKAGE_VERSION__`, falling back to dynamic `package.json` reads if running unbundled:
   ```typescript
   export const VERSION: string =
     typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : getPackageVersion();
   ```
4. **CLI Immediate Output**: `src/bin/cli.ts` checks `--version` and `-v` prior to any other command checks, printing `VERSION + '\n'` directly.
5. **Version Bumping**: When `npm version patch` (or minor/major) executes, only `package.json` is updated, and the build pipeline bakes the new version into the bundle automatically.

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

The package implements three defensive layers:

1. **Key Filtering**: Traversal loops in `deepClone`, `objectClean`, and `objectDiff` explicitly skip `isDangerousKey(key)` properties.
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
