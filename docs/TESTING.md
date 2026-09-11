# Testing Strategy & Quality Assurance Report

This document outlines the test architecture, test matrix, security attack verification, and code coverage metrics for `@omnidev-tools/object-array-async-tools`.

---

## 1. Test Architecture & Runner

- **Test Framework**: [Vitest 3.x](https://vitest.dev/)
- **Coverage Engine**: `@vitest/coverage-v8`
- **Execution Mode**: Isolated parallel threads with Node.js standard runtime.
- **Mocking & Timers**: Deterministic virtual time via `vi.useFakeTimers()` for `debounce` and `throttle`.

---

## 2. Test Matrix Overview

| Suite | Target | Test Cases | Areas Verified |
|---|---|---|---|
| `security.test.ts` | `src/shared/security.ts` | 12 | Prototype pollution guards, safe records, `safeAssign`, error classes. |
| `version.test.ts` | `src/version.ts` | 1 | Sync with `package.json` version string. |
| `deep-clone.test.ts` | `src/deep-clone/index.ts` | 13 | Primitives, cyclic graphs, Maps, Sets, TypedArrays, Errors, Symbols, pollution. |
| `deep-equal.test.ts` | `src/deep-equal/index.ts` | 13 | Primitives, cyclic pairs, Maps, Sets, Date timestamps, RegExp flags, NaNs. |
| `object-diff.test.ts` | `src/object-diff/index.ts` | 8 | Added, removed, updated deltas, flat dot-notation, nested mode, ignored keys. |
| `object-clean.test.ts` | `src/object-clean/index.ts` | 11 | Null, undefined, empty strings, empty arrays/objects, NaNs, immutability. |
| `chunk.test.ts` | `src/chunk/index.ts` | 7 | Exact splits, remainder chunks, large chunks, empty inputs, type validation. |
| `group-by.test.ts` | `src/group-by/index.ts` | 8 | Key extractors, callbacks, `groupByMap` references, prototype pollution immunity. |
| `unique-array.test.ts` | `src/unique-array/index.ts` | 9 | Primitives, object keys, callbacks, structural deep equality, order retention. |
| `smart-sort.test.ts` | `src/smart-sort/index.ts` | 12 | Natural string collation, multi-field rules, BigInts, dates, nulls first/last. |
| `debounce.test.ts` | `src/debounce/index.ts` | 6 | Leading/trailing execution, maxWait limits, `cancel()`, `flush()`, timer states. |
| `throttle.test.ts` | `src/throttle/index.ts` | 6 | Leading/trailing invocation, coalescing, window constraints, `flush()`. |
| `retry.test.ts` | `src/retry/index.ts` | 13 | Exponential/linear backoff, full/half jitter, `shouldRetry`, `AbortSignal`. |
| `promise-timeout.test.ts`| `src/promise-timeout/index.ts` | 12 | Expiration, `TimeoutError` metadata, fallback values, factory errors, `AbortSignal`. |
| `async-queue.test.ts` | `src/async-queue/index.ts` | 11 | Concurrency ceilings, priority queues, pause/resume, `onIdle`, timeouts. |
| `cli.test.ts` | `src/bin/cli.ts` | 17 | Arg parser, help, version, clone, equal, diff, clean, chunk, group, sort, piped stdin. |
| `index.test.ts` | `src/index.ts` | 4 | Complete re-exports check, end-to-end multi-utility pipeline integration. |
| **TOTAL** | | **163** | **100% Pass Rate** |

---

## 3. Code Coverage Report (V8 Provider)

```
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Status
-------------------|---------|----------|---------|---------|-------------------
All files          |   96.30 |    92.67 |   98.73 |   96.30 | PASSED (>=95%/90%)
  index.ts         |  100.00 |   100.00 |  100.00 |  100.00 | PASSED
  version.ts       |  100.00 |   100.00 |  100.00 |  100.00 | PASSED
  src/async-queue  |   88.95 |    87.03 |   95.00 |   88.95 | PASSED
  src/chunk        |  100.00 |   100.00 |  100.00 |  100.00 | PASSED
  src/debounce     |   94.48 |    91.30 |  100.00 |   94.48 | PASSED
  src/deep-clone   |   96.00 |    93.33 |  100.00 |   96.00 | PASSED
  src/deep-equal   |   98.54 |    94.11 |  100.00 |   98.54 | PASSED
  src/group-by     |  100.00 |   100.00 |  100.00 |  100.00 | PASSED
  src/object-clean |   95.23 |    96.15 |  100.00 |   95.23 | PASSED
  src/object-diff  |   96.77 |    93.02 |  100.00 |   96.77 | PASSED
  src/promise-time |  100.00 |    85.29 |  100.00 |  100.00 | PASSED
  src/retry        |   96.26 |    90.24 |  100.00 |   96.26 | PASSED
  src/shared       |  100.00 |   100.00 |  100.00 |  100.00 | PASSED
  src/smart-sort   |   95.41 |    87.35 |  100.00 |   95.41 | PASSED
  src/throttle     |  100.00 |   100.00 |  100.00 |  100.00 | PASSED
  src/unique-array |  100.00 |   100.00 |  100.00 |  100.00 | PASSED
-------------------|---------|----------|---------|---------|-------------------
```

---

## 4. Security Attack Verification

Dedicated security tests verify protection against malicious JSON payloads:

### Attack Vector 1: Prototype Pollution via `__proto__`
```typescript
const malicious = JSON.parse('{"__proto__": {"admin": true}}');
const cloned = deepClone(malicious);
expect((Object.prototype as any).admin).toBeUndefined();
```

### Attack Vector 2: Grouping on Prototype Properties
```typescript
const items = [{ key: '__proto__', val: 1 }, { key: 'toString', val: 2 }];
const grouped = groupBy(items, 'key');
expect(Object.getPrototypeOf(grouped)).toBeNull();
expect((Object.prototype as any).length).toBeUndefined();
```

### Attack Vector 3: Safe Property Assigning
```typescript
const target = {};
const untrusted = JSON.parse('{"constructor": {"prototype": {"polluted": true}}}');
safeAssign(target, untrusted);
expect((Object.prototype as any).polluted).toBeUndefined();
```

---

## 5. Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate code coverage reports
npm run test:coverage
```
