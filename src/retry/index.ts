import { AbortError } from '../shared/errors.js';

export interface RetryContext {
  /**
   * The current attempt index (starts at 1).
   */
  attempt: number;

  /**
   * The number of retry attempts remaining after the current one.
   */
  retriesLeft: number;

  /**
   * The error thrown by the previous attempt, if any.
   */
  lastError?: unknown;
}

export type BackoffStrategy = 'fixed' | 'exponential' | 'linear';
export type JitterStrategy = boolean | 'full' | 'half';

export interface RetryOptions {
  /**
   * Total number of retry attempts after the initial failure.
   * @default 3
   */
  retries?: number;

  /**
   * Initial delay in milliseconds between attempts, or a callback computing delay.
   * @default 1000
   */
  delay?: number | ((attempt: number) => number);

  /**
   * Backoff rate algorithm.
   * @default 'exponential'
   */
  backoff?: BackoffStrategy;

  /**
   * Multiplier factor for exponential backoff.
   * @default 2
   */
  factor?: number;

  /**
   * Randomize delay intervals to prevent thundering herd.
   * @default false
   */
  jitter?: JitterStrategy;

  /**
   * Maximum delay upper bound in milliseconds.
   * @default Infinity
   */
  maxDelay?: number;

  /**
   * Filter callback deciding whether an error should be retried.
   * If returns false, retry loop terminates immediately and rethrows the error.
   */
  shouldRetry?: (error: unknown, context: RetryContext) => boolean | Promise<boolean>;

  /**
   * Callback invoked before each subsequent retry attempt.
   */
  onRetry?: (error: unknown, context: RetryContext, nextDelayMs: number) => void | Promise<void>;

  /**
   * AbortSignal to cancel pending retries early.
   */
  signal?: AbortSignal;
}

/**
 * Calculates backoff delay based on strategy, factor, jitter, and maxDelay constraints.
 */
export function calculateDelay(attempt: number, options: RetryOptions): number {
  const {
    delay = 1000,
    backoff = 'exponential',
    factor = 2,
    jitter = false,
    maxDelay = Number.POSITIVE_INFINITY,
  } = options;

  let baseDelay: number;
  if (typeof delay === 'function') {
    baseDelay = delay(attempt);
  } else {
    switch (backoff) {
      case 'linear':
        baseDelay = delay * attempt;
        break;
      case 'fixed':
        baseDelay = delay;
        break;
      case 'exponential':
      default:
        baseDelay = delay * Math.pow(factor, attempt - 1);
        break;
    }
  }

  // Apply jitter
  let calculatedDelay = baseDelay;
  if (jitter === true || jitter === 'full') {
    calculatedDelay = Math.random() * baseDelay;
  } else if (jitter === 'half') {
    calculatedDelay = baseDelay / 2 + Math.random() * (baseDelay / 2);
  }

  return Math.min(Math.max(0, calculatedDelay), maxDelay);
}

/**
 * Automatically retries an asynchronous operation with configurable backoff, jitter, and abort control.
 *
 * @param fn - The asynchronous operation to execute with retry context.
 * @param options - Configuration options for retries, delays, and error filters.
 * @returns The resolved value of the successful operation.
 */
export async function retry<T>(
  fn: (context: RetryContext) => Promise<T> | T,
  options: RetryOptions = {}
): Promise<T> {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected an asynchronous function to retry');
  }

  const { retries = 3, shouldRetry, onRetry, signal } = options;

  if (retries < 0 || !Number.isInteger(retries)) {
    throw new RangeError('retries must be a non-negative integer');
  }

  let attempt = 1;
  let lastError: unknown;

  while (true) {
    if (signal?.aborted) {
      throw new AbortError(signal.reason ? String(signal.reason) : 'Retry operation aborted');
    }

    const retriesLeft = retries - (attempt - 1);
    const context: RetryContext = { attempt, retriesLeft, lastError };

    try {
      return await fn(context);
    } catch (error) {
      lastError = error;

      if (retriesLeft <= 0) {
        throw error;
      }

      if (shouldRetry) {
        const canRetry = await shouldRetry(error, context);
        if (!canRetry) {
          throw error;
        }
      }

      const nextDelay = calculateDelay(attempt, options);

      if (onRetry) {
        await onRetry(error, context, nextDelay);
      }

      // Wait with abort signal awareness
      await sleepWithSignal(nextDelay, signal);
      attempt++;
    }
  }
}

function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new AbortError(signal.reason ? String(signal.reason) : 'Retry aborted'));
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onAbort = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      cleanup();
      reject(new AbortError(signal?.reason ? String(signal.reason) : 'Retry aborted'));
    };

    const onTimeout = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    timer = setTimeout(onTimeout, ms);
  });
}

export default retry;
