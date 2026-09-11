import { deepEqual } from '../deep-equal/index.js';
import { isDangerousKey, createSafeRecord } from '../shared/security.js';
import { isPlainObject } from '../shared/types.js';

export interface DiffChange<T = unknown> {
  before: T;
  after: T;
}

export interface ObjectDiffResult {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  updated: Record<string, DiffChange>;
  hasChanges: boolean;
}

export interface ObjectDiffOptions {
  /**
   * Whether to recursively inspect nested objects.
   * @default true
   */
  deep?: boolean;

  /**
   * Diff output structure for deep comparisons:
   * - 'flat': nested keys are joined using dot notation (e.g. 'user.profile.age')
   * - 'nested': nested differences are grouped into nested object structures
   * @default 'flat'
   */
  mode?: 'flat' | 'nested';

  /**
   * Keys to ignore during diffing.
   */
  ignoreKeys?: PropertyKey[];
}

/**
 * Computes the structural difference between two objects, identifying added, removed, and updated fields.
 */
export function objectDiff(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
  options: ObjectDiffOptions = {}
): ObjectDiffResult {
  const { deep = true, mode = 'flat', ignoreKeys = [] } = options;
  const ignoreSet = new Set<PropertyKey>(ignoreKeys);

  const added = createSafeRecord<unknown>();
  const removed = createSafeRecord<unknown>();
  const updated = createSafeRecord<DiffChange>();

  const objA = before && typeof before === 'object' ? before : {};
  const objB = after && typeof after === 'object' ? after : {};

  function diffRecursive(a: Record<string, any>, b: Record<string, any>, prefix: string) {
    const keysA = Object.keys(a).filter((k) => !isDangerousKey(k) && !ignoreSet.has(k));
    const keysB = Object.keys(b).filter((k) => !isDangerousKey(k) && !ignoreSet.has(k));
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const hasA = Object.prototype.hasOwnProperty.call(a, key);
      const hasB = Object.prototype.hasOwnProperty.call(b, key);
      const fullPath = prefix ? `${prefix}.${key}` : key;

      if (!hasA && hasB) {
        added[fullPath] = b[key];
      } else if (hasA && !hasB) {
        removed[fullPath] = a[key];
      } else {
        const valA = a[key];
        const valB = b[key];

        if (deep && isPlainObject(valA) && isPlainObject(valB)) {
          diffRecursive(valA, valB, fullPath);
        } else if (!deepEqual(valA, valB)) {
          updated[fullPath] = { before: valA, after: valB };
        }
      }
    }
  }

  function diffNested(a: Record<string, any>, b: Record<string, any>): {
    added: Record<string, any>;
    removed: Record<string, any>;
    updated: Record<string, any>;
  } {
    const nAdded = createSafeRecord<unknown>();
    const nRemoved = createSafeRecord<unknown>();
    const nUpdated = createSafeRecord<any>();

    const keysA = Object.keys(a).filter((k) => !isDangerousKey(k) && !ignoreSet.has(k));
    const keysB = Object.keys(b).filter((k) => !isDangerousKey(k) && !ignoreSet.has(k));
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const hasA = Object.prototype.hasOwnProperty.call(a, key);
      const hasB = Object.prototype.hasOwnProperty.call(b, key);

      if (!hasA && hasB) {
        nAdded[key] = b[key];
      } else if (hasA && !hasB) {
        nRemoved[key] = a[key];
      } else {
        const valA = a[key];
        const valB = b[key];

        if (deep && isPlainObject(valA) && isPlainObject(valB)) {
          const sub = diffNested(valA, valB);
          if (
            Object.keys(sub.added).length > 0 ||
            Object.keys(sub.removed).length > 0 ||
            Object.keys(sub.updated).length > 0
          ) {
            nUpdated[key] = sub;
          }
        } else if (!deepEqual(valA, valB)) {
          nUpdated[key] = { before: valA, after: valB };
        }
      }
    }

    return { added: nAdded, removed: nRemoved, updated: nUpdated };
  }

  if (mode === 'nested') {
    const nested = diffNested(objA, objB);
    const hasChanges =
      Object.keys(nested.added).length > 0 ||
      Object.keys(nested.removed).length > 0 ||
      Object.keys(nested.updated).length > 0;
    return {
      added: nested.added,
      removed: nested.removed,
      updated: nested.updated,
      hasChanges,
    };
  }

  diffRecursive(objA, objB, '');

  const hasChanges =
    Object.keys(added).length > 0 ||
    Object.keys(removed).length > 0 ||
    Object.keys(updated).length > 0;

  return { added, removed, updated, hasChanges };
}

export default objectDiff;
