# Installation & Environment Configuration

This guide provides instructions for installing and configuring `@omnidev-tools/object-array-async-tools` across package managers, runtimes, import paradigms, and TypeScript projects.

---

## 1. Package Manager Installation

### NPM
```bash
npm install @omnidev-tools/object-array-async-tools
```

### PNPM
```bash
pnpm add @omnidev-tools/object-array-async-tools
```

### Yarn
```bash
# Yarn Berry / Modern
yarn add @omnidev-tools/object-array-async-tools

# Yarn Classic (v1)
yarn add @omnidev-tools/object-array-async-tools
```

### Bun
```bash
bun add @omnidev-tools/object-array-async-tools
```

---

## 2. Global CLI Installation

To use the standalone command-line tools (`oa-tools`, `oa-clone`, `oa-diff`, etc.) globally across your terminal:

```bash
npm install -g @omnidev-tools/object-array-async-tools
```

Verify the installation:
```bash
oa-tools --version
oa-tools --help
```

---

## 3. Runtime Setup Guides

### Node.js (>= 18.0.0)

#### Native ESM
Ensure your `package.json` contains `"type": "module"`:
```javascript
import { deepClone, chunk } from '@omnidev-tools/object-array-async-tools';

const chunks = chunk([1, 2, 3, 4], 2);
```

#### CommonJS
```javascript
const { deepClone, chunk } = require('@omnidev-tools/object-array-async-tools');

const chunks = chunk([1, 2, 3, 4], 2);
```

---

### Deno

In Deno, import directly using npm specifiers:

```typescript
import { retry, chunk } from 'npm:@omnidev-tools/object-array-async-tools@^1.0.0';

const data = await retry(async () => {
  return await fetch('https://api.example.com/status');
});
```

---

### Bun

Bun automatically supports native dual packages:

```typescript
import { AsyncQueue, smartSort } from '@omnidev-tools/object-array-async-tools';

const queue = new AsyncQueue({ concurrency: 5 });
```

---

### Cloudflare Workers / Edge Runtimes

Because `@omnidev-tools/object-array-async-tools` contains **zero runtime dependencies** and uses standard Web APIs (`setTimeout`, `clearTimeout`, `AbortSignal`, `Promise`), it operates natively in Cloudflare Workers and Vercel Edge Middleware:

```typescript
import { objectClean } from '@omnidev-tools/object-array-async-tools/object-clean';

export default {
  async fetch(request: Request): Promise<Response> {
    const payload = await request.json();
    const cleanPayload = objectClean(payload, { emptyStrings: true });
    return Response.json(cleanPayload);
  },
};
```

---

## 4. Root vs Subpath Import Patterns (Tree-Shaking)

The package supports both root imports and isolated subpath imports:

### Root Import Pattern
Convenient when using multiple utilities across a module:
```typescript
import { deepClone, chunk, retry } from '@omnidev-tools/object-array-async-tools';
```

### Granular Subpath Import Pattern
Ideal for frontend applications and micro-services where bundle size must be kept to an absolute minimum:
```typescript
// Object Utilities
import { deepClone } from '@omnidev-tools/object-array-async-tools/deep-clone';
import { deepEqual } from '@omnidev-tools/object-array-async-tools/deep-equal';
import { objectDiff } from '@omnidev-tools/object-array-async-tools/object-diff';
import { objectClean } from '@omnidev-tools/object-array-async-tools/object-clean';

// Array Utilities
import { chunk } from '@omnidev-tools/object-array-async-tools/chunk';
import { groupBy, groupByMap } from '@omnidev-tools/object-array-async-tools/group-by';
import { uniqueArray } from '@omnidev-tools/object-array-async-tools/unique-array';
import { smartSort } from '@omnidev-tools/object-array-async-tools/smart-sort';

// Async Utilities
import { debounce } from '@omnidev-tools/object-array-async-tools/debounce';
import { throttle } from '@omnidev-tools/object-array-async-tools/throttle';
import { retry } from '@omnidev-tools/object-array-async-tools/retry';
import { promiseTimeout } from '@omnidev-tools/object-array-async-tools/promise-timeout';
import { AsyncQueue } from '@omnidev-tools/object-array-async-tools/async-queue';
```

---

## 5. TypeScript Configuration (`tsconfig.json`)

To ensure accurate resolution of type declaration files (`.d.ts` and `.d.cts`), configure `moduleResolution` in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true
  }
}
```

If using bundlers such as Vite or Webpack 5:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```
