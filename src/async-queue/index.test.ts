import { describe, it, expect, vi } from 'vitest';
import { AsyncQueue } from './index.js';
import { AbortError, TimeoutError } from '../shared/errors.js';

describe('AsyncQueue', () => {
  it('respects concurrency limits', async () => {
    const queue = new AsyncQueue({ concurrency: 2 });
    let active = 0;
    let maxActive = 0;

    const makeTask = (ms: number, id: number) => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, ms));
      active--;
      return id;
    };

    const results = await Promise.all([
      queue.add(makeTask(30, 1)),
      queue.add(makeTask(30, 2)),
      queue.add(makeTask(30, 3)),
      queue.add(makeTask(30, 4)),
    ]);

    expect(results).toEqual([1, 2, 3, 4]);
    expect(maxActive).toBe(2);
  });

  it('executes tasks in priority order', async () => {
    const queue = new AsyncQueue({ concurrency: 1 });
    const order: number[] = [];

    const makeTask = (id: number) => async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(id);
      return id;
    };

    // Queue starts with concurrency 1, first task runs immediately
    const p1 = queue.add(makeTask(1), { priority: 0 });
    // Queued behind task 1
    const p2 = queue.add(makeTask(2), { priority: 1 });
    const p3 = queue.add(makeTask(3), { priority: 10 }); // Highest priority
    const p4 = queue.add(makeTask(4), { priority: 5 });

    await Promise.all([p1, p2, p3, p4]);

    // Task 1 was already running; then p3 (priority 10), then p4 (priority 5), then p2 (priority 1)
    expect(order).toEqual([1, 3, 4, 2]);
  });

  it('pauses and resumes task processing', async () => {
    const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
    const executed = vi.fn();

    const p = queue.add(async () => {
      executed();
      return 42;
    });

    expect(queue.isPaused).toBe(true);
    expect(queue.pending).toBe(0);
    expect(queue.size).toBe(1);
    expect(executed).not.toHaveBeenCalled();

    queue.resume();
    expect(queue.isPaused).toBe(false);

    const result = await p;
    expect(result).toBe(42);
    expect(executed).toHaveBeenCalledTimes(1);
  });

  it('clears waiting tasks from queue', async () => {
    const queue = new AsyncQueue({ concurrency: 1 });

    const p1 = queue.add(() => new Promise((r) => setTimeout(r, 30)));
    const p2 = queue.add(() => 'never');
    const p3 = queue.add(() => 'never');

    expect(queue.size).toBe(2);
    queue.clear();
    expect(queue.size).toBe(0);

    await expect(p2).rejects.toThrow(AbortError);
    await expect(p3).rejects.toThrow(AbortError);
    await p1; // Running task finishes normally
  });

  it('notifies on onEmpty and onIdle lifecycle events', async () => {
    const queue = new AsyncQueue({ concurrency: 2 });
    let emptyResolved = false;
    let idleResolved = false;

    // Call onEmpty and onIdle when already idle
    await queue.onEmpty();
    await queue.onIdle();

    queue.onEmpty().then(() => {
      emptyResolved = true;
    });

    queue.onIdle().then(() => {
      idleResolved = true;
    });

    await queue.addAll([
      () => new Promise((r) => setTimeout(r, 10)),
      () => new Promise((r) => setTimeout(r, 20)),
    ]);

    await queue.onIdle();
    expect(emptyResolved).toBe(true);
    expect(idleResolved).toBe(true);
  });

  it('supports per-task timeout', async () => {
    const queue = new AsyncQueue({ concurrency: 1 });

    const hangingTask = () => new Promise((resolve) => setTimeout(resolve, 100));

    await expect(queue.add(hangingTask, { timeout: 20 })).rejects.toThrow(TimeoutError);
  });

  it('supports per-task AbortSignal', async () => {
    const queue = new AsyncQueue({ concurrency: 1 });
    const controller = new AbortController();

    const p1 = queue.add(() => new Promise((r) => setTimeout(r, 20)));
    const p2 = queue.add(() => 'ok', { signal: controller.signal });

    controller.abort('Abort task 2');

    await expect(p2).rejects.toThrow(AbortError);
    await p1;
  });

  it('rejects task if signal is already aborted before adding', async () => {
    const queue = new AsyncQueue();
    const controller = new AbortController();
    controller.abort();

    await expect(queue.add(() => 1, { signal: controller.signal })).rejects.toThrow(AbortError);
  });

  it('allows dynamic concurrency updates', async () => {
    const queue = new AsyncQueue({ concurrency: 1 });
    expect(queue.concurrency).toBe(1);

    queue.concurrency = 4;
    expect(queue.concurrency).toBe(4);

    expect(() => {
      queue.concurrency = 0;
    }).toThrow(RangeError);
  });

  it('validates task and constructor options', async () => {
    expect(() => new AsyncQueue({ concurrency: 0 })).toThrow(RangeError);
    const queue = new AsyncQueue();
    await expect(queue.add(null as any)).rejects.toThrow(TypeError);
  });

  it('continues processing subsequent tasks when one rejects', async () => {
    const queue = new AsyncQueue({ concurrency: 1 });

    const p1 = queue.add(async () => {
      throw new Error('Task 1 failed');
    });
    const p2 = queue.add(async () => 'Task 2 success');

    await expect(p1).rejects.toThrow('Task 1 failed');
    const res2 = await p2;
    expect(res2).toBe('Task 2 success');
  });
});
