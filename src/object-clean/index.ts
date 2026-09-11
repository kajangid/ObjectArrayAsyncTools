import { isDangerousKey, safeHasOwn } from '../shared/security.js';
import { isPlainObject } from '../shared/types.js';

export interface ObjectCleanOptions {
  /**
   * Remove properties with `null` values.
   * @default true
   */
  nulls?: boolean;

  /**
   * Remove properties with `undefined` values.
   * @default true
   */
  undefineds?: boolean;

  /**
   * Remove properties with empty strings `""` (or whitespace-only if trim is enabled).
   * @default false
   */
  emptyStrings?: boolean;

  /**
   * Remove empty objects `{}`.
   * @default false
   */
  emptyObjects?: boolean;

  /**
   * Remove empty arrays `[]`.
   * @default false
   */
  emptyArrays?: boolean;

  /**
   * Remove `NaN` values.
   * @default false
   */
  nans?: boolean;

  /**
   * Recursively clean nested objects and arrays.
   * @default true
   */
  deep?: boolean;

  /**
   * Whether to also filter elements in arrays matching the criteria.
   * @default true
   */
  cleanArrays?: boolean;

  /**
   * Custom filter predicate.
   * Return `true` to keep the property, or `false` to remove it.
   */
  customFilter?: (value: unknown, key: PropertyKey) => boolean;
}

/**
 * Removes unwanted empty or nullish values from an object or array.
 * Creates an immutable clean copy without mutating the input.
 */
export function objectClean<T>(target: T, options: ObjectCleanOptions = {}): T {
  const {
    nulls = true,
    undefineds = true,
    emptyStrings = false,
    emptyObjects = false,
    emptyArrays = false,
    nans = false,
    deep = true,
    cleanArrays = true,
    customFilter,
  } = options;

  const seen = new WeakMap<object, any>();

  function shouldOmit(val: unknown, key: PropertyKey): boolean {
    if (customFilter && !customFilter(val, key)) {
      return true;
    }
    if (nulls && val === null) {
      return true;
    }
    if (undefineds && val === undefined) {
      return true;
    }
    if (emptyStrings && val === '') {
      return true;
    }
    if (nans && typeof val === 'number' && Number.isNaN(val)) {
      return true;
    }
    if (emptyArrays && Array.isArray(val) && val.length === 0) {
      return true;
    }
    if (emptyObjects && isPlainObject(val) && Object.keys(val).length === 0) {
      return true;
    }
    return false;
  }

  function cleanInternal(val: any): any {
    if (val === null || typeof val !== 'object') {
      return val;
    }

    if (seen.has(val)) {
      return seen.get(val);
    }

    if (Array.isArray(val)) {
      const result: any[] = [];
      seen.set(val, result);

      for (let i = 0; i < val.length; i++) {
        let item = val[i];
        if (deep && typeof item === 'object' && item !== null) {
          item = cleanInternal(item);
        }

        if (!cleanArrays || !shouldOmit(item, i)) {
          result.push(item);
        }
      }

      return result;
    }

    if (!isPlainObject(val)) {
      return val;
    }

    const proto = Object.getPrototypeOf(val);
    const result: Record<PropertyKey, any> = proto === null ? Object.create(null) : {};
    seen.set(val, result);

    const keys = [...Object.keys(val), ...Object.getOwnPropertySymbols(val)];
    for (const key of keys) {
      if (isDangerousKey(key) || !safeHasOwn(val, key)) {
        continue;
      }

      let propVal = val[key];
      if (deep && typeof propVal === 'object' && propVal !== null) {
        propVal = cleanInternal(propVal);
      }

      if (!shouldOmit(propVal, key)) {
        result[key] = propVal;
      }
    }

    return result;
  }

  return cleanInternal(target);
}

export default objectClean;
