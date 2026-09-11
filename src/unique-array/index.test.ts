import { describe, it, expect } from 'vitest';
import { uniqueArray } from './index.js';

describe('uniqueArray', () => {
  it('removes duplicate primitive values while preserving order', () => {
    const input = [1, 2, 2, 3, 4, 3, 1, 5];
    expect(uniqueArray(input)).toEqual([1, 2, 3, 4, 5]);
  });

  it('removes duplicate strings and booleans', () => {
    expect(uniqueArray(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    expect(uniqueArray([true, false, true, false])).toEqual([true, false]);
  });

  it('deduplicates objects by property key', () => {
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 1, name: 'Alice (duplicate)' },
      { id: 3, name: 'Charlie' },
    ];

    expect(uniqueArray(users, 'id')).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
  });

  it('deduplicates objects using a selector callback', () => {
    const items = [
      { code: 'A', group: 1 },
      { code: 'B', group: 2 },
      { code: 'a', group: 1 },
    ];

    const result = uniqueArray(items, (item) => item.code.toLowerCase());
    expect(result).toEqual([
      { code: 'A', group: 1 },
      { code: 'B', group: 2 },
    ]);
  });

  it('deduplicates using structural deep equality', () => {
    const data = [
      { coord: { x: 1, y: 2 } },
      { coord: { x: 3, y: 4 } },
      { coord: { x: 1, y: 2 } },
    ];

    const result = uniqueArray(data, { deep: true });
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { coord: { x: 1, y: 2 } },
      { coord: { x: 3, y: 4 } },
    ]);
  });

  it('deduplicates using structural deep equality with property key and callback', () => {
    const data = [
      { meta: { version: '1.0' }, id: 1 },
      { meta: { version: '2.0' }, id: 2 },
      { meta: { version: '1.0' }, id: 3 },
    ];

    const resultProp = uniqueArray(data, { by: 'meta', deep: true });
    expect(resultProp).toHaveLength(2);
    expect(resultProp[0].id).toBe(1);
    expect(resultProp[1].id).toBe(2);

    const resultCb = uniqueArray(data, { by: (item) => item.meta, deep: true });
    expect(resultCb).toHaveLength(2);
  });

  it('preserves the original array (immutability)', () => {
    const original = [1, 2, 2];
    const unique = uniqueArray(original);
    expect(unique).toEqual([1, 2]);
    expect(original).toEqual([1, 2, 2]);
  });

  it('handles empty and single-element arrays', () => {
    expect(uniqueArray([])).toEqual([]);
    expect(uniqueArray([42])).toEqual([42]);
  });

  it('throws TypeError for non-array inputs', () => {
    expect(() => uniqueArray(null as any)).toThrow(TypeError);
    expect(() => uniqueArray(123 as any)).toThrow(TypeError);
  });
});
