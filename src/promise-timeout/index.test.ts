import { describe, it, expect, vi } from 'vitest';
import { promiseTimeout } from './index.js';
import { TimeoutError, AbortError } from '../shared/errors.js';

describe('promiseTimeout', () => {
  it('resolves successfully when promise settles before timeout', async () => {
    const fastPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('speedy'), 10);
    });

    const result = await promiseTimeout(fastPromise, 100);
    expect(result).toBe('speedy');
  });

  it('rejects with TimeoutError when operation exceeds deadline', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('too late'), 100);
    });

    await expect(promiseTimeout(slowPromise, 20)).rejects.toThrow(TimeoutError);
  });

  it('provides detailed timeout error metadata', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 50));

    try {
      await promiseTimeout(slowPromise, 15);
      expect.fail('Should have timed out');
    } catch (err: any) {
      expect(err).toBeInstanceOf(TimeoutError);
      expect(err.timeoutMs).toBe(15);
      expect(err.code).toBe('ERR_TIMEOUT');
    }
  });

  it('returns fallback value instead of rejecting when configured', async () => {
    const slowPromise = new Promise<string>((resolve) => setTimeout(() => resolve('slow'), 80));
    const fallback = vi.fn(() => 'fallback-result');

    const result = await promiseTimeout(slowPromise, 20, { fallback });
    expect(result).toBe('fallback-result');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('rejects if fallback function throws', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 80));
    const fallback = () => {
      throw new Error('Fallback failed');
    };

    await expect(promiseTimeout(slowPromise, 15, { fallback })).rejects.toThrow('Fallback failed');
  });

  it('throws custom error when configured', async () => {
    class GatewayTimeout extends Error {
      status = 504;
    }

    const slowPromise = new Promise((resolve) => setTimeout(resolve, 80));

    await expect(
      promiseTimeout(slowPromise, 15, {
        customError: () => new GatewayTimeout('Gateway timed out'),
      })
    ).rejects.toThrow(GatewayTimeout);

    const slow2 = new Promise((resolve) => setTimeout(resolve, 80));
    await expect(
      promiseTimeout(slow2, 15, {
        customError: new GatewayTimeout('Static error'),
      })
    ).rejects.toThrow(GatewayTimeout);
  });

  it('supports factory functions returning promises', async () => {
    const factory = () => Promise.resolve('from factory');
    const result = await promiseTimeout(factory, 50);
    expect(result).toBe('from factory');
  });

  it('handles synchronous throw in factory function', async () => {
    const failingFactory = () => {
      throw new Error('Sync factory error');
    };
    await expect(promiseTimeout(failingFactory, 50)).rejects.toThrow('Sync factory error');
  });

  it('rejects with AbortError when AbortSignal triggers', async () => {
    const controller = new AbortController();
    const hangingPromise = new Promise((resolve) => setTimeout(resolve, 500));

    setTimeout(() => controller.abort(), 10);

    await expect(
      promiseTimeout(hangingPromise, 200, { signal: controller.signal })
    ).rejects.toThrow(AbortError);
  });

  it('rejects immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort('Already done');

    await expect(
      promiseTimeout(Promise.resolve(1), 50, { signal: controller.signal })
    ).rejects.toThrow(AbortError);
  });

  it('propagates inner rejection before timeout', async () => {
    const failingPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Internal explosion')), 10);
    });

    await expect(promiseTimeout(failingPromise, 100)).rejects.toThrow('Internal explosion');
  });

  it('validates arguments strictly', async () => {
    await expect(promiseTimeout(Promise.resolve(1), -10)).rejects.toThrow(RangeError);
    await expect(promiseTimeout('not a promise' as any, 50)).rejects.toThrow(TypeError);
  });
});
