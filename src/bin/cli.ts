#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { spawn } from 'node:child_process';
import { VERSION } from '../version.js';
import { deepClone } from '../deep-clone/index.js';
import { deepEqual } from '../deep-equal/index.js';
import { objectDiff } from '../object-diff/index.js';
import { objectClean } from '../object-clean/index.js';
import { chunk } from '../chunk/index.js';
import { groupBy } from '../group-by/index.js';
import { uniqueArray } from '../unique-array/index.js';
import { smartSort } from '../smart-sort/index.js';
import { retry } from '../retry/index.js';
import { promiseTimeout } from '../promise-timeout/index.js';

export function printHelp(): void {
  const text = `
@omnidev-tools/object-array-async-tools CLI (v${VERSION})

USAGE:
  oa-tools <command> [options] [arguments]
  cat data.json | oa-tools <command> [options]

COMMANDS:
  clone [file]                              Deeply clone JSON input
  equal <file1> <file2>                     Check if two JSON structures are deeply equal
  diff <file1> [file2]                      Display structural diff (flags: --deep, --check)
  clean [file]                              Remove null/empty fields (flags: --empty-strings, --empty-objects, --empty-arrays)
  chunk [file] --size <n>                   Split JSON array into smaller chunks
  group [file] --by <field>                 Group array of objects by property key
  unique [file] [--by <field>] [--deep]     Remove duplicate array elements
  sort [file] [--by <field>] [--order asc|desc]  Sort array with natural string sorting
  retry [options] -- <cmd...>               Execute command with retry logic (--retries, --delay, --backoff)
  timeout --ms <ms> -- <cmd...>             Execute command with deadline timeout

GLOBAL FLAGS:
  -h, --help                                Show help information
  -v, --version                             Show version information

EXIT CODES:
  0: Success (or match)
  1: Operation failure / Difference detected
  2: Command usage error (invalid syntax / missing parameters)
`;
  process.stdout.write(text.trim() + '\n');
}

/**
 * Reads all data from stdin as a string.
 */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY || process.stdin.destroyed || process.stdin.readableEnded) {
    return '';
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const onData = (chunk: any) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks).toString('utf-8').trim());
    };
    const onError = () => {
      cleanup();
      resolve('');
    };

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.removeListener('end', onEnd);
      process.stdin.removeListener('error', onError);
    };

    process.stdin.on('data', onData);
    process.stdin.on('end', onEnd);
    process.stdin.on('error', onError);

    // If stdin is already ended or nothing arrives after brief tick
    if (process.stdin.readableEnded) {
      cleanup();
      resolve('');
    }
  });
}

export { parseArgs } from '../shared/parser.js';
import { parseArgs } from '../shared/parser.js';

function resolveJsonInput(
  fileArg: string | undefined,
  stdinContent?: string
): unknown {
  let content = '';
  if (fileArg && fileArg !== '-') {
    try {
      content = readFileSync(fileArg, 'utf-8');
    } catch (err: any) {
      throw new Error(`Failed to read file '${fileArg}': ${err.message}`);
    }
  } else if (stdinContent) {
    content = stdinContent;
  } else {
    throw new Error('No input provided via file or stdin');
  }

  try {
    return JSON.parse(content);
  } catch (err: any) {
    throw new Error(`Invalid JSON input: ${err.message}`);
  }
}

/**
 * Main CLI execution entrypoint.
 */
