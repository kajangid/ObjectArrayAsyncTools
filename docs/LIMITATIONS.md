# Operational Boundaries & System Limitations

This document outlines the performance boundaries, runtime constraints, edge-case behaviors, and memory considerations for `@omnidev-tools/object-array-async-tools`.

---

## 1. Recursion Depth & Call Stack Limits

Utilities performing recursive traversals (`deepClone`, `deepEqual`, `objectDiff`, `objectClean`):
- **Mechanism**: Use standard recursive function calls.
- **Engine Limit**: In V8 (Node.js/Chrome), JavaScriptCore (Safari), and SpiderMonkey (Firefox), call stack depth is typically limited to ~10,000 frames.
- **Limitation**: Objects with nesting depth exceeding ~8,000 levels may trigger `RangeError: Maximum call stack size exceeded`.
- **Mitigation**: Standard business data and API payloads rarely exceed 20–50 levels of nesting. For deeply nested linked lists, convert to flat arrays prior to processing.

---

## 2. Non-Cloneable Types & References in `deepClone`

`deepClone` faithfully replicates all standard ECMAScript built-in data types (`Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, `DataView`, TypedArrays, `Error`, plain objects, and primitive wrappers). However, certain platform-specific references cannot be meaningfully duplicated:
- **Functions & Closures**: Functions are returned by reference. Re-instantiating function closures without access to parent lexical scopes is not possible in ECMAScript.
- **Ephemeral State Types**: Instances of `WeakMap`, `WeakSet`, `Promise`, and `FinalizationRegistry` cannot be inspected or iterated by design, and are returned by reference.
- **DOM / Platform Handles**: File handles, sockets, `ReadableStream`, and DOM elements are preserved by reference. Use `customCloner` if custom instantiation is required.

---

## 3. Large Array & Memory Tradeoffs

- **`chunk` & `uniqueArray`**:
  - Max Array Size: JavaScript arrays support up to $2^{32} - 1$ ($4,294,967,295$) elements. In practice, V8 heap limits (typically 1.4GB to 4GB depending on `--max-old-space-size`) constrain array allocations.
  - Slicing an array of 5,000,000 items creates shallow chunk references and does not duplicate underlying element values.
- **`smartSort` Memory Footprint**:
  - `smartSort` implements a stable merge-sort ensuring complete immutability. Merge-sort requires $O(N)$ additional memory during the merge step.
  - Sorting an array of 1,000,000 objects creates temporary slice arrays. For multi-gigabyte datasets, stream-based disk sorting is recommended.

---

## 4. Timer Resolution & Event-Loop Drift

In `debounce`, `throttle`, `retry`, and `promiseTimeout`:
- **Timer Clamping**: According to HTML5 and Node.js timer specifications, nested `setTimeout` calls may be clamped to minimum intervals (typically 1ms in Node.js, 4ms in active browser tabs, and up to 1000ms in backgrounded browser tabs).
- **Event-Loop Delay**: If the JavaScript main thread is blocked by heavy synchronous CPU computations, timers will be delayed until the call stack clears. Real-time sub-millisecond precision is not guaranteed.

---

## 5. CLI JSON Serialization Constraints

The standalone CLI (`oa-tools`) communicates via standard JSON over stdin/stdout:
- **BigInt & Circular Data**: Standard `JSON.stringify` does not support `BigInt` or circular graphs. Passing circular JSON files to `oa-tools clone` will produce a CLI error.
- **Loss of Special Types**: Special types like `Date` or `RegExp` passed to the CLI will be parsed as ISO strings or empty objects according to standard JSON parsing rules.
