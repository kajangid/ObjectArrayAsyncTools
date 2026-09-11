/**
 * Security utilities: Prototype pollution defenses and safe object factories.
 */

export const DANGEROUS_KEYS = Object.freeze(['__proto__', 'prototype', 'constructor'] as const);

export type DangerousKey = typeof DANGEROUS_KEYS[number];

/**
 * Checks if a property key is dangerous (can pollute the prototype chain).
 */
export function isDangerousKey(key: PropertyKey): key is DangerousKey {
  return key === '__proto__' || key === 'prototype' || key === 'constructor';
}

/**
 * Creates an object with a null prototype to completely prevent prototype pollution attacks.
 */
export function createSafeRecord<T = unknown>(
  initial?: Record<string, T> | Iterable<readonly [PropertyKey, T]>
): Record<string, T> {
  const record = Object.create(null) as Record<string, T>;
  if (!initial) {
    return record;
  }

  if (Symbol.iterator in initial) {
    for (const [key, value] of initial as Iterable<readonly [PropertyKey, T]>) {
      if (!isDangerousKey(key)) {
        record[key as string] = value;
      }
    }
  } else {
    for (const key of Object.keys(initial)) {
      if (!isDangerousKey(key)) {
        record[key] = (initial as Record<string, T>)[key]!;
      }
    }
  }

  return record;
}

/**
 * Safely checks if an object has an own property, resistant to overridden hasOwnProperty.
 */
export function safeHasOwn(obj: unknown, key: PropertyKey): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Safely sets a property on a target object, preventing prototype pollution.
 * Returns true if the property was set, or false if it was rejected due to dangerous key.
 */
export function safeSetProperty<T extends object>(
  target: T,
  key: PropertyKey,
  value: unknown
): boolean {
  if (isDangerousKey(key)) {
    return false;
  }
  (target as Record<PropertyKey, unknown>)[key] = value;
  return true;
}

/**
 * Safely copies own enumerable properties from source objects to target,
 * filtering out any prototype pollution keys.
 */
export function safeAssign<T extends object>(
  target: T,
  ...sources: Array<Record<PropertyKey, unknown> | null | undefined>
): T {
  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    const keys = [...Object.keys(source), ...Object.getOwnPropertySymbols(source)];
    for (const key of keys) {
      if (!isDangerousKey(key) && Object.prototype.propertyIsEnumerable.call(source, key)) {
        (target as Record<PropertyKey, unknown>)[key] = source[key];
      }
    }
  }
  return target;
}
