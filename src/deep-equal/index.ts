import { isDangerousKey } from '../shared/security.js';

export interface DeepEqualOptions {
  /**
   * If true, objects with different prototypes are considered unequal.
   * @default false
   */
  strictTypes?: boolean;

  /**
   * If true, Symbol-keyed properties are ignored during comparison.
   * @default false
   */
  ignoreSymbolKeys?: boolean;

  /**
   * If true, +0 and -0 are considered equal.
   * @default true
   */
  looseZeros?: boolean;

  /**
   * Custom comparison callback. Returning a boolean overrides default comparison for that pair.
   */
  customComparator?: (a: unknown, b: unknown) => boolean | undefined;
}

/**
 * Recursively compares two values to determine if they are deeply equal.
 * Handles primitives, circular references, Maps, Sets, TypedArrays, Dates, RegExps, and Symbols.
 */
export function deepEqual(a: unknown, b: unknown, options: DeepEqualOptions = {}): boolean {
  const { strictTypes = false, ignoreSymbolKeys = false, looseZeros = true, customComparator } = options;

  // Track visited pairs to handle circular references safely
  const visited = new Map<object, Set<object>>();

  function equalInternal(x: any, y: any): boolean {
    if (customComparator) {
      const custom = customComparator(x, y);
      if (typeof custom === 'boolean') {
        return custom;
      }
    }

    // 1. Same reference / primitive equality
    if (Object.is(x, y)) {
      return true;
    }

    if (looseZeros && x === 0 && y === 0) {
      return true;
    }

    // If one is not an object or either is null
    if (x === null || typeof x !== 'object' || y === null || typeof y !== 'object') {
      return false;
    }

    // 2. Circular reference tracking
    let setX = visited.get(x);
    if (setX && setX.has(y)) {
      return true;
    }
    if (!setX) {
      setX = new Set();
      visited.set(x, setX);
    }
    setX.add(y);

    // 3. Compare prototypes if strictTypes is requested
    if (strictTypes) {
      if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y)) {
        return false;
      }
    }

    // 4. Handle Date
    if (x instanceof Date && y instanceof Date) {
      const timeX = x.getTime();
      const timeY = y.getTime();
      return timeX === timeY || (Number.isNaN(timeX) && Number.isNaN(timeY));
    }

    // 5. Handle RegExp
    if (x instanceof RegExp && y instanceof RegExp) {
      return x.source === y.source && x.flags === y.flags;
    }

    // 6. Handle Error
    if (x instanceof Error && y instanceof Error) {
      if (x.name !== y.name || x.message !== y.message) {
        return false;
      }
      return equalInternal((x as any).cause, (y as any).cause);
    }

    // 7. Handle ArrayBuffer & DataView
    if (x instanceof ArrayBuffer && y instanceof ArrayBuffer) {
      if (x.byteLength !== y.byteLength) return false;
      const viewX = new Uint8Array(x);
      const viewY = new Uint8Array(y);
      for (let i = 0; i < viewX.length; i++) {
        if (viewX[i] !== viewY[i]) return false;
      }
      return true;
    }

    if (x instanceof DataView && y instanceof DataView) {
      if (x.byteLength !== y.byteLength || x.byteOffset !== y.byteOffset) return false;
      return equalInternal(x.buffer, y.buffer);
    }

    // 8. Handle TypedArrays
    const isXTypedArray = ArrayBuffer.isView(x) && !(x instanceof DataView);
    const isYTypedArray = ArrayBuffer.isView(y) && !(y instanceof DataView);
    if (isXTypedArray || isYTypedArray) {
      if (x.constructor !== y.constructor) return false;
      const arrX = x as Uint8Array;
      const arrY = y as Uint8Array;
      if (arrX.length !== arrY.length) return false;
      for (let i = 0; i < arrX.length; i++) {
        if (arrX[i] !== arrY[i]) return false;
      }
      return true;
    }

    // 9. Handle Map
    if (x instanceof Map && y instanceof Map) {
      if (x.size !== y.size) return false;
      for (const [keyX, valX] of x.entries()) {
        let found = false;
        for (const [keyY, valY] of y.entries()) {
          if (equalInternal(keyX, keyY) && equalInternal(valX, valY)) {
            found = true;
            break;
          }
        }
        if (!found) return false;
      }
      return true;
    }

    // 10. Handle Set
    if (x instanceof Set && y instanceof Set) {
      if (x.size !== y.size) return false;
      for (const itemX of x.values()) {
        let found = false;
        for (const itemY of y.values()) {
          if (equalInternal(itemX, itemY)) {
            found = true;
            break;
          }
        }
        if (!found) return false;
      }
      return true;
    }

    // If one is array and other is not
    const isXArray = Array.isArray(x);
    const isYArray = Array.isArray(y);
    if (isXArray !== isYArray) {
      return false;
    }

    // 11. Handle Array
    if (isXArray && isYArray) {
      if (x.length !== y.length) return false;
      for (let i = 0; i < x.length; i++) {
        if (!equalInternal(x[i], y[i])) {
          return false;
        }
      }
      return true;
    }

    // 12. Plain Object comparison
    const keysX = Object.keys(x).filter((k) => !isDangerousKey(k));
    const keysY = Object.keys(y).filter((k) => !isDangerousKey(k));

    if (!ignoreSymbolKeys) {
      keysX.push(...(Object.getOwnPropertySymbols(x) as any[]));
      keysY.push(...(Object.getOwnPropertySymbols(y) as any[]));
    }

    if (keysX.length !== keysY.length) {
      return false;
    }

    for (const key of keysX) {
      if (!Object.prototype.hasOwnProperty.call(y, key)) {
        return false;
      }
      if (!equalInternal(x[key], y[key])) {
        return false;
      }
    }

    return true;
  }

  return equalInternal(a, b);
}

export default deepEqual;
