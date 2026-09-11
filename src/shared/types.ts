/**
 * Universal primitive and generic types across the package.
 */

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type PlainObject = Record<PropertyKey, unknown>;

export type AnyFunction = (...args: any[]) => any;

export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? _DeepPartialArray<U>
  : T extends object
  ? _DeepPartialObject<T>
  : T;

type _DeepPartialArray<T> = Array<DeepPartial<T>>;
type _DeepPartialObject<T> = { [P in keyof T]?: DeepPartial<T[P]> };

export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Checks whether a given value is a primitive.
 */
export function isPrimitive(value: unknown): value is Primitive {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

/**
 * Checks whether a given value is an object (non-null and not primitive).
 */
export function isObject(value: unknown): value is object {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

/**
 * Checks whether a given value is a plain object (created via {} or Object.create(null)).
 */
export function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
