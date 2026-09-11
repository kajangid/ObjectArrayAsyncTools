import { describe, it, expect } from 'vitest';
import { deepEqual } from './index.js';

describe('deepEqual', () => {
  it('compares primitives correctly', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(10n, 10n)).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);

    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(1, '1')).toBe(false);
  });

  it('handles +0 and -0 according to looseZeros option', () => {
    expect(deepEqual(+0, -0, { looseZeros: true })).toBe(true);
    expect(deepEqual(+0, -0, { looseZeros: false })).toBe(false);
  });

  it('compares nested plain objects', () => {
    const objA = { user: { name: 'Alice', age: 30 }, active: true };
    const objB = { user: { name: 'Alice', age: 30 }, active: true };
    const objC = { user: { name: 'Alice', age: 31 }, active: true };
    const objD = { user: { name: 'Alice' }, active: true };

    expect(deepEqual(objA, objB)).toBe(true);
    expect(deepEqual(objA, objC)).toBe(false);
    expect(deepEqual(objA, objD)).toBe(false);
  });

  it('compares arrays and nested arrays', () => {
    expect(deepEqual([1, [2, 3], 4], [1, [2, 3], 4])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it('handles circular references', () => {
    const a: any = { name: 'cycle' };
    a.self = a;
    const b: any = { name: 'cycle' };
    b.self = b;

    expect(deepEqual(a, b)).toBe(true);

    const c: any = { name: 'different' };
    c.self = c;
    expect(deepEqual(a, c)).toBe(false);
  });

  it('compares Date objects', () => {
    const d1 = new Date('2025-01-01T00:00:00Z');
    const d2 = new Date('2025-01-01T00:00:00Z');
    const d3 = new Date('2025-01-02T00:00:00Z');
    const inv1 = new Date('invalid');
    const inv2 = new Date('invalid');

    expect(deepEqual(d1, d2)).toBe(true);
    expect(deepEqual(d1, d3)).toBe(false);
    expect(deepEqual(inv1, inv2)).toBe(true);
  });

  it('compares RegExp objects', () => {
    expect(deepEqual(/abc/gi, /abc/gi)).toBe(true);
    expect(deepEqual(/abc/g, /abc/i)).toBe(false);
    expect(deepEqual(/abc/g, /def/g)).toBe(false);
  });

  it('compares Maps and Sets', () => {
    const map1 = new Map([[{ id: 1 }, 'val']]);
    const map2 = new Map([[{ id: 1 }, 'val']]);
    const map3 = new Map([[{ id: 2 }, 'val']]);

    expect(deepEqual(map1, map2)).toBe(true);
    expect(deepEqual(map1, map3)).toBe(false);

    const set1 = new Set([{ id: 1 }, 'test']);
    const set2 = new Set([{ id: 1 }, 'test']);
    const set3 = new Set([{ id: 2 }, 'test']);

    expect(deepEqual(set1, set2)).toBe(true);
    expect(deepEqual(set1, set3)).toBe(false);
  });

  it('compares TypedArrays and ArrayBuffers', () => {
    const u1 = new Uint8Array([1, 2, 3]);
    const u2 = new Uint8Array([1, 2, 3]);
    const u3 = new Uint8Array([1, 2, 4]);
    const i1 = new Int8Array([1, 2, 3]);

    expect(deepEqual(u1, u2)).toBe(true);
    expect(deepEqual(u1, u3)).toBe(false);
    expect(deepEqual(u1, i1)).toBe(false);

    const b1 = new ArrayBuffer(4);
    const b2 = new ArrayBuffer(4);
    const b3 = new ArrayBuffer(8);
    expect(deepEqual(b1, b2)).toBe(true);
    expect(deepEqual(b1, b3)).toBe(false);

    const dv1 = new DataView(b1);
    const dv2 = new DataView(b2);
    expect(deepEqual(dv1, dv2)).toBe(true);
  });

  it('compares Error instances', () => {
    const err1 = new Error('boom', { cause: new Error('low-level') });
    const err2 = new Error('boom', { cause: new Error('low-level') });
    const err3 = new Error('boom', { cause: new Error('different') });

    expect(deepEqual(err1, err2)).toBe(true);
    expect(deepEqual(err1, err3)).toBe(false);
  });

  it('supports custom comparator', () => {
    const a = { date: '2025-01-01' };
    const b = { date: new Date('2025-01-01T00:00:00.000Z') };

    const areEqual = deepEqual(a, b, {
      customComparator(x, y) {
        if (typeof x === 'string' && y instanceof Date) {
          return new Date(x).getTime() === y.getTime();
        }
        return undefined;
      },
    });

    expect(areEqual).toBe(true);
  });

  it('respects strictTypes option', () => {
    const objNormal = { a: 1 };
    const objNull = Object.create(null);
    objNull.a = 1;

    expect(deepEqual(objNormal, objNull, { strictTypes: false })).toBe(true);
    expect(deepEqual(objNormal, objNull, { strictTypes: true })).toBe(false);
  });

  it('handles symbol-keyed properties', () => {
    const sym = Symbol('id');
    const a = { [sym]: 1, name: 'item' };
    const b = { [sym]: 1, name: 'item' };
    const c = { [sym]: 2, name: 'item' };

    expect(deepEqual(a, b)).toBe(true);
    expect(deepEqual(a, c)).toBe(false);
    expect(deepEqual(a, c, { ignoreSymbolKeys: true })).toBe(true);
  });
});
