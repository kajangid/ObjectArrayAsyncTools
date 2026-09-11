import { debounce, type DebouncedFunction } from '../debounce/index.js';

export interface ThrottleOptions {
  /**
   * Invoke the callback on the leading edge of the cooldown window.
   * @default true
   */
  leading?: boolean;

  /**
   * Invoke the callback on the trailing edge of the cooldown window.
   * @default true
   */
  trailing?: boolean;
}

export type ThrottledFunction<Args extends unknown[], R> = DebouncedFunction<Args, R>;

/**
 * Creates a throttled function that only invokes `fn` at most once per every `waitMs` milliseconds.
 *
 * @param fn - The function to throttle.
 * @param waitMs - The throttle window in milliseconds.
 * @param options - Configuration options (leading, trailing).
 */
export function throttle<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  waitMs: number,
  options: ThrottleOptions = {}
): ThrottledFunction<Args, R> {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected a function to throttle');
  }

  if (typeof waitMs !== 'number' || Number.isNaN(waitMs) || waitMs < 0) {
    throw new RangeError('waitMs must be a non-negative number');
  }

  const leading = options.leading !== undefined ? !!options.leading : true;
  const trailing = options.trailing !== undefined ? !!options.trailing : true;

  return debounce(fn, waitMs, {
    leading,
    trailing,
    maxWait: waitMs,
  });
}

export default throttle;
