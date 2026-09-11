import { deepEqual } from '../deep-equal/index.js';

export interface UniqueArrayOptions<T> {
  /**
   * Property key or extraction function to determine uniqueness.
   */
  by?: ((item: T, index: number) => unknown) | keyof T;

  /**
   * If true, uses structural deep equality to check for duplicate objects.
   * @default false
   */
  deep?: boolean;
}

/**
 * Removes duplicate items from an array, retaining the first occurrence of each unique item.
 *
 * @param array - The source array to deduplicate.
 * @param identityOrOptions - Property key, extraction callback, or configuration options.
 * @returns A new array with duplicate items removed.
 */
export function uniqueArray<T>(
  array: readonly T[],
  identityOrOptions?:
    | ((item: T, index: number) => unknown)
    | keyof T
    | UniqueArrayOptions<T>
): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected an array to deduplicate');
  }

  if (array.length <= 1) {
    return array.slice();
  }

  let by: (((item: T, index: number) => unknown) | keyof T) | undefined;
  let deep = false;

  if (identityOrOptions !== undefined) {
    if (
      typeof identityOrOptions === 'object' &&
      identityOrOptions !== null &&
      !Array.isArray(identityOrOptions) &&
      ('by' in identityOrOptions || 'deep' in identityOrOptions)
    ) {
      by = identityOrOptions.by;
      deep = !!identityOrOptions.deep;
    } else {
      by = identityOrOptions as any;
    }
  }

  // Deep equality deduplication path
  if (deep) {
    const result: T[] = [];
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      const val =
        by !== undefined
          ? typeof by === 'function'
            ? by(item, i)
            : (item as any)?.[by]
          : item;

      let isDuplicate = false;
      for (let j = 0; j < result.length; j++) {
        const existingVal =
          by !== undefined
            ? typeof by === 'function'
              ? by(result[j], j)
              : (result[j] as any)?.[by]
            : result[j];

        if (deepEqual(val, existingVal)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        result.push(item);
      }
    }
    return result;
  }

  // Fast path: property or selector function
  if (by !== undefined) {
    const seen = new Set<unknown>();
    const result: T[] = [];
    const extract =
      typeof by === 'function'
        ? (item: T, idx: number) => (by as (i: T, idx: number) => unknown)(item, idx)
        : (item: T) => (item as any)?.[by];

    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      const key = extract(item, i);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    return result;
  }

  // Standard fast path: Set deduplication (primitives & object identity)
  return Array.from(new Set(array));
}

export default uniqueArray;
