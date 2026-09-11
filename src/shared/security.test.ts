import { describe, it, expect } from 'vitest';
import {
  isDangerousKey,
  createSafeRecord,
  safeHasOwn,
  safeSetProperty,
  safeAssign,
} from './security.js';
import {
  BaseError,
  ValidationError,
  QueueError,
  TimeoutError,
  AbortError,
} from './errors.js';

describe('shared/security', () => {
  describe('isDangerousKey', () => {
    it('detects prototype pollution keys', () => {
      expect(isDangerousKey('__proto__')).toBe(true);
      expect(isDangerousKey('prototype')).toBe(true);
      expect(isDangerousKey('constructor')).toBe(true);
    });

    it('returns false for safe keys', () => {
      expect(isDangerousKey('name')).toBe(false);
      expect(isDangerousKey('id')).toBe(false);
      expect(isDangerousKey('toString')).toBe(false);
      expect(isDangerousKey(Symbol('safe'))).toBe(false);
    });
  });

  describe('createSafeRecord', () => {
    it('creates an object with null prototype', () => {
      const record = createSafeRecord();
      expect(Object.getPrototypeOf(record)).toBeNull();
      expect(record.toString).toBeUndefined();
    });

    it('populates initial records while discarding dangerous keys', () => {
      const initial = {
        safe: 123,
        __proto__: { polluted: true },
        constructor: 'bad',
      };
      const record = createSafeRecord(initial as any);
      expect(record.safe).toBe(123);
      expect((record as any).polluted).toBeUndefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('populates from iterable entries discarding dangerous keys', () => {
      const entries: [string, number][] = [
        ['a', 1],
        ['__proto__', 999],
        ['b', 2],
      ];
      const record = createSafeRecord(entries);
      expect(record.a).toBe(1);
      expect(record.b).toBe(2);
      expect((Object.prototype as any)[999]).toBeUndefined();
    });
  });

  describe('safeHasOwn', () => {
    it('safely checks own properties', () => {
      const obj = { a: 1 };
      expect(safeHasOwn(obj, 'a')).toBe(true);
      expect(safeHasOwn(obj, 'toString')).toBe(false);
      expect(safeHasOwn(null, 'a')).toBe(false);
      expect(safeHasOwn(undefined, 'a')).toBe(false);
    });

    it('works with objects that have overridden hasOwnProperty', () => {
      const obj = {
        hasOwnProperty: () => {
          throw new Error('Explosion');
        },
        b: 2,
      };
      expect(safeHasOwn(obj, 'b')).toBe(true);
      expect(safeHasOwn(obj, 'c')).toBe(false);
    });
  });

  describe('safeSetProperty', () => {
    it('sets safe properties', () => {
      const obj: Record<string, any> = {};
      const result = safeSetProperty(obj, 'safeKey', 'safeVal');
      expect(result).toBe(true);
      expect(obj.safeKey).toBe('safeVal');
    });

    it('blocks dangerous properties', () => {
      const obj: Record<string, any> = {};
      expect(safeSetProperty(obj, '__proto__', { admin: true })).toBe(false);
      expect(safeSetProperty(obj, 'prototype', { admin: true })).toBe(false);
      expect(safeSetProperty(obj, 'constructor', { admin: true })).toBe(false);
      expect((Object.prototype as any).admin).toBeUndefined();
    });
  });

  describe('safeAssign', () => {
    it('merges properties without polluting prototype', () => {
      const target = { a: 1 };
      const source = JSON.parse('{"__proto__": {"polluted": true}, "b": 2}');
      const result = safeAssign(target, source);

      expect(result.a).toBe(1);
      expect((result as any).b).toBe(2);
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('copies symbols and ignores non-enumerable or null sources', () => {
      const sym = Symbol('test');
      const target = {};
      const source = { [sym]: 'symbolVal' };
      safeAssign(target, null, undefined, source);
      expect((target as any)[sym]).toBe('symbolVal');
    });
  });

  describe('shared/errors', () => {
    it('instantiates custom error subclasses with codes', () => {
      const baseErr = new BaseError('base', 'ERR_CUSTOM');
      expect(baseErr.code).toBe('ERR_CUSTOM');
      expect(baseErr.message).toBe('base');

      const valErr = new ValidationError('validation failed');
      expect(valErr.code).toBe('ERR_VALIDATION');
      expect(valErr.name).toBe('ValidationError');

      const queueErr = new QueueError('queue issue');
      expect(queueErr.code).toBe('ERR_QUEUE');
      expect(queueErr.name).toBe('QueueError');

      const timeoutErr = new TimeoutError('timed out', 500);
      expect(timeoutErr.code).toBe('ERR_TIMEOUT');
      expect(timeoutErr.timeoutMs).toBe(500);

      const abortErr = new AbortError();
      expect(abortErr.code).toBe('ERR_ABORTED');
    });
  });
});
