import { TimeoutError, AbortError } from '../shared/errors.js';

export interface TimeoutOptions<T> {
  /**
   * Fallback value or async factory returned instead of rejecting when timeout expires.
   */
  fallback?: () => Promise<T> | T;

  /**
   * Custom error instance or error factory invoked when timeout expires.
   */
  customError?: Error | (() => Error);

  /**
   * Custom error message if standard TimeoutError is thrown.
   */
  message?: string;

  /**
   * AbortSignal to cancel waiting early.
   */
  signal?: AbortSignal;
}

/**
 * Wraps a promise or promise-returning factory with a deadline timeout.
 * Automatically clears internal timers to prevent event-loop hangs.
 *
 * @param promiseOrFactory - The target Promise or a factory function returning a Promise.
 * @param ms - Timeout duration in milliseconds.
 * @param options - Configuration options for fallbacks, errors, and cancellation.
 * @returns The resolved result of the promise or fallback.
 * @throws {TimeoutError} If duration elapses before resolution and no fallback is specified.
 * @throws {AbortError} If the provided signal is aborted before resolution.
 */
export async function promiseTimeout<T>(
  promiseOrFactory: Promise<T> | (() => Promise<T>),
  ms: number,
  options: TimeoutOptions<T> = {}
): Promise<T> {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) {
    throw new RangeError('Timeout duration (ms) must be a non-negative number');
  }

  const { fallback, customError, message, signal } = options;

  if (signal?.aborted) {
    throw new AbortError(signal.reason ? String(signal.reason) : 'Operation aborted');
  }

  // Resolve target promise
  let targetPromise: Promise<T>;
  try {
    targetPromise =
      typeof promiseOrFactory === 'function'
        ? promiseOrFactory()
        : promiseOrFactory;
  } catch (syncError) {
    return Promise.reject(syncError);
  }

  if (!targetPromise || typeof (targetPromise as any).then !== 'function') {
    throw new TypeError('Expected a Promise or a function that returns a Promise');
  }

  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const cleanup = () => {
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      if (settled) return;
      cleanup();
      reject(new AbortError(signal?.reason ? String(signal.reason) : 'Operation aborted'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    timer = setTimeout(async () => {
      if (settled) return;
      cleanup();

      if (fallback) {
        try {
          const fallbackVal = await fallback();
          resolve(fallbackVal);
        } catch (fbErr) {
          reject(fbErr);
        }
        return;
      }

      if (customError) {
        const err = typeof customError === 'function' ? customError() : customError;
        reject(err);
        return;
      }

      reject(new TimeoutError(message ?? `Promise timed out after ${ms}ms`, ms));
    }, ms);

    targetPromise.then(
      (value) => {
        if (settled) return;
        cleanup();
        resolve(value);
      },
      (error) => {
        if (settled) return;
        cleanup();
        reject(error);
      }
    );
  });
}

export default promiseTimeout;
