import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VERSION } from './version.js';

describe('version synchronization', () => {
  it('matches package.json version', () => {
    const pkgPath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(VERSION).toBe(pkg.version);
  });
});
