import { describe, it, expect } from 'vitest';
import { objectDiff } from './index.js';

describe('objectDiff', () => {
  it('detects added, removed, and updated fields on flat objects', () => {
    const before = { a: 1, b: 2, c: 3 };
    const after = { b: 20, c: 3, d: 4 };

    const diff = objectDiff(before, after);

    expect(diff.hasChanges).toBe(true);
    expect(diff.added).toEqual({ d: 4 });
    expect(diff.removed).toEqual({ a: 1 });
    expect(diff.updated).toEqual({ b: { before: 2, after: 20 } });
  });

  it('returns hasChanges = false when objects are identical', () => {
    const a = { x: [1, 2], y: 'hello', z: { n: true } };
    const b = { x: [1, 2], y: 'hello', z: { n: true } };

    const diff = objectDiff(a, b);
    expect(diff.hasChanges).toBe(false);
    expect(Object.keys(diff.added)).toHaveLength(0);
    expect(Object.keys(diff.removed)).toHaveLength(0);
    expect(Object.keys(diff.updated)).toHaveLength(0);
  });

  it('handles nested objects in flat mode (default)', () => {
    const before = {
      user: {
        name: 'Alice',
        settings: { theme: 'light', notifications: true },
      },
    };
    const after = {
      user: {
        name: 'Alice',
        settings: { theme: 'dark', sound: false },
      },
    };

    const diff = objectDiff(before, after);

    expect(diff.hasChanges).toBe(true);
    expect(diff.added).toEqual({ 'user.settings.sound': false });
    expect(diff.removed).toEqual({ 'user.settings.notifications': true });
    expect(diff.updated).toEqual({
      'user.settings.theme': { before: 'light', after: 'dark' },
    });
  });

  it('handles nested objects in nested mode', () => {
    const before = { user: { name: 'Bob', age: 25 } };
    const after = { user: { name: 'Bob', age: 26, role: 'admin' } };

    const diff = objectDiff(before, after, { mode: 'nested' });

    expect(diff.hasChanges).toBe(true);
    expect(diff.updated.user.updated).toEqual({ age: { before: 25, after: 26 } });
    expect(diff.updated.user.added).toEqual({ role: 'admin' });
  });

  it('respects shallow diff when deep = false', () => {
    const before = { profile: { status: 'offline' } };
    const after = { profile: { status: 'online' } };

    const diff = objectDiff(before, after, { deep: false });

    expect(diff.hasChanges).toBe(true);
    expect(diff.updated.profile).toEqual({
      before: { status: 'offline' },
      after: { status: 'online' },
    });
  });

  it('ignores specified keys', () => {
    const before = { id: 1, updatedAt: '2025-01-01', val: 10 };
    const after = { id: 1, updatedAt: '2025-01-02', val: 20 };

    const diff = objectDiff(before, after, { ignoreKeys: ['updatedAt'] });

    expect(diff.hasChanges).toBe(true);
    expect(diff.updated).toEqual({ val: { before: 10, after: 20 } });
    expect(diff.updated.updatedAt).toBeUndefined();
  });

  it('handles null and undefined safely', () => {
    const diff = objectDiff(null, { a: 1 });
    expect(diff.hasChanges).toBe(true);
    expect(diff.added).toEqual({ a: 1 });

    const diff2 = objectDiff({ a: 1 }, undefined);
    expect(diff2.hasChanges).toBe(true);
    expect(diff2.removed).toEqual({ a: 1 });
  });

  it('guards against prototype pollution in diffing', () => {
    const maliciousBefore = JSON.parse('{"__proto__": {"polluted": true}, "a": 1}');
    const maliciousAfter = JSON.parse('{"__proto__": {"polluted": true}, "a": 2}');

    const diff = objectDiff(maliciousBefore, maliciousAfter);
    expect(diff.updated).toEqual({ a: { before: 1, after: 2 } });
    expect((diff.updated as any).polluted).toBeUndefined();
    expect((Object.prototype as any).polluted).toBeUndefined();
  });
});
