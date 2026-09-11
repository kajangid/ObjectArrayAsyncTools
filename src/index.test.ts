import { describe, it, expect } from 'vitest';
import * as oaTools from './index.js';

describe('Root package exports', () => {
  it('exports all 13 core utilities', () => {
    // 4 Object utilities
    expect(typeof oaTools.deepClone).toBe('function');
    expect(typeof oaTools.deepEqual).toBe('function');
    expect(typeof oaTools.objectDiff).toBe('function');
    expect(typeof oaTools.objectClean).toBe('function');

    // 4 Array utilities
    expect(typeof oaTools.chunk).toBe('function');
    expect(typeof oaTools.groupBy).toBe('function');
    expect(typeof oaTools.groupByMap).toBe('function');
    expect(typeof oaTools.uniqueArray).toBe('function');
    expect(typeof oaTools.smartSort).toBe('function');

    // 5 Async utilities
    expect(typeof oaTools.debounce).toBe('function');
    expect(typeof oaTools.throttle).toBe('function');
    expect(typeof oaTools.retry).toBe('function');
    expect(typeof oaTools.promiseTimeout).toBe('function');
    expect(typeof oaTools.AsyncQueue).toBe('function');
  });

  it('exports shared security utilities and error classes', () => {
    expect(typeof oaTools.createSafeRecord).toBe('function');
    expect(typeof oaTools.isDangerousKey).toBe('function');
    expect(typeof oaTools.safeHasOwn).toBe('function');
    expect(typeof oaTools.safeAssign).toBe('function');
    expect(typeof oaTools.safeSetProperty).toBe('function');

    expect(typeof oaTools.TimeoutError).toBe('function');
    expect(typeof oaTools.AbortError).toBe('function');
    expect(typeof oaTools.ValidationError).toBe('function');
    expect(typeof oaTools.QueueError).toBe('function');
  });

  it('exports version constant', () => {
    expect(typeof oaTools.VERSION).toBe('string');
  });

  it('runs an integrated pipeline using multiple utilities', async () => {
    const rawData = [
      { id: 3, name: 'Charlie', email: null, tags: ['c', 'a'] },
      { id: 1, name: 'Alice', email: 'alice@example.com', tags: ['a'] },
      { id: 2, name: 'Bob', email: undefined, tags: ['b', 'b'] },
      { id: 1, name: 'Alice Duplicate', email: 'alice@example.com', tags: ['a'] },
    ];

    // 1. Deduplicate by ID
    const deduped = oaTools.uniqueArray(rawData, 'id');
    expect(deduped).toHaveLength(3);

    // 2. Clean empty null/undefined fields
    const cleaned = deduped.map((item) => oaTools.objectClean(item));
    expect(cleaned[0].email).toBeUndefined();

    // 3. Sort by ID ascending
    const sorted = oaTools.smartSort(cleaned, 'id');
    expect(sorted.map((u) => u.id)).toEqual([1, 2, 3]);

    // 4. Chunk into batches of 2
    const batches = oaTools.chunk(sorted, 2);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(2);
    expect(batches[1]).toHaveLength(1);

    // 5. Process concurrently through AsyncQueue
    const queue = new oaTools.AsyncQueue({ concurrency: 2 });
    const processed = await queue.addAll(
      batches.map((batch) => async () => {
        return batch.map((item) => item.name);
      })
    );

    expect(processed).toEqual([['Alice', 'Bob'], ['Charlie']]);
  });
});