export async function runCli(
  argv = process.argv.slice(2),
  stdinOverride?: string
): Promise<number> {
  const binName = basename(process.argv[1] || '', extname(process.argv[1] || ''));
  let effectiveArgs = [...argv];
  if (binName.startsWith('oa-') && binName !== 'oa-tools') {
    const aliasCommand = binName.slice(3);
    effectiveArgs = [aliasCommand, ...argv];
  }

  if (effectiveArgs.includes('--version') || effectiveArgs.includes('-v')) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  if (effectiveArgs.length === 0 || effectiveArgs.includes('--help') || effectiveArgs.includes('-h')) {
    printHelp();
    return 0;
  }

  const command = effectiveArgs[0];
  const restArgs = effectiveArgs.slice(1);
  const { flags, positionals, commandArgs } = parseArgs(restArgs);

  // Helper to read stdin only if needed
  const getStdin = async (): Promise<string> => {
    if (stdinOverride !== undefined) {
      return stdinOverride;
    }
    return await readStdin();
  };

  try {
    switch (command) {
      case 'clone': {
        const stdin = positionals.length === 0 || positionals[0] === '-' ? await getStdin() : undefined;
        const data = resolveJsonInput(positionals[0], stdin);
        const cloned = deepClone(data);
        process.stdout.write(JSON.stringify(cloned, null, 2) + '\n');
        return 0;
      }

      case 'equal': {
        if (positionals.length < 2) {
          process.stderr.write('Error: equal command requires two file arguments\n');
          return 2;
        }
        const a = resolveJsonInput(positionals[0]);
        const b = resolveJsonInput(positionals[1]);
        const areEqual = deepEqual(a, b);
        process.stdout.write(JSON.stringify({ equal: areEqual }) + '\n');
        return areEqual ? 0 : 1;
      }

      case 'diff': {
        let a: any;
        let b: any;
        if (positionals.length >= 2) {
          a = resolveJsonInput(positionals[0]);
          b = resolveJsonInput(positionals[1]);
        } else if (positionals.length === 1) {
          const stdin = await getStdin();
          a = resolveJsonInput(undefined, stdin);
          b = resolveJsonInput(positionals[0]);
        } else {
          process.stderr.write('Error: diff command requires at least one file or stdin input\n');
          return 2;
        }

        const deep = flags.deep !== false && flags.deep !== 'false';
        const diffResult = objectDiff(a, b, { deep });
        process.stdout.write(JSON.stringify(diffResult, null, 2) + '\n');

        if (flags.check && diffResult.hasChanges) {
          return 1;
        }
        return 0;
      }

      case 'clean': {
        const stdin = positionals.length === 0 || positionals[0] === '-' ? await getStdin() : undefined;
        const data = resolveJsonInput(positionals[0], stdin);
        const cleaned = objectClean(data, {
          emptyStrings: Boolean(flags['empty-strings']),
          emptyObjects: Boolean(flags['empty-objects']),
          emptyArrays: Boolean(flags['empty-arrays']),
          nans: Boolean(flags.nans),
          nulls: flags['no-nulls'] ? false : true,
          undefineds: flags['no-undefineds'] ? false : true,
        });
        process.stdout.write(JSON.stringify(cleaned, null, 2) + '\n');
        return 0;
      }

      case 'chunk': {
        const sizeStr = flags.size ?? flags.s;
        if (!sizeStr) {
          process.stderr.write('Error: --size flag is required for chunk\n');
          return 2;
        }
        const size = parseInt(String(sizeStr), 10);
        const stdin = positionals.length === 0 || positionals[0] === '-' ? await getStdin() : undefined;
        const data = resolveJsonInput(positionals[0], stdin);
        if (!Array.isArray(data)) {
          process.stderr.write('Error: chunk requires a JSON array input\n');
          return 1;
        }
        const chunks = chunk(data, size);
        process.stdout.write(JSON.stringify(chunks, null, 2) + '\n');
        return 0;
      }

      case 'group': {
        const by = String(flags.by ?? flags.b ?? '');
        if (!by) {
          process.stderr.write('Error: --by flag is required for group\n');
          return 2;
        }
        const stdin = positionals.length === 0 || positionals[0] === '-' ? await getStdin() : undefined;
        const data = resolveJsonInput(positionals[0], stdin);
        if (!Array.isArray(data)) {
          process.stderr.write('Error: group requires a JSON array input\n');
          return 1;
        }
        const grouped = groupBy(data, by);
        process.stdout.write(JSON.stringify(grouped, null, 2) + '\n');
        return 0;
      }

      case 'unique': {
        const by = flags.by ? String(flags.by) : undefined;
        const deep = Boolean(flags.deep);
        const stdin = positionals.length === 0 || positionals[0] === '-' ? await getStdin() : undefined;
        const data = resolveJsonInput(positionals[0], stdin);
        if (!Array.isArray(data)) {
          process.stderr.write('Error: unique requires a JSON array input\n');
          return 1;
        }
        const unique = uniqueArray(data, { by, deep });
        process.stdout.write(JSON.stringify(unique, null, 2) + '\n');
        return 0;
      }

      case 'sort': {
        const by = flags.by ? String(flags.by) : undefined;
        const order = flags.order === 'desc' ? 'desc' : 'asc';
        const natural = flags['no-natural'] ? false : true;
        const stdin = positionals.length === 0 || positionals[0] === '-' ? await getStdin() : undefined;
        const data = resolveJsonInput(positionals[0], stdin);
        if (!Array.isArray(data)) {
          process.stderr.write('Error: sort requires a JSON array input\n');
          return 1;
        }
        const sorted = smartSort(data, { by, order, natural });
        process.stdout.write(JSON.stringify(sorted, null, 2) + '\n');
        return 0;
      }

      case 'retry': {
        if (commandArgs.length === 0) {
          process.stderr.write('Error: retry requires a command after --\n');
          return 2;
        }
        const retries = flags.retries ? parseInt(String(flags.retries), 10) : 3;
        const delay = flags.delay ? parseInt(String(flags.delay), 10) : 1000;
        const backoff = (flags.backoff as any) || 'exponential';

        await retry(
          async () => {
            await executeChildProcess(commandArgs[0], commandArgs.slice(1));
          },
          { retries, delay, backoff }
        );
        return 0;
      }

      case 'timeout': {
        const msStr = flags.ms ?? flags.m;
        if (!msStr) {
          process.stderr.write('Error: --ms flag is required for timeout\n');
          return 2;
        }
        if (commandArgs.length === 0) {
          process.stderr.write('Error: timeout requires a command after --\n');
          return 2;
        }
        const ms = parseInt(String(msStr), 10);
        await promiseTimeout(
          () => executeChildProcess(commandArgs[0], commandArgs.slice(1)),
          ms
        );
        return 0;
      }

      default:
        process.stderr.write(`Error: Unknown command '${command}'\n\n`);
        printHelp();
        return 2;
    }
  } catch (err: any) {
    process.stderr.write(`Error: ${err.message}\n`);
    return 1;
  }
}

function executeChildProcess(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
    child.on('error', (err) => reject(err));
  });
}

// Execute when run directly as CLI binary
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.mjs') || process.argv[1]?.endsWith('cli.cjs')) {
  runCli().then((code) => {
    if (code !== 0) {
      process.exit(code);
    }
  });
}
