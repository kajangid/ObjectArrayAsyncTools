# @omnidev-tools/object-array-async-tools

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](tsconfig.json)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)](package.json)
[![Module](https://img.shields.io/badge/Module-ESM%20%7C%20CJS-orange.svg)]()

<!-- [![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen.svg)]() -->

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-101%20passed-success.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg)](package.json)
[![Coverage](https://img.shields.io/badge/coverage-96.3%25-brightgreen.svg)](docs/TESTING.md)

A production-grade, **zero-runtime-dependency** TypeScript utility library and standalone CLI toolkit designed for high-performance data transformations, collection manipulation, and robust asynchronous control flow.

Built natively for **Node.js (>= 18.0.0)**, **Modern Browsers**, **Bun**, **Deno**, and **Cloudflare Workers** with dual **ESM** (`.mjs`) and **CommonJS** (`.cjs`) output, tree-shakeable subpath exports, and comprehensive prototype pollution defenses.

---

## Table of Contents

- [@omnidev-tools/object-array-async-tools](#omnidev-toolsobject-array-async-tools)
  - [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [Tools \& Utilities Overview](#tools--utilities-overview)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Subpath Imports (Tree-Shaking)](#subpath-imports-tree-shaking)
  - [CLI Toolkit](#cli-toolkit)
    - [Exit Codes](#exit-codes)
  - [Security Architecture](#security-architecture)
  - [NPM Scripts](#npm-scripts)
  - [Documentation Index](#documentation-index)
  - [License](#license)

---

## Key Features

- **Zero Runtime Dependencies**: Every single utility is implemented from first principles. No hidden sub-dependencies, no supply-chain bloat.
- **Dual ESM / CommonJS Architecture**: Seamless integration in both modern native ESM (`import`) and legacy CommonJS (`require`) runtimes with exact TypeScript type definitions (`.d.ts` / `.d.cts`).
- **Security by Default**: Defenses against prototype pollution attacks (`__proto__`, `constructor`, `prototype`) across object cloning, diffing, grouping, and cleaning.
- **Universal Runtime Support**: Fully functional across Node.js 18+, Bun, Deno, modern web browsers, and edge environments like Cloudflare Workers.
- **Standalone CLI**: High-performance unified binary (`oa-tools`) and dedicated binary aliases (`oa-clone`, `oa-diff`, `oa-clean`, `oa-chunk`, `oa-sort`, `oa-retry`, `oa-timeout`) supporting stdin pipes and file arguments.
- **100% Test Pass Rate**: Thorough test suites with >96% statement and branch coverage via Vitest and V8 coverage (168 tests across 18 test files).

---

## Tools & Utilities Overview

| #   | Utility                                                 | Category | Description                                                                                                                             |
| --- | ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [`deepClone`](docs/FEATURES.md#1-deep-clone)            | Object   | Independent deep copy of nested objects/arrays handling circular references, Maps, Sets, Dates, RegExps, TypedArrays, and Errors.       |
| 2   | [`deepEqual`](docs/FEATURES.md#2-deep-equal)            | Object   | Recursive structural equality comparator for complex graphs, circular structures, Maps, Sets, and binary buffers.                       |
| 3   | [`objectDiff`](docs/FEATURES.md#3-object-diff)          | Object   | Computes structural differences returning added, removed, and updated fields with flat dot-paths or nested hierarchies.                 |
| 4   | [`objectClean`](docs/FEATURES.md#4-object-clean)        | Object   | Immutable cleaner filtering nulls, undefineds, empty strings, empty arrays, empty objects, and NaNs.                                    |
| 5   | [`chunk`](docs/FEATURES.md#5-chunk)                     | Array    | Partitions arrays into uniform fixed-size batches for pagination, batch requests, and worker dispatching.                               |
| 6   | [`groupBy` / `groupByMap`](docs/FEATURES.md#6-group-by) | Array    | Groups elements by key or callback into a prototype-free record (`Object.create(null)`) or an ES6 Map.                                  |
| 7   | [`uniqueArray`](docs/FEATURES.md#7-unique-array)        | Array    | Removes duplicates while preserving order, supporting primitive fast-paths, key selectors, or deep structural equality.                 |
| 8   | [`smartSort`](docs/FEATURES.md#8-smart-sort)            | Array    | Pure stable sorting supporting multi-field ordering, natural string collation (e.g. `v2` before `v10`), dates, and null placement.      |
| 9   | [`debounce`](docs/FEATURES.md#9-debounce)               | Async    | Delays callback execution until after a quiet period, supporting leading/trailing edges, maxWait guarantees, `cancel()`, and `flush()`. |
| 10  | [`throttle`](docs/FEATURES.md#10-throttle)              | Async    | Regulates execution frequency to at most once per time window with configurable leading/trailing edges.                                 |
| 11  | [`retry`](docs/FEATURES.md#11-retry)                    | Async    | Automatically retries failed async tasks with exponential/linear backoff, full/half jitter, error filters, and AbortSignal support.     |
| 12  | [`promiseTimeout`](docs/FEATURES.md#12-promise-timeout) | Async    | Enforces execution deadlines, rejecting with `TimeoutError` or triggering fallback handlers with automated timer teardown.              |
| 13  | [`AsyncQueue`](docs/FEATURES.md#13-async-queue)         | Async    | Concurrency-limited worker queue supporting priority scheduling, per-task timeouts, pause/resume, and lifecycle hooks (`onIdle`).       |

---

## Installation

```bash
# Using npm
npm install @omnidev-tools/object-array-async-tools

# Using pnpm
pnpm add @omnidev-tools/object-array-async-tools

# Using yarn
yarn add @omnidev-tools/object-array-async-tools

# Using bun
bun add @omnidev-tools/object-array-async-tools
```

For global CLI usage:

```bash
npm install -g @omnidev-tools/object-array-async-tools
```

---

## Quick Start

```typescript
import {
  deepClone,
  deepEqual,
  objectDiff,
  objectClean,
  chunk,
  groupBy,
  uniqueArray,
  smartSort,
  debounce,
  throttle,
  retry,
  promiseTimeout,
  AsyncQueue,
} from "@omnidev-tools/object-array-async-tools";

// 1. Safe Deep Cloning (Handles circular references)
const graph: any = { name: "Node A" };
graph.self = graph;
const clonedGraph = deepClone(graph);
console.log(clonedGraph.self === clonedGraph); // true (independent clone)

// 2. Structural Deep Equality
console.log(deepEqual({ a: [1, 2], d: new Date(0) }, { a: [1, 2], d: new Date(0) })); // true

// 3. Object Diffing
const before = { id: 1, config: { theme: "light", debug: false } };
const after = { id: 1, config: { theme: "dark", port: 8080 } };
const diff = objectDiff(before, after);
// diff.updated -> { 'config.theme': { before: 'light', after: 'dark' } }
// diff.removed -> { 'config.debug': false }
// diff.added   -> { 'config.port': 8080 }

// 4. Object Cleaning
const dirty = { name: "Alice", bio: "", role: null, flags: [] };
const clean = objectClean(dirty, { emptyStrings: true, emptyArrays: true });
// { name: 'Alice' }

// 5. Array Chunking
const batches = chunk([1, 2, 3, 4, 5], 2);
// [[1, 2], [3, 4], [5]]

// 6. Resilient Async Retries
const data = await retry(
  async ({ attempt }) => {
    return await fetchUserData(attempt);
  },
  { retries: 3, backoff: "exponential", factor: 2 },
);
```

---

## Subpath Imports (Tree-Shaking)

To minimize bundle size in web applications, each utility can be imported individually via dedicated subpaths:

```typescript
import { deepClone } from "@omnidev-tools/object-array-async-tools/deep-clone";
import { deepEqual } from "@omnidev-tools/object-array-async-tools/deep-equal";
import { objectDiff } from "@omnidev-tools/object-array-async-tools/object-diff";
import { objectClean } from "@omnidev-tools/object-array-async-tools/object-clean";
import { chunk } from "@omnidev-tools/object-array-async-tools/chunk";
import { groupBy } from "@omnidev-tools/object-array-async-tools/group-by";
import { uniqueArray } from "@omnidev-tools/object-array-async-tools/unique-array";
import { smartSort } from "@omnidev-tools/object-array-async-tools/smart-sort";
import { debounce } from "@omnidev-tools/object-array-async-tools/debounce";
import { throttle } from "@omnidev-tools/object-array-async-tools/throttle";
import { retry } from "@omnidev-tools/object-array-async-tools/retry";
import { promiseTimeout } from "@omnidev-tools/object-array-async-tools/promise-timeout";
import { AsyncQueue } from "@omnidev-tools/object-array-async-tools/async-queue";
```

---

## CLI Toolkit

The package provides a unified binary `oa-tools` along with dedicated binary aliases for standard command-line data processing:

```bash
# Display CLI help
oa-tools --help

# Piped stdin: chunk array into batches of 2
cat users.json | oa-tools chunk --size 2

# Compare two JSON files
oa-tools equal file1.json file2.json

# View JSON structural diff (exits with code 1 if changed with --check)
oa-tools diff file1.json file2.json --check

# Clean empty fields from payload
cat input.json | oa-tools clean --empty-strings --empty-objects

# Sort dataset naturally by a property
oa-tools sort records.json --by version --order asc

# Run an external command with retry logic
oa-tools retry --retries 3 --delay 2000 -- curl -f https://api.example.com/health

# Run an external command with a timeout deadline (milliseconds)
oa-tools timeout --ms 5000 -- npm test
```

### Exit Codes

- `0`: Success (or identical structures).
- `1`: Operation failure / Difference detected with `--check` / Task execution failed.
- `2`: CLI usage syntax error / Missing required arguments.

---

## Security Architecture

1. **Prototype Pollution Protection**:
   - Traversal logic in `deepClone`, `objectClean`, and `objectDiff` explicitly skips `__proto__`, `prototype`, and `constructor` properties.
   - `groupBy` returns prototype-less dictionaries created via `Object.create(null)` so grouping on attacker-controlled keys (e.g. `'__proto__'`) cannot poison Object prototypes.
2. **Safe Object Creation**:
   - Exported `createSafeRecord()` and `safeAssign()` utilities ensure zero prototype pollution across object transformations.
3. **Timer Teardown**:
   - `promiseTimeout`, `retry`, `debounce`, and `throttle` actively remove listeners and clear pending timers immediately on resolution, rejection, or abort, eliminating event-loop memory leaks.

---

## NPM Scripts

| Script           | Command                                              | Purpose                                         |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `build`          | `tsup`                                               | Compiles dual ESM/CJS and `.d.ts` declarations. |
| `test`           | `vitest run`                                         | Executes all 18 test suites once.               |
| `test:watch`     | `vitest`                                             | Runs Vitest in interactive watch mode.          |
| `test:coverage`  | `vitest run --coverage`                              | Generates V8 code coverage reports.             |
| `typecheck`      | `tsc --noEmit`                                       | Strict TypeScript compiler validation.          |
| `bump:patch`     | `npm version patch`                                  | Increments patch version.                       |
| `bump:minor`     | `npm version minor`                                  | Increments minor version.                       |
| `bump:major`     | `npm version major`                                  | Increments major version.                       |
| `prepublishOnly` | `npm run typecheck && npm run test && npm run build` | Automated pre-release verification pipeline.    |
| `publish:dry`    | `npm publish --dry-run`                              | Verifies tarball contents without publishing.   |

---

## Documentation Index

- [Architecture Guide](docs/ARCHITECTURE.md): Runtime design, memory models, module decomposition, and bundling design.
- [Installation Guide](docs/INSTALLATION.md): Setup instructions for Node, Bun, Deno, Browsers, and Cloudflare Workers.
- [Features Reference](docs/FEATURES.md): Comprehensive API reference, type signatures, and real-world code examples for all 13 tools.
- [Limitations & Boundaries](docs/LIMITATIONS.md): Edge cases, recursion boundaries, memory limits, and performance considerations.
- [Testing & Quality Guide](docs/TESTING.md): Test matrix, coverage reports, and security attack test cases.
- [Deployment Guide](docs/DEPLOYMENT.md): Step-by-step npm release workflow, automated CI/CD, and publishing checklist.

---

## License

MIT © [OmniDev Tools](LICENSE)
