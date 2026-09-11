import { describe, it, expect } from 'vitest';
import { parseArgs } from './parser.js';

describe('shared/parser', () => {
  it('parses boolean and value flags with long names', () => {
    const args = ['--verbose', '--size', '20', '--name=test-app'];
    const parsed = parseArgs(args);

    expect(parsed.flags.verbose).toBe(true);
    expect(parsed.flags.size).toBe('20');
    expect(parsed.flags.name).toBe('test-app');
    expect(parsed.positionals).toHaveLength(0);
  });

  it('parses short flags with values and flags', () => {
    const args = ['-v', '-s', '5', '-o=desc'];
    const parsed = parseArgs(args);

    expect(parsed.flags.v).toBe(true);
    expect(parsed.flags.s).toBe('5');
    expect(parsed.flags.o).toBe('desc');
  });

  it('collects positional arguments in order', () => {
    const args = ['clone', 'file1.json', 'file2.json'];
    const parsed = parseArgs(args);

    expect(parsed.positionals).toEqual(['clone', 'file1.json', 'file2.json']);
    expect(Object.keys(parsed.flags)).toHaveLength(0);
  });

  it('separates sub-command arguments after double-dash delimiter', () => {
    const args = ['retry', '--retries', '3', '--', 'curl', '-I', 'https://example.com'];
    const parsed = parseArgs(args);

    expect(parsed.positionals).toEqual(['retry']);
    expect(parsed.flags.retries).toBe('3');
    expect(parsed.commandArgs).toEqual(['curl', '-I', 'https://example.com']);
  });

  it('handles empty argument lists', () => {
    const parsed = parseArgs([]);
    expect(parsed.positionals).toEqual([]);
    expect(parsed.commandArgs).toEqual([]);
    expect(Object.keys(parsed.flags)).toHaveLength(0);
  });
});
