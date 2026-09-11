import { describe, it, expect } from 'vitest';
import { smartSort } from './index.js';

describe('smartSort', () => {
  it('sorts numbers in ascending order by default', () => {
    expect(smartSort([10, 2, 33, 1, 5])).toEqual([1, 2, 5, 10, 33]);
  });

  it('sorts strings naturally (numeric collation)', () => {
    const files = ['item-10.png', 'item-2.png', 'item-1.png', 'item-20.png'];
    expect(smartSort(files)).toEqual([
      'item-1.png',
      'item-2.png',
      'item-10.png',
      'item-20.png',
    ]);
  });

  it('sorts strings without natural collation when natural: false', () => {
    const items = ['a10', 'a2', 'a1'];
    expect(smartSort(items, { natural: false })).toEqual(['a1', 'a10', 'a2']);
  });

  it('sorts BigInt values', () => {
    expect(smartSort([30n, 10n, 20n])).toEqual([10n, 20n, 30n]);
    expect(smartSort([10n, 20n], (a, b) => (a > b ? -1 : 1))).toEqual([20n, 10n]);
  });

  it('sorts objects by property key in ascending or descending order', () => {
    const users = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 35 },
    ];

    expect(smartSort(users, 'age')).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Charlie', age: 30 },
      { name: 'Bob', age: 35 },
    ]);

    expect(smartSort(users, { by: 'age', order: 'desc' })).toEqual([
      { name: 'Bob', age: 35 },
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
    ]);
  });

  it('supports multi-field sorting', () => {
    const team = [
      { dept: 'engineering', name: 'Zack' },
      { dept: 'sales', name: 'Adam' },
      { dept: 'engineering', name: 'Aaron' },
      { dept: 'sales', name: 'Beth' },
    ];

    const sorted = smartSort(team, [
      { by: 'dept', order: 'asc' },
      { by: 'name', order: 'asc' },
    ]);

    expect(sorted).toEqual([
      { dept: 'engineering', name: 'Aaron' },
      { dept: 'engineering', name: 'Zack' },
      { dept: 'sales', name: 'Adam' },
      { dept: 'sales', name: 'Beth' },
    ]);
  });

  it('sorts Date objects chronologically', () => {
    const d1 = new Date('2025-05-01');
    const d2 = new Date('2025-01-01');
    const d3 = new Date('2025-03-01');

    expect(smartSort([d1, d2, d3])).toEqual([d2, d3, d1]);
  });

  it('handles null and undefined values with nulls option', () => {
    const data = [10, null, 2, undefined, 5];

    expect(smartSort(data, { nulls: 'last' })).toEqual([2, 5, 10, null, undefined]);
    expect(smartSort(data, { nulls: 'first' })).toEqual([null, undefined, 2, 5, 10]);
  });

  it('supports standard comparator functions', () => {
    const list = [5, 2, 8, 1];
    expect(smartSort(list, (a, b) => b - a)).toEqual([8, 5, 2, 1]);
  });

  it('sorts boolean and other arbitrary values using fallback conversion', () => {
    const list = [{ active: true }, { active: false }, { active: true }];
    const sorted = smartSort(list, 'active');
    expect(sorted.map((x) => x.active)).toEqual([false, true, true]);
  });

  it('does not mutate the original array', () => {
    const original = [3, 1, 2];
    const sorted = smartSort(original);
    expect(sorted).toEqual([1, 2, 3]);
    expect(original).toEqual([3, 1, 2]);
  });

  it('throws TypeError for non-array inputs', () => {
    expect(() => smartSort(null as any)).toThrow(TypeError);
  });
});
