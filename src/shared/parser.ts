/**
 * Command-line argument and flag parsing utilities.
 */

export interface ParsedCommandLine {
  flags: Record<string, string | boolean>;
  positionals: string[];
  commandArgs: string[];
}

/**
 * Parses raw CLI arguments into flags, positional parameters, and sub-commands following `--`.
 *
 * @param rawArgs - Raw argv array (e.g. process.argv.slice(2)).
 * @returns Parsed structured command line arguments.
 */
export function parseArgs(rawArgs: string[]): ParsedCommandLine {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let commandArgs: string[] = [];

  const doubleDashIdx = rawArgs.indexOf('--');
  let parseList = rawArgs;
  if (doubleDashIdx !== -1) {
    parseList = rawArgs.slice(0, doubleDashIdx);
    commandArgs = rawArgs.slice(doubleDashIdx + 1);
  }

  for (let i = 0; i < parseList.length; i++) {
    const arg = parseList[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=', 2);
        flags[k] = v;
      } else if (i + 1 < parseList.length && !parseList[i + 1].startsWith('-')) {
        flags[key] = parseList[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);
      if (key.includes('=')) {
        const [k, v] = key.split('=', 2);
        flags[k] = v;
      } else if (i + 1 < parseList.length && !parseList[i + 1].startsWith('-')) {
        flags[key] = parseList[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals, commandArgs };
}
