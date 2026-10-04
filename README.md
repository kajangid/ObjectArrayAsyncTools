# @kjangid/array-async-tools

[![npm version](https://img.shields.io/npm/v/@kjangid/array-async-tools.svg)](https://www.npmjs.com/package/@kjangid/array-async-tools)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/@kjangid/array-async-tools)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/LICENSE)
[![CI](https://github.com/kajangid/ObjectArrayAsyncTools/actions/workflows/ci.yml/badge.svg)](https://github.com/kajangid/ObjectArrayAsyncTools/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-168%20passed-success.svg)](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/TESTING.md)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen.svg)](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/TESTING.md)

Production-grade, **zero-runtime-dependency** TypeScript toolkit for transforming objects and arrays, managing collections, and orchestrating asynchronous workflows.

Built from first principles with dual **ESM** and **CommonJS** builds, granular tree-shakeable subpath exports, prototype pollution security guards, and a standalone CLI.

---

## Key Highlights

- **Zero Runtime Dependencies**: Every utility implemented from scratch. Zero supply-chain vulnerabilities, zero dependency bloat.
- **Universal Runtime Support**: Seamless execution across Node.js (>= 18), Modern Browsers, Bun, Deno, and Cloudflare Workers.
- **Dual ESM / CJS Builds**: Full native support for `import` and `require` with first-class TypeScript declarations (`.d.ts` / `.d.cts`).
- **Security by Default**: Built-in defenses against prototype pollution (`__proto__`, `constructor`, `prototype`) across object mutations.
- **Tree-Shakeable Subpaths**: Import from root or via granular subpaths (`@kjangid/array-async-tools/chunk`) with `"sideEffects": false`.
- **Standalone CLI Toolkit**: High-performance unified binary (`oa-tools`) and dedicated aliases with stdin pipe support.

---

## Installation

```bash
# npm
npm install @kjangid/array-async-tools

# pnpm
pnpm add @kjangid/array-async-tools

# yarn
yarn add @kjangid/array-async-tools

# bun
bun add @kjangid/array-async-tools
```

For global CLI usage:

```bash
npm install -g @kjangid/array-async-tools
```

---

## Hero Quick Start

### 1. Data Cleaning, Deduplication & Natural Sorting

```typescript
import { objectClean, uniqueArray, smartSort } from "@kjangid/array-async-tools";

const users = [
  { id: 2, name: "Bob", email: "", role: "admin", version: "v10.0" },
  { id: 1, name: "Alice", email: "alice@example.com", role: null, version: "v2.0" },
  { id: 2, name: "Bob", email: "", role: "admin", version: "v10.0" }, // duplicate
];

// Clean empty fields, deduplicate by ID, and sort naturally by version
const cleanUsers = users.map((u) => objectClean(u, { emptyStrings: true }));
const uniqueUsers = uniqueArray(cleanUsers, { by: (u) => u.id });
const sortedUsers = smartSort(uniqueUsers, { by: (u) => u.version, order: "asc" });

console.log(sortedUsers);
// [
//   { id: 1, name: 'Alice', email: 'alice@example.com', version: 'v2.0' },
//   { id: 2, name: 'Bob', role: 'admin', version: 'v10.0' }
// ]
```

### 2. Resilient Async Queue with Retries & Deadlines

```typescript
import { AsyncQueue, retry, promiseTimeout } from "@kjangid/array-async-tools";

// Concurrency-limited queue (up to 3 concurrent workers)
const queue = new AsyncQueue({ concurrency: 3 });

async function processOrder(orderId: number) {
  return queue.add(async () => {
    // Retry with exponential backoff and enforce a 5-second deadline
    return await promiseTimeout(
      retry(() => fetchOrderData(orderId), { retries: 3, backoff: "exponential" }),
      { ms: 5000 }
    );
  }, { priority: orderId === 1 ? 10 : 0 });
}

await Promise.all([1, 2, 3, 4, 5].map(processOrder));
```

---

## Core Utilities Matrix

| Utility | Category | Description | Subpath Import |
|---|---|---|---|
| [`deepClone`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#1-deep-clone) | Object | Independent deep copy handling circular references, Maps, Sets, Dates, RegExps, TypedArrays. | `@kjangid/array-async-tools/deep-clone` |
| [`deepEqual`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#2-deep-equal) | Object | Recursive structural equality comparator for complex graphs, circular structures, Maps, Sets. | `@kjangid/array-async-tools/deep-equal` |
| [`objectDiff`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#3-object-diff) | Object | Computes structural differences returning added, removed, and updated fields. | `@kjangid/array-async-tools/object-diff` |
| [`objectClean`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#4-object-clean) | Object | Immutable cleaner filtering nulls, undefineds, empty strings, empty arrays, and empty objects. | `@kjangid/array-async-tools/object-clean` |
| [`chunk`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#5-chunk) | Array | Partitions arrays into uniform fixed-size batches for pagination and bulk requests. | `@kjangid/array-async-tools/chunk` |
| [`groupBy`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#6-group-by) | Array | Groups elements into a prototype-free record (`Object.create(null)`) or an ES6 Map. | `@kjangid/array-async-tools/group-by` |
| [`uniqueArray`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#7-unique-array) | Array | Deduplicates elements with primitive fast-paths, key selectors, or deep equality. | `@kjangid/array-async-tools/unique-array` |
| [`smartSort`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#8-smart-sort) | Array | Pure stable merge-sort supporting natural collation (`v2` before `v10`), dates, and null placement. | `@kjangid/array-async-tools/smart-sort` |
| [`debounce`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#9-debounce) | Async | Delays callback until quiet period passes with leading/trailing edges, `cancel()`, and `flush()`. | `@kjangid/array-async-tools/debounce` |
| [`throttle`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#10-throttle) | Async | Regulates execution frequency to at most once per time window with configurable edges. | `@kjangid/array-async-tools/throttle` |
| [`retry`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#11-retry) | Async | Retries async tasks with exponential/linear backoff, jitter, predicates, and `AbortSignal`. | `@kjangid/array-async-tools/retry` |
| [`promiseTimeout`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#12-promise-timeout) | Async | Enforces execution deadlines with custom errors, fallback handlers, and timer cleanup. | `@kjangid/array-async-tools/promise-timeout` |
| [`AsyncQueue`](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md#13-async-queue) | Async | Concurrency-limited worker queue with priority scheduling, pause/resume, and lifecycle hooks. | `@kjangid/array-async-tools/async-queue` |

---

## Standalone CLI Toolkit

The package includes a unified CLI executable `oa-tools` and dedicated command aliases:

```bash
# Display general help
oa-tools --help

# Chunk JSON array via piped stdin
cat users.json | oa-tools chunk --size 10

# Compare two JSON files for deep structural equality
oa-tools equal file1.json file2.json

# Check structural diff (exits with code 1 if differences found)
oa-tools diff old.json new.json --check

# Clean unwanted empty values from a payload
cat payload.json | oa-tools clean --empty-strings --empty-arrays

# Sort dataset naturally by a nested field
oa-tools sort dataset.json --by version --order asc

# Run shell command with retries and exponential backoff
oa-tools retry --retries 3 --delay 1000 -- curl -f https://api.example.com/health

# Enforce execution timeout on a command (milliseconds)
oa-tools timeout --ms 5000 -- npm test
```

### Binary Aliases

| Alias | Description |
|---|---|
| `oa-clone` | Deeply clone JSON input |
| `oa-diff` | Output structural differences |
| `oa-clean` | Remove null/empty fields |
| `oa-chunk` | Split array into chunks |
| `oa-sort` | Naturally sort array data |
| `oa-retry` | Run shell command with retries |
| `oa-timeout` | Enforce execution deadline on command |

### Exit Codes

- `0`: Success (or identical structures).
- `1`: Operation failure / Difference detected with `--check` / Command execution failed.
- `2`: CLI usage syntax error / Missing required parameters.

---

## Documentation

Comprehensive guides and technical documentation hosted on GitHub:

- [Features & API Reference](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/FEATURES.md): Detailed API signatures, option types, and examples for all 13 tools.
- [Architecture & Design](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/ARCHITECTURE.md): Module boundaries, memory models, and dual-bundle design.
- [Installation Guide](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/INSTALLATION.md): Setup for Node, Browsers, Bun, Deno, and Cloudflare Workers.
- [Limitations & Boundaries](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/LIMITATIONS.md): Recursion limits, non-cloneable types, and memory tradeoffs.
- [Testing & Quality Assurance](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/TESTING.md): Test matrix, coverage reports, and security attack test cases.
- [Deployment & CI/CD](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/DEPLOYMENT.md): Automated GitHub Actions pipeline and npm OIDC Trusted Publishing.
- [Contributing Guide](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/CONTRIBUTING.md): Local development workflow and npm development scripts.

---

## Limitations

- **Recursion Limits**: Functions with recursive traversals (`deepClone`, `deepEqual`, `objectDiff`, `objectClean`) are bounded by the engine's call stack (~8,000–10,000 levels).
- **Non-Cloneable Types**: In `deepClone`, functions, closures, promises, weak references (`WeakMap`/`WeakSet`), and DOM nodes are copied by reference.
- **Merge-Sort Auxiliary Memory**: `smartSort` implements a stable merge-sort ensuring immutability, requiring $O(N)$ temporary memory during sort operations.
- **Timer Clamping**: `debounce`, `throttle`, and `promiseTimeout` rely on platform timers subject to standard event-loop scheduling and tab-throttling constraints.
- See [Limitations Guide](https://github.com/kajangid/ObjectArrayAsyncTools/blob/main/docs/LIMITATIONS.md) for complete details.

---

## License

MIT © [Karan Jangid](https://github.com/kajangid)
