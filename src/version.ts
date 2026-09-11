import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

declare const __PACKAGE_VERSION__: string | undefined;

function getPackageVersion(): string {
  if (typeof __PACKAGE_VERSION__ !== 'undefined') {
    return __PACKAGE_VERSION__;
  }
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/**
 * Package version synchronized from package.json (single source of truth).
 */
export const VERSION: string = getPackageVersion();
