import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from './index.js';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes immediately on leading call and throttles intermediate calls', () => {
    const fn = vi.fn((x: number) => x * 2);
    const throttled = throttle(fn, 100);

    throttled(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);

    // Call several times within the 100ms window
    throttled(2);
    throttled(3);
    throttled(4);
    expect(fn).toHaveBeenCalledTimes(1);

    // Advance to end of window
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(4);
  });

  it('supports leading: false', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: false });

    throttled();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    throttled();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('supports trailing: false', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { trailing: false });

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    throttled();
    throttled();
    vi.advanceTimersByTime(100);

    // No trailing execution occurred
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels pending invocation via cancel()', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled(); // schedules trailing
    expect(throttled.isPending()).toBe(true);

    throttled.cancel();
    expect(throttled.isPending()).toBe(false);

    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flushes pending invocation via flush()', () => {
    const fn = vi.fn((x: number) => x * 10);
    const throttled = throttle(fn, 100);

    throttled(1);
    throttled(2);

    const flushedResult = throttled.flush();
    expect(flushedResult).toBe(20);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(throttled.isPending()).toBe(false);
  });

  it('throws errors on invalid arguments', () => {
    expect(() => throttle('not a function' as any, 100)).toThrow(TypeError);
    expect(() => throttle((() => {}) as any, -50)).toThrow(RangeError);
  });
});
