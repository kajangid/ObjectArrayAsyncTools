import { describe, it, expect, vi } from 'vitest';
import { retry, calculateDelay } from './index.js';
import { AbortError } from '../shared/errors.js';

describe('retry', () => {
  it('resolves immediately when task succeeds on first attempt', async () => {
    const fn = vi.fn(async () => 'success');
    const result = await retry(fn, { retries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({
      attempt: 1,
      retriesLeft: 3,
      lastError: undefined,
    });
  });

  it('retries until success within the retry limit', async () => {
    let count = 0;
    const fn = vi.fn(async (ctx) => {
      count++;
      if (count < 3) {
        throw new Error(`Attempt ${ctx.attempt} failed`);
      }
      return 'recovered';
    });

    const onRetry = vi.fn();
    const result = await retry(fn, {
      retries: 3,
      delay: 5,
      backoff: 'fixed',
      onRetry,
    });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('throws final error when retries are exhausted', async () => {
    const error = new Error('Persistent failure');
    const fn = vi.fn(async () => {
      throw error;
    });

    await expect(retry(fn, { retries: 2, delay: 5 })).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const fn = vi.fn(async (ctx) => {
      if (ctx.attempt === 1) {
        throw new Error('404 Not Found');
      }
      return 'ok';
    });

    const shouldRetry = vi.fn((err: any) => !err.message.includes('404'));

    await expect(
      retry(fn, { retries: 3, delay: 5, shouldRetry })
    ).rejects.toThrow('404 Not Found');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it('cancels retry immediately when AbortSignal is aborted', async () => {
    const controller = new AbortController();
    const fn = vi.fn(async () => {
      throw new Error('network down');
    });

    setTimeout(() => controller.abort('User cancelled'), 10);

    await expect(
      retry(fn, {
        retries: 5,
        delay: 50,
        signal: controller.signal,
      })
    ).rejects.toThrow(AbortError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws AbortError if signal is already aborted prior to call', async () => {
    const controller = new AbortController();
    controller.abort('pre-aborted');

    await expect(
      retry(async () => 1, { signal: controller.signal })
    ).rejects.toThrow(AbortError);
  });

  it('throws RangeError for invalid retries count or TypeError for invalid fn', async () => {
    await expect(retry(async () => 1, { retries: -1 })).rejects.toThrow(RangeError);
    await expect(retry(async () => 1, { retries: 2.5 })).rejects.toThrow(RangeError);
    await expect(retry('not a function' as any)).rejects.toThrow(TypeError);
  });

  describe('calculateDelay', () => {
    it('computes exponential backoff', () => {
      expect(calculateDelay(1, { delay: 100, backoff: 'exponential', factor: 2 })).toBe(100);
      expect(calculateDelay(2, { delay: 100, backoff: 'exponential', factor: 2 })).toBe(200);
      expect(calculateDelay(3, { delay: 100, backoff: 'exponential', factor: 2 })).toBe(400);
    });

    it('computes linear backoff', () => {
      expect(calculateDelay(1, { delay: 100, backoff: 'linear' })).toBe(100);
      expect(calculateDelay(2, { delay: 100, backoff: 'linear' })).toBe(200);
      expect(calculateDelay(3, { delay: 100, backoff: 'linear' })).toBe(300);
    });

    it('computes fixed backoff', () => {
      expect(calculateDelay(1, { delay: 150, backoff: 'fixed' })).toBe(150);
      expect(calculateDelay(5, { delay: 150, backoff: 'fixed' })).toBe(150);
    });

    it('clamps to maxDelay', () => {
      expect(calculateDelay(10, { delay: 1000, factor: 2, maxDelay: 5000 })).toBe(5000);
    });

    it('supports custom delay function', () => {
      const customFn = (attempt: number) => attempt * 50;
      expect(calculateDelay(4, { delay: customFn })).toBe(200);
    });

    it('applies jitter within range', () => {
      const delay = calculateDelay(2, { delay: 100, factor: 2, jitter: true });
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(200);

      const fullJitter = calculateDelay(2, { delay: 100, factor: 2, jitter: 'full' });
      expect(fullJitter).toBeGreaterThanOrEqual(0);
      expect(fullJitter).toBeLessThanOrEqual(200);

      const halfJitter = calculateDelay(2, { delay: 100, factor: 2, jitter: 'half' });
      expect(halfJitter).toBeGreaterThanOrEqual(100);
      expect(halfJitter).toBeLessThanOrEqual(200);
    });
  });
});
