import { describe, it, expect } from 'vitest';
import { deepClone } from './index.js';

describe('deepClone', () => {
  it('clones primitives unchanged', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
    expect(deepClone(100n)).toBe(100n);
    const sym = Symbol('sym');
    expect(deepClone(sym)).toBe(sym);
  });

  it('creates an independent copy of nested objects and arrays', () => {
    const original = {
      user: { name: 'Alice', scores: [10, 20, 30] },
      active: true,
    };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.user).not.toBe(original.user);
    expect(cloned.user.scores).not.toBe(original.user.scores);

    cloned.user.scores.push(40);
    expect(original.user.scores).toEqual([10, 20, 30]);
  });

  it('handles circular references safely', () => {
    interface Node {
      name: string;
      self?: Node;
      children: Node[];
    }
    const root: Node = { name: 'root', children: [] };
    root.self = root;
    const child: Node = { name: 'child', children: [] };
    child.self = root;
    root.children.push(child);

    const cloned = deepClone(root);
    expect(cloned.name).toBe('root');
    expect(cloned.self).toBe(cloned);
    expect(cloned.children[0].self).toBe(cloned);
    expect(cloned).not.toBe(root);
  });

  it('clones Date objects accurately', () => {
    const date = new Date('2025-01-01T12:00:00Z');
    const cloned = deepClone(date);
    expect(cloned).toBeInstanceOf(Date);
    expect(cloned.getTime()).toBe(date.getTime());
    expect(cloned).not.toBe(date);
  });

  it('clones RegExp with flags and lastIndex', () => {
    const regex = /test\d+/gim;
    regex.lastIndex = 3;
    const cloned = deepClone(regex);
    expect(cloned).toBeInstanceOf(RegExp);
    expect(cloned.source).toBe(regex.source);
    expect(cloned.flags).toBe(regex.flags);
    expect(cloned.lastIndex).toBe(3);
    expect(cloned).not.toBe(regex);
  });

  it('clones Map and Set with complex elements', () => {
    const map = new Map<any, any>();
    const keyObj = { id: 1 };
    map.set(keyObj, { value: 'meta' });

    const set = new Set<any>([{ id: 2 }, 'string', 99]);

    const clonedMap = deepClone(map);
    const clonedSet = deepClone(set);

    expect(clonedMap.size).toBe(1);
    expect(clonedSet.size).toBe(3);

    // Verify cloned keys inside map are independent
    const [clonedKey] = Array.from(clonedMap.keys());
    expect(clonedKey).toEqual(keyObj);
    expect(clonedKey).not.toBe(keyObj);

    // Verify Set items
    const [setFirst] = Array.from(clonedSet);
    expect(setFirst).toEqual({ id: 2 });
    expect(setFirst).not.toBe(Array.from(set)[0]);
  });

  it('clones ArrayBuffer, DataView, and TypedArrays', () => {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setInt32(0, 123456);

    const uint8 = new Uint8Array([1, 2, 3, 4]);
    const float64 = new Float64Array([1.5, 2.5]);

    const clonedBuffer = deepClone(buffer);
    const clonedView = deepClone(view);
    const clonedUint8 = deepClone(uint8);
    const clonedFloat64 = deepClone(float64);

    expect(new DataView(clonedBuffer).getInt32(0)).toBe(123456);
    expect(clonedBuffer).not.toBe(buffer);

    expect(clonedView.getInt32(0)).toBe(123456);
    expect(clonedView).not.toBe(view);

    expect(clonedUint8).toEqual(uint8);
    expect(clonedUint8).not.toBe(uint8);
    expect(clonedUint8.buffer).not.toBe(uint8.buffer);

    expect(clonedFloat64).toEqual(float64);
    expect(clonedFloat64).not.toBe(float64);
  });

  it('clones Error objects with cause and stack', () => {
    const cause = new Error('root cause');
    const err = new Error('high-level failure', { cause });
    const cloned = deepClone(err);

    expect(cloned).toBeInstanceOf(Error);
    expect(cloned.message).toBe('high-level failure');
    expect((cloned as any).cause).toBeInstanceOf(Error);
    expect((cloned as any).cause.message).toBe('root cause');
    expect(cloned).not.toBe(err);
  });

  it('preserves Symbol-keyed properties', () => {
    const sym = Symbol('meta');
    const obj = { [sym]: 'secret', standard: 10 };
    const cloned = deepClone(obj);

    expect(cloned[sym]).toBe('secret');
    expect(cloned.standard).toBe(10);
  });

  it('handles sparse arrays', () => {
    const sparse: any[] = [];
    sparse[2] = 'value';
    const cloned = deepClone(sparse);

    expect(cloned.length).toBe(3);
    expect(0 in cloned).toBe(false);
    expect(1 in cloned).toBe(false);
    expect(cloned[2]).toBe('value');
  });

  it('supports customCloner option', () => {
    class CustomEntity {
      constructor(public val: number) {}
    }

    const obj = {
      entity: new CustomEntity(42),
      other: 10,
    };

    const cloned = deepClone(obj, {
      customCloner(val) {
        if (val instanceof CustomEntity) {
          return new CustomEntity(val.val * 2);
        }
        return undefined;
      },
    });

    expect(cloned.entity.val).toBe(84);
    expect(cloned.other).toBe(10);
  });

  it('prevents prototype pollution attacks', () => {
    const maliciousPayload = JSON.parse('{"__proto__": {"injected": "dangerous"}, "ok": true}');
    const cloned = deepClone(maliciousPayload);

    expect(cloned.ok).toBe(true);
    expect((cloned as any).injected).toBeUndefined();
    expect((Object.prototype as any).injected).toBeUndefined();
  });

  it('respects protoStrategy option', () => {
    const obj = { a: 1 };
    const clonedNull = deepClone(obj, { protoStrategy: 'null' });
    expect(Object.getPrototypeOf(clonedNull)).toBeNull();

    const clonedPreserve = deepClone(obj, { protoStrategy: 'preserve' });
    expect(Object.getPrototypeOf(clonedPreserve)).toBe(Object.prototype);
  });
});
