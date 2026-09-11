import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './index.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delays execution until waitMs elapses', () => {
    const fn = vi.fn((x: number) => x * 2);
    const debounced = debounce(fn, 100);

    debounced(1);
    debounced(2);
    debounced(3);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('supports leading edge execution', () => {
    const fn = vi.fn((x: number) => x * 10);
    const debounced = debounce(fn, 100, { leading: true, trailing: false });

    debounced(5);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(5);

    // Subsequent calls within waitMs do not trigger execution
    debounced(6);
    vi.advanceTimersByTime(50);
    debounced(7);
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('supports maxWait constraint', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { maxWait: 250 });

    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    // At 240ms, not yet reached maxWait 250
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    // At 260ms, maxWait triggered invocation
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels pending invocation via cancel()', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(debounced.isPending()).toBe(true);
    expect(debounced.pending()).toBe(true);

    debounced.cancel();
    expect(debounced.isPending()).toBe(false);

    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it('immediately triggers pending invocation via flush()', () => {
    const fn = vi.fn((val: string) => `result:${val}`);
    const debounced = debounce(fn, 100);

    debounced('urgent');
    expect(debounced.isPending()).toBe(true);

    const result = debounced.flush();
    expect(result).toBe('result:urgent');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(debounced.isPending()).toBe(false);

    // Later timer expiry does not call it again
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws TypeError and RangeError on invalid parameters', () => {
    expect(() => debounce(null as any, 100)).toThrow(TypeError);
    expect(() => debounce((() => {}) as any, -10)).toThrow(RangeError);
    expect(() => debounce((() => {}) as any, 100, { maxWait: -5 })).toThrow(RangeError);
  });
});
