import { describe, it, expect } from 'vitest';
import { groupBy, groupByMap } from './index.js';

describe('groupBy', () => {
  it('groups items by string property key', () => {
    const inventory = [
      { name: 'apples', category: 'fruit' },
      { name: 'carrots', category: 'vegetable' },
      { name: 'bananas', category: 'fruit' },
    ];

    const grouped = groupBy(inventory, 'category');

    expect(grouped.fruit).toEqual([
      { name: 'apples', category: 'fruit' },
      { name: 'bananas', category: 'fruit' },
    ]);
    expect(grouped.vegetable).toEqual([
      { name: 'carrots', category: 'vegetable' },
    ]);
  });

  it('groups items using a selector callback', () => {
    const numbers = [1, 2, 3, 4, 5, 6];
    const grouped = groupBy(numbers, (n) => (n % 2 === 0 ? 'even' : 'odd'));

    expect(grouped.even).toEqual([2, 4, 6]);
    expect(grouped.odd).toEqual([1, 3, 5]);
  });

  it('is immune to prototype pollution when grouping by dangerous keys', () => {
    const items = [
      { key: '__proto__', val: 'pollute' },
      { key: 'toString', val: 'override' },
      { key: 'constructor', val: 'hijack' },
    ];

    const grouped = groupBy(items, 'key');

    expect(grouped.__proto__).toEqual([{ key: '__proto__', val: 'pollute' }]);
    expect((Object.prototype as any).length).toBeUndefined();
    expect(Object.getPrototypeOf(grouped)).toBeNull();
  });

  it('handles empty arrays', () => {
    const result = groupBy([], 'id');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('throws TypeError when input is not an array', () => {
    expect(() => groupBy(null as any, 'category')).toThrow(TypeError);
  });
});

describe('groupByMap', () => {
  it('groups items by object reference key', () => {
    const departmentA = { id: 'sales' };
    const departmentB = { id: 'engineering' };

    const employees = [
      { name: 'Alice', dept: departmentA },
      { name: 'Bob', dept: departmentB },
      { name: 'Charlie', dept: departmentA },
    ];

    const map = groupByMap(employees, (e) => e.dept);

    expect(map.get(departmentA)).toEqual([
      { name: 'Alice', dept: departmentA },
      { name: 'Charlie', dept: departmentA },
    ]);
    expect(map.get(departmentB)).toEqual([
      { name: 'Bob', dept: departmentB },
    ]);
  });

  it('groups items by property key name', () => {
    const items = [
      { role: 'admin', user: 'u1' },
      { role: 'guest', user: 'u2' },
      { role: 'admin', user: 'u3' },
    ];
    const map = groupByMap(items, 'role');
    expect(map.get('admin')).toHaveLength(2);
    expect(map.get('guest')).toHaveLength(1);
  });

  it('throws TypeError when input is not an array', () => {
    expect(() => groupByMap(null as any, 'dept')).toThrow(TypeError);
  });
});
