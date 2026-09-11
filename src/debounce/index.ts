export interface DebounceOptions {
  /**
   * Invoke the function on the leading edge of the timeout.
   * @default false
   */
  leading?: boolean;

  /**
   * Invoke the function on the trailing edge of the timeout.
   * @default true
   */
  trailing?: boolean;

  /**
   * The maximum time `fn` is allowed to be delayed before it is invoked.
   */
  maxWait?: number;
}

export interface DebouncedFunction<Args extends unknown[], R> {
  (...args: Args): R | undefined;
  /**
   * Cancels delayed invocations and resets timer states.
   */
  cancel(): void;
  /**
   * Immediately invokes any pending execution and returns its result.
   */
  flush(): R | undefined;
  /**
   * Returns true if any invocation is currently pending.
   */
  isPending(): boolean;
  /**
   * Alias for `isPending()`.
   */
  pending(): boolean;
}

/**
 * Creates a debounced function that delays invoking `fn` until after `waitMs` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param fn - The function to debounce.
 * @param waitMs - The debounce delay in milliseconds.
 * @param options - Configuration options (leading, trailing, maxWait).
 */
export function debounce<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  waitMs: number,
  options: DebounceOptions = {}
): DebouncedFunction<Args, R> {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected a function to debounce');
  }

  if (typeof waitMs !== 'number' || Number.isNaN(waitMs) || waitMs < 0) {
    throw new RangeError('waitMs must be a non-negative number');
  }

  const leading = !!options.leading;
  const trailing = options.trailing !== undefined ? !!options.trailing : true;
  const maxWait = options.maxWait;

  if (maxWait !== undefined && (typeof maxWait !== 'number' || Number.isNaN(maxWait) || maxWait < 0)) {
    throw new RangeError('maxWait must be a non-negative number');
  }

  const maxing = maxWait !== undefined;
  const maxWaitMs = maxing ? Math.max(maxWait, waitMs) : 0;

  let lastArgs: Args | undefined;
  let lastThis: any;
  let result: R | undefined;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;

  function invoke(time: number): R | undefined {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;
    if (args !== undefined) {
      result = fn.apply(thisArg, args);
    }
    return result;
  }

  function startTimer(pendingFunc: () => void, wait: number) {
    timerId = setTimeout(pendingFunc, wait);
  }

  function cancelTimer() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  }

  function leadingEdge(time: number): R | undefined {
    lastInvokeTime = time;
    startTimer(timerExpired, waitMs);
    return leading ? invoke(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime ?? 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = waitMs - timeSinceLastCall;

    return maxing
      ? Math.min(timeWaiting, maxWaitMs - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    if (lastCallTime === undefined) {
      return true;
    }
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      timeSinceLastCall >= waitMs ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWaitMs)
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }
    startTimer(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number): R | undefined {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invoke(time);
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function cancel() {
    cancelTimer();
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    lastThis = undefined;
  }

  function flush(): R | undefined {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function isPending(): boolean {
    return timerId !== undefined;
  }

  function debounced(this: any, ...args: Args): R | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        cancelTimer();
        startTimer(timerExpired, waitMs);
        return invoke(lastCallTime);
      }
    }

    if (timerId === undefined) {
      startTimer(timerExpired, waitMs);
    }

    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.isPending = isPending;
  debounced.pending = isPending;

  return debounced;
}

export default debounce;
