import { describe, it, expect } from 'vitest';
import { objectClean } from './index.js';

describe('objectClean', () => {
  it('removes null and undefined properties by default', () => {
    const input = {
      name: 'John',
      age: null,
      email: undefined,
      active: false,
      score: 0,
      notes: '',
    };
    const cleaned = objectClean(input);

    expect(cleaned).toEqual({
      name: 'John',
      active: false,
      score: 0,
      notes: '',
    });
  });

  it('preserves the original object (immutability)', () => {
    const original = { a: 1, b: null };
    const cleaned = objectClean(original);

    expect(cleaned).toEqual({ a: 1 });
    expect(original).toEqual({ a: 1, b: null });
  });

  it('cleans empty strings when emptyStrings is true', () => {
    const input = { a: 'hello', b: '', c: ' ' };
    const cleaned = objectClean(input, { emptyStrings: true });

    expect(cleaned).toEqual({ a: 'hello', c: ' ' });
  });

  it('cleans empty objects and empty arrays when configured', () => {
    const input = {
      name: 'Item',
      tags: [],
      metadata: {},
      populatedArray: [1],
      populatedObj: { k: 'v' },
    };

    const cleaned = objectClean(input, {
      emptyObjects: true,
      emptyArrays: true,
    });

    expect(cleaned).toEqual({
      name: 'Item',
      populatedArray: [1],
      populatedObj: { k: 'v' },
    });
  });

  it('cleans NaN values when nans is true', () => {
    const input = { val: NaN, ok: 10 };
    const cleaned = objectClean(input, { nans: true });

    expect(cleaned).toEqual({ ok: 10 });
  });

  it('cleans recursively when deep is true', () => {
    const input = {
      level1: {
        keep: 1,
        drop: null,
        level2: {
          str: '',
          drop2: undefined,
        },
      },
    };

    const cleaned = objectClean(input, { emptyStrings: true, deep: true });

    expect(cleaned).toEqual({
      level1: {
        keep: 1,
        level2: {},
      },
    });
  });

  it('cleans arrays when cleanArrays is true', () => {
    const input = [1, null, 'keep', undefined, 2];
    const cleaned = objectClean(input);

    expect(cleaned).toEqual([1, 'keep', 2]);
  });

  it('supports customFilter callback', () => {
    const input = { a: 10, b: 25, c: 5 };
    const cleaned = objectClean(input, {
      customFilter: (val) => typeof val === 'number' && val > 10,
    });

    expect(cleaned).toEqual({ b: 25 });
  });

  it('cleans objects with null prototype', () => {
    const nullProto = Object.create(null);
    nullProto.a = 1;
    nullProto.b = null;
    const cleaned = objectClean(nullProto);
    expect(cleaned.a).toBe(1);
    expect(cleaned.b).toBeUndefined();
    expect(Object.getPrototypeOf(cleaned)).toBeNull();
  });

  it('returns primitives and non-plain objects as-is', () => {
    expect(objectClean(42 as any)).toBe(42);
    expect(objectClean('str' as any)).toBe('str');
    const date = new Date();
    expect(objectClean(date)).toBe(date);
  });

  it('guards against prototype pollution', () => {
    const payload = JSON.parse('{"__proto__": {"bad": true}, "good": 1, "nil": null}');
    const cleaned = objectClean(payload);

    expect(cleaned).toEqual({ good: 1 });
    expect((cleaned as any).bad).toBeUndefined();
    expect((Object.prototype as any).bad).toBeUndefined();
  });
});
