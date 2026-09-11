import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCli, parseArgs } from './cli.js';
import { VERSION } from '../version.js';

describe('CLI Argument Parser', () => {
  it('parses flags and positional arguments', () => {
    const parsed = parseArgs(['clean', 'data.json', '--empty-strings', '--size', '10', '-b', 'category']);
    expect(parsed.positionals).toEqual(['clean', 'data.json']);
    expect(parsed.flags['empty-strings']).toBe(true);
    expect(parsed.flags.size).toBe('10');
    expect(parsed.flags.b).toBe('category');
  });

  it('separates command arguments after -- delimiter', () => {
    const parsed = parseArgs(['retry', '--retries', '2', '--', 'npm', 'test']);
    expect(parsed.positionals).toEqual(['retry']);
    expect(parsed.flags.retries).toBe('2');
    expect(parsed.commandArgs).toEqual(['npm', 'test']);
  });
});

describe('CLI Commands Execution', () => {
  let stdoutOutput = '';
  let stderrOutput = '';
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;

  const tmpFiles: string[] = [];

  function createTempJson(data: any): string {
    const path = resolve(process.cwd(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(path, JSON.stringify(data), 'utf-8');
    tmpFiles.push(path);
    return path;
  }

  beforeEach(() => {
    stdoutOutput = '';
    stderrOutput = '';
    process.stdout.write = vi.fn((str: any) => {
      stdoutOutput += str;
      return true;
    }) as any;
    process.stderr.write = vi.fn((str: any) => {
      stderrOutput += str;
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    for (const f of tmpFiles) {
      try {
        unlinkSync(f);
      } catch {}
    }
    tmpFiles.length = 0;
  });

  it('prints help with --help flag and exits with code 0', async () => {
    const code = await runCli(['--help']);
    expect(code).toBe(0);
    expect(stdoutOutput).toContain('USAGE:');
    expect(stdoutOutput).toContain('COMMANDS:');
  });

  it('prints version with --version flag directly before help checks', async () => {
    const code = await runCli(['--version']);
    expect(code).toBe(0);
    expect(stdoutOutput.trim()).toBe(VERSION);
  });

  it('returns code 2 for unknown commands', async () => {
    const code = await runCli(['nonexistent-command']);
    expect(code).toBe(2);
    expect(stderrOutput).toContain("Error: Unknown command 'nonexistent-command'");
  });

  it('executes clone command on a JSON file', async () => {
    const file = createTempJson({ user: 'Alice', age: 30 });
    const code = await runCli(['clone', file]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutOutput);
    expect(parsed).toEqual({ user: 'Alice', age: 30 });
  });

  it('executes clone command from piped stdin', async () => {
    const input = JSON.stringify({ piped: true, count: 42 });
    const code = await runCli(['clone', '-'], input);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutOutput);
    expect(parsed).toEqual({ piped: true, count: 42 });
  });

  it('executes equal command on two identical files', async () => {
    const file1 = createTempJson({ a: 1, b: [2, 3] });
    const file2 = createTempJson({ a: 1, b: [2, 3] });

    const code = await runCli(['equal', file1, file2]);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutOutput)).toEqual({ equal: true });
  });

  it('executes equal command on two differing files', async () => {
    const file1 = createTempJson({ a: 1 });
    const file2 = createTempJson({ a: 2 });

    const code = await runCli(['equal', file1, file2]);
    expect(code).toBe(1);
    expect(JSON.parse(stdoutOutput)).toEqual({ equal: false });
  });

  it('executes diff command and returns changes', async () => {
    const file1 = createTempJson({ a: 1, b: 2 });
    const file2 = createTempJson({ b: 20, c: 3 });

    const code = await runCli(['diff', file1, file2, '--check']);
    expect(code).toBe(1); // --check returns 1 when differences are found
    const diff = JSON.parse(stdoutOutput);
    expect(diff.hasChanges).toBe(true);
    expect(diff.added).toEqual({ c: 3 });
    expect(diff.removed).toEqual({ a: 1 });
  });

  it('executes diff comparing stdin against a file', async () => {
    const file2 = createTempJson({ a: 1, b: 99 });
    const code = await runCli(['diff', file2], JSON.stringify({ a: 1, b: 2 }));
    expect(code).toBe(0);
    const diff = JSON.parse(stdoutOutput);
    expect(diff.hasChanges).toBe(true);
    expect(diff.updated.b).toEqual({ before: 2, after: 99 });
  });

  it('executes clean command with --empty-strings and --empty-objects', async () => {
    const file = createTempJson({
      name: 'Test',
      blank: '',
      empty: {},
      nil: null,
    });

    const code = await runCli(['clean', file, '--empty-strings', '--empty-objects']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutOutput)).toEqual({ name: 'Test' });
  });

  it('executes chunk command with --size', async () => {
    const file = createTempJson([1, 2, 3, 4, 5]);
    const code = await runCli(['chunk', file, '--size', '2']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutOutput)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('fails chunk command when --size is missing', async () => {
    const file = createTempJson([1, 2]);
    const code = await runCli(['chunk', file]);
    expect(code).toBe(2);
    expect(stderrOutput).toContain('Error: --size flag is required');
  });

  it('executes group command with --by', async () => {
    const file = createTempJson([
      { tag: 'A', v: 1 },
      { tag: 'B', v: 2 },
      { tag: 'A', v: 3 },
    ]);
    const code = await runCli(['group', file, '--by', 'tag']);
    expect(code).toBe(0);
    const result = JSON.parse(stdoutOutput);
    expect(result.A).toHaveLength(2);
    expect(result.B).toHaveLength(1);
  });

  it('executes unique command with --by', async () => {
    const file = createTempJson([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 1, name: 'Alice 2' },
    ]);
    const code = await runCli(['unique', file, '--by', 'id']);
    expect(code).toBe(0);
    const result = JSON.parse(stdoutOutput);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('executes sort command with --by and --order desc', async () => {
    const file = createTempJson([
      { name: 'Beta', val: 10 },
      { name: 'Alpha', val: 30 },
      { name: 'Gamma', val: 20 },
    ]);
    const code = await runCli(['sort', file, '--by', 'val', '--order', 'desc']);
    expect(code).toBe(0);
    const result = JSON.parse(stdoutOutput);
    expect(result.map((r: any) => r.val)).toEqual([30, 20, 10]);
  });
});
