import { describe, it, expect } from 'vitest';
import { chunk } from './index.js';

describe('chunk', () => {
  it('splits array into chunks of specified size', () => {
    const data = [1, 2, 3, 4, 5, 6];
    expect(chunk(data, 2)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it('handles arrays with remainder items in final chunk', () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    expect(chunk(data, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('handles size larger than array length', () => {
    const data = [1, 2, 3];
    expect(chunk(data, 10)).toEqual([[1, 2, 3]]);
  });

  it('returns empty array when input array is empty', () => {
    expect(chunk([], 5)).toEqual([]);
  });

  it('does not mutate original array', () => {
    const original = [1, 2, 3, 4];
    const result = chunk(original, 2);
    expect(result).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(original).toEqual([1, 2, 3, 4]);
  });

  it('throws TypeError when input is not an array', () => {
    expect(() => chunk(null as any, 2)).toThrow(TypeError);
    expect(() => chunk('string' as any, 2)).toThrow(TypeError);
  });

  it('throws RangeError when size is invalid', () => {
    expect(() => chunk([1, 2], 0)).toThrow(RangeError);
    expect(() => chunk([1, 2], -1)).toThrow(RangeError);
    expect(() => chunk([1, 2], 1.5)).toThrow(RangeError);
    expect(() => chunk([1, 2], NaN)).toThrow(RangeError);
  });
});
