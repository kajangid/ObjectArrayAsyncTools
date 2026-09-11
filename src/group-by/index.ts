import { createSafeRecord } from '../shared/security.js';

export type KeySelector<T, K> = ((item: T, index: number) => K) | keyof T;

/**
 * Groups items in an array by a property key or extractor function.
 * Returns a prototype-less record (`Object.create(null)`) to prevent prototype pollution attacks.
 *
 * @param items - The array of items to group.
 * @param keySelector - A property key or a callback extracting the group key.
 * @returns A prototype-less dictionary where keys map to item arrays.
 */
export function groupBy<T, K extends PropertyKey = PropertyKey>(
  items: readonly T[],
  keySelector: KeySelector<T, K>
): Record<K, T[]> {
  if (!Array.isArray(items)) {
    throw new TypeError('Expected an array to group');
  }

  const result = createSafeRecord<T[]>();
  const resolveKey =
    typeof keySelector === 'function'
      ? (item: T, idx: number) => (keySelector as (i: T, idx: number) => K)(item, idx)
      : (item: T) => (item as any)?.[keySelector];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rawKey = resolveKey(item, i);
    const groupKey = String(rawKey);

    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
  }

  return result as Record<K, T[]>;
}

/**
 * Groups items in an array using an ES6 Map.
 * Useful when keys are objects, numbers, or other non-string primitives.
 *
 * @param items - The array of items to group.
 * @param keySelector - A property key or extractor function.
 * @returns A Map mapping keys to grouped item arrays.
 */
export function groupByMap<T, K>(
  items: readonly T[],
  keySelector: KeySelector<T, K>
): Map<K, T[]> {
  if (!Array.isArray(items)) {
    throw new TypeError('Expected an array to group');
  }

  const result = new Map<K, T[]>();
  const resolveKey =
    typeof keySelector === 'function'
      ? (item: T, idx: number) => (keySelector as (i: T, idx: number) => K)(item, idx)
      : (item: T) => (item as any)?.[keySelector];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = resolveKey(item, i);

    let group = result.get(key);
    if (!group) {
      group = [];
      result.set(key, group);
    }
    group.push(item);
  }

  return result;
}

export default groupBy;
