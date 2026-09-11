import { isDangerousKey } from '../shared/security.js';

export interface DeepCloneOptions {
  /**
   * Prototype handling strategy:
   * - 'safe': Uses the source prototype if safe (null or plain Object.prototype or safe constructor), blocks dangerous keys.
   * - 'null': Creates cloned objects with null prototype.
   * - 'preserve': Copies prototype faithfully while guarding against pollution.
   * @default 'safe'
   */
  protoStrategy?: 'safe' | 'null' | 'preserve';

  /**
   * Optional custom cloner callback. Returning undefined falls back to standard cloning.
   */
  customCloner?: (value: unknown) => unknown | undefined;
}

/**
 * Creates a fully independent deep clone of nested objects, arrays, and built-in JavaScript types.
 * Safely handles circular references and guards against prototype pollution.
 */
export function deepClone<T>(value: T, options: DeepCloneOptions = {}): T {
  const seen = new WeakMap<object, any>();
  const { protoStrategy = 'safe', customCloner } = options;

  function cloneInternal(val: any): any {
    // 1. Check custom cloner
    if (customCloner) {
      const custom = customCloner(val);
      if (custom !== undefined) {
        return custom;
      }
    }

    // 2. Primitives and functions
    if (val === null || typeof val !== 'object') {
      return val;
    }

    // 3. Circular reference check
    if (seen.has(val)) {
      return seen.get(val);
    }

    // 4. Handle Date
    if (val instanceof Date) {
      const copy = new Date(val.getTime());
      seen.set(val, copy);
      return copy;
    }

    // 5. Handle RegExp
    if (val instanceof RegExp) {
      const copy = new RegExp(val.source, val.flags);
      copy.lastIndex = val.lastIndex;
      seen.set(val, copy);
      return copy;
    }

    // 6. Handle ArrayBuffer & DataView
    if (val instanceof ArrayBuffer) {
      const copy = val.slice(0);
      seen.set(val, copy);
      return copy;
    }

    if (val instanceof DataView) {
      const bufferCopy = val.buffer.slice(0);
      const copy = new DataView(bufferCopy, val.byteOffset, val.byteLength);
      seen.set(val, copy);
      return copy;
    }

    // 7. Handle TypedArrays
    if (ArrayBuffer.isView(val) && !(val instanceof DataView)) {
      const typedArray = val as Uint8Array;
      const bufferCopy = typedArray.buffer.slice(0);
      const Ctor = typedArray.constructor as any;
      const copy = new Ctor(bufferCopy, typedArray.byteOffset, typedArray.length);
      seen.set(val, copy);
      return copy;
    }

    // 8. Handle Map
    if (val instanceof Map) {
      const copy = new Map();
      seen.set(val, copy);
      for (const [k, v] of val.entries()) {
        copy.set(cloneInternal(k), cloneInternal(v));
      }
      return copy;
    }

    // 9. Handle Set
    if (val instanceof Set) {
      const copy = new Set();
      seen.set(val, copy);
      for (const item of val.values()) {
        copy.add(cloneInternal(item));
      }
      return copy;
    }

    // 10. Handle Error
    if (val instanceof Error) {
      const Ctor = val.constructor as any;
      const copy = new Ctor(val.message);
      seen.set(val, copy);
      copy.name = val.name;
      copy.stack = val.stack;
      if ('cause' in val && val.cause !== undefined) {
        copy.cause = cloneInternal(val.cause);
      }
      return copy;
    }

    // 11. Handle Array
    if (Array.isArray(val)) {
      const copy: any[] = new Array(val.length);
      seen.set(val, copy);
      for (let i = 0; i < val.length; i++) {
        if (i in val) {
          copy[i] = cloneInternal(val[i]);
        }
      }
      return copy;
    }

    // 12. Plain / Structured Object
    let copy: any;
    if (protoStrategy === 'null') {
      copy = Object.create(null);
    } else if (protoStrategy === 'preserve') {
      const proto = Object.getPrototypeOf(val);
      copy = Object.create(proto);
    } else {
      // 'safe' strategy
      const proto = Object.getPrototypeOf(val);
      if (proto === null) {
        copy = Object.create(null);
      } else if (proto === Object.prototype) {
        copy = {};
      } else {
        copy = Object.create(proto);
      }
    }

    seen.set(val, copy);

    // Copy own properties (both string and symbol keys)
    const propertyDescriptors = Object.getOwnPropertyDescriptors(val);
    const symbols = Object.getOwnPropertySymbols(val);
    const keys = [...Object.keys(val), ...symbols];

    for (const key of keys) {
      if (isDangerousKey(key)) {
        continue;
      }
      const descriptor = propertyDescriptors[key as any];
      if (descriptor) {
        if ('value' in descriptor) {
          Object.defineProperty(copy, key, {
            ...descriptor,
            value: cloneInternal(descriptor.value),
          });
        } else {
          Object.defineProperty(copy, key, descriptor);
        }
      }
    }

    return copy;
  }

  return cloneInternal(value);
}

export default deepClone;
