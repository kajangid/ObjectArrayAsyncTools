# Features & API Reference Manual

Complete API documentation, type signatures, parameter specifications, and code examples for all 13 tools, the compile-time `VERSION` constant, and CLI commands in `@omnidev-tools/object-array-async-tools`.

---

## Table of Contents

- [1. deep-clone](#1-deep-clone)
- [2. deep-equal](#2-deep-equal)
- [3. object-diff](#3-object-diff)
- [4. object-clean](#4-object-clean)
- [5. chunk](#5-chunk)
- [6. group-by](#6-group-by)
- [7. unique-array](#7-unique-array)
- [8. smart-sort](#8-smart-sort)
- [9. debounce](#9-debounce)
- [10. throttle](#10-throttle)
- [11. retry](#11-retry)
- [12. promise-timeout](#12-promise-timeout)
- [13. async-queue](#13-async-queue)
- [14. VERSION Constant](#14-version-constant)
- [15. Standalone CLI Commands](#15-standalone-cli-commands)

---

## 1. deep-clone

Creates a fully independent clone of nested objects and arrays. Handles circular references, Maps, Sets, Dates, RegExps, TypedArrays, ArrayBuffers, Errors, and Symbol keys while neutralizing prototype pollution vectors.

### Signature
```typescript
function deepClone<T>(value: T, options?: DeepCloneOptions): T;
```

### Options
```typescript
interface DeepCloneOptions {
  protoStrategy?: 'safe' | 'null' | 'preserve'; // Default: 'safe'
  customCloner?: (value: unknown) => unknown | undefined;
}
```

### Example
```typescript
import { deepClone } from '@omnidev-tools/object-array-async-tools/deep-clone';

const user = {
  name: 'Alice',
  joined: new Date('2024-01-01'),
  metadata: new Map([['role', 'admin']]),
  scores: new Uint8Array([95, 88, 92]),
};

const copy = deepClone(user);
copy.metadata.set('role', 'superadmin');

console.log(user.metadata.get('role')); // 'admin' (original is unchanged)
```

---

## 2. deep-equal

Recursively compares two entities to determine whether their structural content and nested values are identical.

### Signature
```typescript
function deepEqual(a: unknown, b: unknown, options?: DeepEqualOptions): boolean;
```

### Options
```typescript
interface DeepEqualOptions {
  strictTypes?: boolean;       // If true, prototype mismatch returns false (Default: false)
  ignoreSymbolKeys?: boolean;  // Default: false
  looseZeros?: boolean;        // Treats +0 and -0 as equal (Default: true)
  customComparator?: (a: unknown, b: unknown) => boolean | undefined;
}
```

### Example
```typescript
import { deepEqual } from '@omnidev-tools/object-array-async-tools/deep-equal';

const obj1 = { tags: new Set(['alpha', 'beta']), created: new Date(1000) };
const obj2 = { tags: new Set(['alpha', 'beta']), created: new Date(1000) };

console.log(deepEqual(obj1, obj2)); // true
```

---

## 3. object-diff

Computes the precise delta between two objects, identifying added, removed, and modified properties.

### Signature
```typescript
function objectDiff<T extends Record<string, any>>(
  before: T | null | undefined,
  after: T | null | undefined,
  options?: ObjectDiffOptions
): ObjectDiffResult;
```

### Options & Result Types
```typescript
interface ObjectDiffOptions {
  deep?: boolean;              // Default: true
  mode?: 'flat' | 'nested';    // Default: 'flat'
  ignoreKeys?: PropertyKey[];
}

interface ObjectDiffResult {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  updated: Record<string, { before: unknown; after: unknown }>;
  hasChanges: boolean;
}
```

### Example
```typescript
import { objectDiff } from '@omnidev-tools/object-array-async-tools/object-diff';

const oldSettings = { theme: 'light', font: { size: 14, family: 'sans' }, debug: false };
const newSettings = { theme: 'dark', font: { size: 16, family: 'sans' } };

const diff = objectDiff(oldSettings, newSettings);
/*
{
  added: {},
  removed: { debug: false },
  updated: {
    theme: { before: 'light', after: 'dark' },
    'font.size': { before: 14, after: 16 }
  },
  hasChanges: true
}
*/
```

---

## 4. object-clean

Removes empty, undefined, null, or unwanted values from an object or array. Produces a new cleaned structure without mutating the original input.

### Signature
```typescript
function objectClean<T>(target: T, options?: ObjectCleanOptions): T;
```

### Options
```typescript
interface ObjectCleanOptions {
  nulls?: boolean;         // Default: true
  undefineds?: boolean;    // Default: true
  emptyStrings?: boolean;  // Default: false
  emptyObjects?: boolean;  // Default: false
  emptyArrays?: boolean;   // Default: false
  nans?: boolean;          // Default: false
  deep?: boolean;          // Default: true
  cleanArrays?: boolean;   // Default: true
  customFilter?: (value: unknown, key: PropertyKey) => boolean;
}
```

### Example
```typescript
import { objectClean } from '@omnidev-tools/object-array-async-tools/object-clean';

const payload = {
  title: 'Report',
  author: null,
  tags: [],
  notes: '',
  meta: { views: undefined, draft: false }
};

const cleaned = objectClean(payload, {
  emptyStrings: true,
  emptyArrays: true,
});

// Output: { title: 'Report', meta: { draft: false } }
```

---

## 5. chunk

Splits an array into smaller arrays (chunks) of a specified length.

### Signature
```typescript
function chunk<T>(array: readonly T[], size: number): T[][];
```

### Example
```typescript
import { chunk } from '@omnidev-tools/object-array-async-tools/chunk';

const items = [1, 2, 3, 4, 5, 6, 7];
const chunks = chunk(items, 3);
// [[1, 2, 3], [4, 5, 6], [7]]
```

---

## 6. group-by

Groups elements of an array by a property key or extractor callback. Returns an `Object.create(null)` prototype-less dictionary or an ES6 `Map`.

### Signatures
```typescript
function groupBy<T, K extends PropertyKey = PropertyKey>(
  items: readonly T[],
  keySelector: ((item: T, index: number) => K) | keyof T
): Record<K, T[]>;

function groupByMap<T, K>(
  items: readonly T[],
  keySelector: ((item: T, index: number) => K) | keyof T
): Map<K, T[]>;
```

### Example
```typescript
import { groupBy, groupByMap } from '@omnidev-tools/object-array-async-tools/group-by';

const inventory = [
  { name: 'Apple', type: 'fruit' },
  { name: 'Carrot', type: 'vegetable' },
  { name: 'Banana', type: 'fruit' }
];

const byType = groupBy(inventory, 'type');
// byType.fruit -> [{ name: 'Apple', ... }, { name: 'Banana', ... }]
```

---

## 7. unique-array

Removes duplicate values or objects from an array, retaining the original first-seen order.

### Signature
```typescript
function uniqueArray<T>(
  array: readonly T[],
  identityOrOptions?: ((item: T, index: number) => unknown) | keyof T | UniqueArrayOptions<T>
): T[];
```

### Options
```typescript
interface UniqueArrayOptions<T> {
  by?: ((item: T, index: number) => unknown) | keyof T;
  deep?: boolean; // Uses deep structural equality (Default: false)
}
```

### Example
```typescript
import { uniqueArray } from '@omnidev-tools/object-array-async-tools/unique-array';

// Primitives
uniqueArray([1, 2, 1, 3, 2]); // [1, 2, 3]

// By Property
const users = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 1, name: 'A (alt)' }];
uniqueArray(users, 'id'); // [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]

// By Deep Structural Equality
const coordinates = [{ pos: { x: 0, y: 0 } }, { pos: { x: 0, y: 0 } }];
uniqueArray(coordinates, { deep: true }); // [{ pos: { x: 0, y: 0 } }]
```

---

## 8. smart-sort

Flexible, multi-field sorting utility with support for natural string collation, Dates, BigInts, and custom null placement.

### Signature
```typescript
function smartSort<T>(array: readonly T[], criteria?: SortCriteria<T>): T[];
```

### Criteria Types
```typescript
interface SortRule<T> {
  by?: keyof T | ((item: T) => unknown);
  order?: 'asc' | 'desc'; // Default: 'asc'
  natural?: boolean;       // Natural string sorting (Default: true)
  nulls?: 'first' | 'last';// Default: 'last'
}
```

### Example
```typescript
import { smartSort } from '@omnidev-tools/object-array-async-tools/smart-sort';

// Natural version string sorting
const releases = ['v10.0.0', 'v2.0.0', 'v1.5.0'];
smartSort(releases); // ['v1.5.0', 'v2.0.0', 'v10.0.0']

// Multi-field object sorting
const employees = [
  { dept: 'sales', score: 85 },
  { dept: 'eng', score: 92 },
  { dept: 'sales', score: 90 }
];

smartSort(employees, [
  { by: 'dept', order: 'asc' },
  { by: 'score', order: 'desc' }
]);
```

---

## 9. debounce

Delays function execution until `waitMs` milliseconds have passed since the last invocation.

### Signature
```typescript
function debounce<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  waitMs: number,
  options?: DebounceOptions
): DebouncedFunction<Args, R>;
```

### Options & Methods
```typescript
interface DebounceOptions {
  leading?: boolean;  // Default: false
  trailing?: boolean; // Default: true
  maxWait?: number;
}

interface DebouncedFunction<Args extends unknown[], R> {
  (...args: Args): R | undefined;
  cancel(): void;
  flush(): R | undefined;
  isPending(): boolean;
  pending(): boolean;
}
```

### Example
```typescript
import { debounce } from '@omnidev-tools/object-array-async-tools/debounce';

const onSearch = debounce((query: string) => {
  fetchSearchResults(query);
}, 300, { maxWait: 1000 });

onSearch('t');
onSearch('ts');
onSearch('tsup'); // Only executed after 300ms of inactivity
```

---

## 10. throttle

Restricts callback execution frequency to at most once per every `waitMs` window.

### Signature
```typescript
function throttle<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  waitMs: number,
  options?: ThrottleOptions
): ThrottledFunction<Args, R>;
```

### Options
```typescript
interface ThrottleOptions {
  leading?: boolean;  // Default: true
  trailing?: boolean; // Default: true
}
```

### Example
```typescript
import { throttle } from '@omnidev-tools/object-array-async-tools/throttle';

const onScroll = throttle((position: number) => {
  updateScrollIndicator(position);
}, 100);
```

---

## 11. retry

Executes an asynchronous function with automated retries, backoff rate algorithms, random jitter, and cancellation control.

### Signature
```typescript
function retry<T>(
  fn: (context: RetryContext) => Promise<T> | T,
  options?: RetryOptions
): Promise<T>;
```

### Options
```typescript
interface RetryOptions {
  retries?: number;                                 // Default: 3
  delay?: number | ((attempt: number) => number);  // Default: 1000
  backoff?: 'fixed' | 'exponential' | 'linear';    // Default: 'exponential'
  factor?: number;                                 // Default: 2
  jitter?: boolean | 'full' | 'half';              // Default: false
  maxDelay?: number;                               // Default: Infinity
  shouldRetry?: (error: unknown, context: RetryContext) => boolean | Promise<boolean>;
  onRetry?: (error: unknown, context: RetryContext, nextDelayMs: number) => void | Promise<void>;
  signal?: AbortSignal;
}
```

### Example
```typescript
import { retry } from '@omnidev-tools/object-array-async-tools/retry';

const response = await retry(
  async ({ attempt, retriesLeft }) => {
    return await fetchApiData();
  },
  {
    retries: 4,
    backoff: 'exponential',
    factor: 2,
    jitter: 'full',
    shouldRetry: (err) => !isClientError(err),
    onRetry: (err, ctx, delay) => {
      console.warn(`Attempt ${ctx.attempt} failed. Retrying in ${delay}ms...`);
    }
  }
);
```

---

## 12. promise-timeout

Wraps a promise or promise-returning factory with a deadline. Rejects with `TimeoutError` or resolves with a fallback value upon expiration.

### Signature
```typescript
function promiseTimeout<T>(
  promiseOrFactory: Promise<T> | (() => Promise<T>),
  ms: number,
  options?: TimeoutOptions<T>
): Promise<T>;
```

### Options
```typescript
interface TimeoutOptions<T> {
  fallback?: () => Promise<T> | T;
  customError?: Error | (() => Error);
  message?: string;
  signal?: AbortSignal;
}
```

### Example
```typescript
import { promiseTimeout } from '@omnidev-tools/object-array-async-tools/promise-timeout';

try {
  const data = await promiseTimeout(fetchRemoteConfig(), 2500, {
    fallback: () => ({ cached: true })
  });
} catch (err) {
  if (err instanceof TimeoutError) {
    console.error(`Config request timed out after ${err.timeoutMs}ms`);
  }
}
```

---

## 13. async-queue

Controls concurrent execution of asynchronous operations with priority scheduling, dynamic concurrency limits, pausing, and lifecycle events.

### Class Definition
```typescript
class AsyncQueue {
  constructor(options?: AsyncQueueOptions);

  concurrency: number;
  readonly size: number;
  readonly pending: number;
  readonly isPaused: boolean;

  add<T>(task: () => Promise<T> | T, options?: TaskOptions): Promise<T>;
  addAll<T>(tasks: Array<() => Promise<T> | T>, options?: TaskOptions): Promise<T[]>;
  pause(): void;
  resume(): void;
  clear(): void;
  onEmpty(): Promise<void>;
  onIdle(): Promise<void>;
}
```

### Example
```typescript
import { AsyncQueue } from '@omnidev-tools/object-array-async-tools/async-queue';

const queue = new AsyncQueue({ concurrency: 3 });

// High priority task skips ahead in queue
queue.add(async () => syncCriticalLog(), { priority: 10 });

// Normal batch tasks
const jobs = imageIds.map((id) => () => processImage(id));
await queue.addAll(jobs);

// Wait until all executing tasks and queued tasks have completed
await queue.onIdle();
console.log('All image processing complete!');
```

---

## 14. VERSION Constant

The compile-time package version string synchronized directly from `package.json` as the single source of truth.

### Usage
```typescript
import { VERSION } from '@omnidev-tools/object-array-async-tools';

console.log(`Current version: ${VERSION}`); // e.g. "1.0.0"
```

---

## 15. Standalone CLI Commands

The package provides the unified executable `oa-tools` along with individual binary aliases:

| Command / Alias | Arguments & Flags | Description |
|---|---|---|
| `oa-tools clone` / `oa-clone` | `[file]` | Deep-clones input JSON from file or piped stdin. |
| `oa-tools equal` | `<file1> <file2>` | Evaluates deep equality between two JSON files (exits 0 if equal, 1 if not). |
| `oa-tools diff` / `oa-diff` | `<file1> [file2] [--deep] [--check]` | Generates structural diff. If `--check`, exits with code 1 when deltas are detected. |
| `oa-tools clean` / `oa-clean` | `[file] [--empty-strings] [--empty-objects] [--empty-arrays] [--nans]` | Removes empty/nullish values from JSON input. |
| `oa-tools chunk` / `oa-chunk` | `[file] --size <n>` | Splits input JSON array into smaller chunks of size `n`. |
| `oa-tools group` | `[file] --by <property>` | Groups array of objects by property key. |
| `oa-tools unique` | `[file] [--by <property>] [--deep]` | Removes duplicate elements from JSON array. |
| `oa-tools sort` / `oa-sort` | `[file] [--by <property>] [--order asc\|desc] [--no-natural]` | Sorts JSON array elements with natural string collation. |
| `oa-tools retry` / `oa-retry` | `[--retries <n>] [--delay <ms>] [--backoff exponential\|linear\|fixed] -- <cmd...>` | Retries shell command execution upon non-zero exit codes. |
| `oa-tools timeout` / `oa-timeout`| `--ms <ms> -- <cmd...>` | Executes a command with deadline timeout, terminating process if deadline is exceeded. |
| `--version` / `-v` | N/A | Prints package version directly to stdout. |
| `--help` / `-h` | N/A | Displays full CLI usage instructions and command summaries. |
