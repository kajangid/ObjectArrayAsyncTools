export type SortOrder = 'asc' | 'desc';
export type NullsOrder = 'first' | 'last';

export interface SortRule<T> {
  /**
   * Property key or value extractor function.
   */
  by?: keyof T | ((item: T) => unknown);

  /**
   * Sort direction.
   * @default 'asc'
   */
  order?: SortOrder;

  /**
   * Whether to use natural sorting for strings (e.g. "v2" before "v10").
   * @default true
   */
  natural?: boolean;

  /**
   * Where to place `null` or `undefined` values.
   * @default 'last'
   */
  nulls?: NullsOrder;
}

export type SortCriteria<T> =
  | keyof T
  | ((item: T) => unknown)
  | ((a: T, b: T) => number)
  | SortRule<T>
  | Array<SortRule<T> | keyof T | ((item: T) => unknown)>;

/**
 * Flexible, stable, and multi-field sorting utility for numbers, strings, dates, and objects.
 * Never mutates the original array.
 */
export function smartSort<T>(array: readonly T[], criteria?: SortCriteria<T>): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected an array to sort');
  }

  if (array.length <= 1) {
    return array.slice();
  }

  // Handle direct comparator function
  if (typeof criteria === 'function' && criteria.length >= 2) {
    return stableSort(array.slice(), criteria as (a: T, b: T) => number);
  }

  const rules: SortRule<T>[] = normalizeRules(criteria);

  return stableSort(array.slice(), (a, b) => {
    for (const rule of rules) {
      const cmp = compareByRule(a, b, rule);
      if (cmp !== 0) {
        return rule.order === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

/**
 * Pure stable merge-sort implementation, free of native Array.prototype.sort undefined-skipping quirks.
 */
function stableSort<T>(arr: T[], cmp: (a: T, b: T) => number): T[] {
  if (arr.length <= 1) {
    return arr;
  }

  const mid = Math.floor(arr.length / 2);
  const left = stableSort(arr.slice(0, mid), cmp);
  const right = stableSort(arr.slice(mid), cmp);

  const result: T[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (cmp(left[i] as T, right[j] as T) <= 0) {
      result.push(left[i] as T);
      i++;
    } else {
      result.push(right[j] as T);
      j++;
    }
  }

  while (i < left.length) {
    result.push(left[i++] as T);
  }
  while (j < right.length) {
    result.push(right[j++] as T);
  }

  return result;
}

function normalizeRules<T>(criteria?: SortCriteria<T>): SortRule<T>[] {
  if (criteria === undefined) {
    return [{ order: 'asc', natural: true, nulls: 'last' }];
  }

  if (Array.isArray(criteria)) {
    return criteria.map((c) => {
      if (typeof c === 'object' && c !== null && ('by' in c || 'order' in c || 'natural' in c)) {
        return { order: 'asc', natural: true, nulls: 'last', ...c };
      }
      return { by: c as any, order: 'asc', natural: true, nulls: 'last' };
    });
  }

  if (
    typeof criteria === 'object' &&
    criteria !== null &&
    ('by' in criteria || 'order' in criteria || 'natural' in criteria || 'nulls' in criteria)
  ) {
    return [{ order: 'asc', natural: true, nulls: 'last', ...criteria }];
  }

  return [{ by: criteria as any, order: 'asc', natural: true, nulls: 'last' }];
}

function compareByRule<T>(a: T, b: T, rule: SortRule<T>): number {
  const { by, natural = true, nulls = 'last' } = rule;

  const valA =
    by !== undefined
      ? typeof by === 'function'
        ? by(a)
        : (a as any)?.[by]
      : a;

  const valB =
    by !== undefined
      ? typeof by === 'function'
        ? by(b)
        : (b as any)?.[by]
      : b;

  // Handle nullish values
  const isNullishA = valA === null || valA === undefined;
  const isNullishB = valB === null || valB === undefined;

  if (isNullishA && isNullishB) return 0;
  if (isNullishA) return nulls === 'first' ? -1 : 1;
  if (isNullishB) return nulls === 'first' ? 1 : -1;

  // Date comparison
  if (valA instanceof Date && valB instanceof Date) {
    return valA.getTime() - valB.getTime();
  }

  // Number / BigInt comparison
  if (typeof valA === 'number' && typeof valB === 'number') {
    if (Number.isNaN(valA) && Number.isNaN(valB)) return 0;
    if (Number.isNaN(valA)) return 1;
    if (Number.isNaN(valB)) return -1;
    return valA - valB;
  }

  if (typeof valA === 'bigint' && typeof valB === 'bigint') {
    return valA < valB ? -1 : valA > valB ? 1 : 0;
  }

  // String comparison
  if (typeof valA === 'string' && typeof valB === 'string') {
    if (natural) {
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    }
    return valA.localeCompare(valB);
  }

  // Fallback to string representation
  return String(valA).localeCompare(String(valB));
}

export default smartSort;
