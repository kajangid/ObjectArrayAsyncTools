import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bin/cli': 'src/bin/cli.ts',
    'deep-clone/index': 'src/deep-clone/index.ts',
    'deep-equal/index': 'src/deep-equal/index.ts',
    'object-diff/index': 'src/object-diff/index.ts',
    'object-clean/index': 'src/object-clean/index.ts',
    'chunk/index': 'src/chunk/index.ts',
    'group-by/index': 'src/group-by/index.ts',
    'unique-array/index': 'src/unique-array/index.ts',
    'smart-sort/index': 'src/smart-sort/index.ts',
    'debounce/index': 'src/debounce/index.ts',
    'throttle/index': 'src/throttle/index.ts',
    'retry/index': 'src/retry/index.ts',
    'promise-timeout/index': 'src/promise-timeout/index.ts',
    'async-queue/index': 'src/async-queue/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  shims: true,
  cjsInterop: true,
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
