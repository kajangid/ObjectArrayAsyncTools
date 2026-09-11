/**
 * Package-wide error classes.
 */

export class BaseError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'ERR_BASE') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class TimeoutError extends BaseError {
  public readonly timeoutMs: number;

  constructor(message = 'Operation timed out', timeoutMs: number) {
    super(message, 'ERR_TIMEOUT');
    this.timeoutMs = timeoutMs;
  }
}

export class AbortError extends BaseError {
  constructor(message = 'The operation was aborted') {
    super(message, 'ERR_ABORTED');
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 'ERR_VALIDATION');
  }
}

export class QueueError extends BaseError {
  constructor(message: string) {
    super(message, 'ERR_QUEUE');
  }
}
