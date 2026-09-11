import { promiseTimeout } from '../promise-timeout/index.js';
import { AbortError } from '../shared/errors.js';

export interface TaskOptions {
  /**
   * Priority score of the task. Higher numbers execute earlier.
   * @default 0
   */
  priority?: number;

  /**
   * Timeout in milliseconds for this individual task.
   */
  timeout?: number;

  /**
   * AbortSignal to cancel this task before or during execution.
   */
  signal?: AbortSignal;
}

export interface AsyncQueueOptions {
  /**
   * Maximum number of tasks that can run concurrently.
   * @default 1
   */
  concurrency?: number;

  /**
   * Whether the queue starts in paused state.
   * @default false
   */
  autoStart?: boolean;
}

interface QueuedItem<T> {
  task: () => Promise<T> | T;
  priority: number;
  timeout?: number;
  signal?: AbortSignal;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  id: number;
}

/**
 * Manages concurrent asynchronous task execution with priority ordering, pausing, timeouts, and lifecycle hooks.
 */
export class AsyncQueue {
  private _concurrency: number;
  private _isPaused: boolean;
  private _pending = 0;
  private _queue: QueuedItem<any>[] = [];
  private _nextId = 0;
  private _emptyResolvers: Array<() => void> = [];
  private _idleResolvers: Array<() => void> = [];

  constructor(options: AsyncQueueOptions = {}) {
    const { concurrency = 1, autoStart = true } = options;
    if (typeof concurrency !== 'number' || Number.isNaN(concurrency) || concurrency < 1) {
      throw new RangeError('concurrency must be an integer greater than or equal to 1');
    }
    this._concurrency = Math.floor(concurrency);
    this._isPaused = !autoStart;
  }

  /**
   * Current concurrency limit.
   */
  public get concurrency(): number {
    return this._concurrency;
  }

  public set concurrency(value: number) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 1) {
      throw new RangeError('concurrency must be an integer greater than or equal to 1');
    }
    this._concurrency = Math.floor(value);
    this._processNext();
  }

  /**
   * Number of tasks waiting in queue.
   */
  public get size(): number {
    return this._queue.length;
  }

  /**
   * Number of tasks currently executing.
   */
  public get pending(): number {
    return this._pending;
  }

  /**
   * Whether queue execution is currently paused.
   */
  public get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Adds a task to the queue and returns a Promise for its completion.
   */
  public add<T>(task: () => Promise<T> | T, options: TaskOptions = {}): Promise<T> {
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('Task must be a function'));
    }

    const { priority = 0, timeout, signal } = options;

    if (signal?.aborted) {
      return Promise.reject(
        new AbortError(signal.reason ? String(signal.reason) : 'Task aborted before enqueue')
      );
    }

    return new Promise<T>((resolve, reject) => {
      const item: QueuedItem<T> = {
        task,
        priority,
        timeout,
        signal,
        resolve,
        reject,
        id: this._nextId++,
      };

      this._enqueue(item);
      this._processNext();
    });
  }

  /**
   * Adds multiple tasks to the queue and returns a Promise for all of their results.
   */
  public addAll<T>(
    tasks: Array<() => Promise<T> | T>,
    options: TaskOptions = {}
  ): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.add(task, options)));
  }

  /**
   * Pauses queue execution. Running tasks will complete, but waiting tasks will not start.
   */
  public pause(): void {
    this._isPaused = true;
  }

  /**
   * Resumes queue execution.
   */
  public resume(): void {
    if (this._isPaused) {
      this._isPaused = false;
      this._processNext();
    }
  }

  /**
   * Clears all waiting tasks from the queue.
   */
  public clear(): void {
    const dropped = this._queue.splice(0, this._queue.length);
    for (const item of dropped) {
      item.reject(new AbortError('Task cleared from queue'));
    }
    this._checkEmpty();
    this._checkIdle();
  }

  /**
   * Returns a promise that resolves when the queue has no waiting tasks (size === 0).
   */
  public onEmpty(): Promise<void> {
    if (this._queue.length === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this._emptyResolvers.push(resolve);
    });
  }

  /**
   * Returns a promise that resolves when the queue is completely idle (size === 0 and pending === 0).
   */
  public onIdle(): Promise<void> {
    if (this._queue.length === 0 && this._pending === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this._idleResolvers.push(resolve);
    });
  }

  private _enqueue<T>(item: QueuedItem<T>) {
    // Priority order insertion (higher priority first, FIFO within same priority)
    let insertIndex = this._queue.length;
    for (let i = 0; i < this._queue.length; i++) {
      if (item.priority > this._queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this._queue.splice(insertIndex, 0, item);
  }

  private _processNext(): void {
    if (this._isPaused) {
      return;
    }

    while (this._pending < this._concurrency && this._queue.length > 0) {
      const item = this._queue.shift()!;
      this._checkEmpty();

      if (item.signal?.aborted) {
        item.reject(
          new AbortError(item.signal.reason ? String(item.signal.reason) : 'Task aborted before execution')
        );
        continue;
      }

      this._pending++;
      this._executeItem(item);
    }
  }

  private async _executeItem<T>(item: QueuedItem<T>): Promise<void> {
    try {
      let runTask = () => Promise.resolve(item.task());
      let result: T;

      if (item.timeout !== undefined) {
        result = await promiseTimeout(runTask, item.timeout, { signal: item.signal });
      } else {
        result = await runTask();
      }

      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this._pending--;
      this._checkIdle();
      this._processNext();
    }
  }

  private _checkEmpty(): void {
    if (this._queue.length === 0 && this._emptyResolvers.length > 0) {
      const resolvers = this._emptyResolvers.splice(0, this._emptyResolvers.length);
      for (const r of resolvers) {
        r();
      }
    }
  }

  private _checkIdle(): void {
    if (this._queue.length === 0 && this._pending === 0 && this._idleResolvers.length > 0) {
      const resolvers = this._idleResolvers.splice(0, this._idleResolvers.length);
      for (const r of resolvers) {
        r();
      }
    }
  }
}

export default AsyncQueue;
