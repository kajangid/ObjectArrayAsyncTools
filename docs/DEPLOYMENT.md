# Deployment & Release Workflow Guide

This document outlines the step-by-step deployment process, single source of truth versioning, automated publishing scripts, and GitHub Actions CI/CD pipeline for `@omnidev-tools/object-array-async-tools`.

---

## 1. Automated Pre-Publish Verification

The package defines an automated safety gate in `package.json`:

```json
{
  "scripts": {
    "prepublishOnly": "npm run typecheck && npm run test && npm run build",
    "publish:dry": "npm publish --dry-run"
  }
}
```

Whenever `npm publish` is executed:
1. `npm run typecheck`: Runs strict TypeScript validation with `tsc --noEmit`.
2. `npm run test`: Runs the full 168-test Vitest suite across all 18 test files.
3. `npm run build`: Compiles fresh dual ESM (`.mjs`), CJS (`.cjs`), and DTS (`.d.ts` / `.d.cts`) bundles via `tsup`, baking in the version from `package.json`.

---

## 2. Step-by-Step Publishing Workflow

### Step 1: Clean Working Tree Check
Ensure all changes are committed and working tree is clean:
```bash
git status
```

### Step 2: Verify Type Safety & Test Pass Rate
```bash
npm run typecheck
npm run test:coverage
```

### Step 3: Verify Packaging Manifest
Run a dry-run to ensure only required distribution assets (`dist/`, `README.md`, `LICENSE`, `package.json`) are included:
```bash
npm run publish:dry
```

### Step 4: Single Source of Truth Version Bumping
`package.json` is the sole source of truth for the package version. When bumping versions, only `package.json` needs to be updated. The build pipeline (`tsup` and `vitest`) dynamically reads `package.json` and bakes `__PACKAGE_VERSION__` into the emitted binaries and bundles.

Use the automated versioning scripts:
```bash
# For backwards-compatible bug fixes (e.g. 1.0.0 -> 1.0.1)
npm run bump:patch

# For backwards-compatible new features (e.g. 1.0.0 -> 1.1.0)
npm run bump:minor

# For breaking API changes (e.g. 1.0.0 -> 2.0.0)
npm run bump:major
```

### Step 5: Publish to NPM
Publish the package to the public NPM registry:
```bash
# Public package release
npm publish --access public
```

---

## 3. GitHub Actions CI/CD Workflow Specification

Below is the recommended continuous integration and deployment workflow file (`.github/workflows/ci.yml`):

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  release:
    types: [published]

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Strict Typecheck
        run: npm run typecheck

      - name: Execute Tests with Coverage
        run: npm run test:coverage

      - name: Build Dual Bundles
        run: npm run build

      - name: Test CLI Version Output
        run: node ./dist/bin/cli.cjs --version

      - name: Dry-Run Publish Verification
        run: npm run publish:dry

  publish:
    needs: validate
    if: github.event_name == 'release' && github.event.action == 'published'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'

      - name: Install Dependencies
        run: npm ci

      - name: Publish with Provenance
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 4. Package Provenance & Security Best Practices

When publishing to NPM:
- **NPM Provenance**: Enable `--provenance` in GitHub Actions to cryptographically link the published package back to the specific GitHub commit and workflow execution.
- **Two-Factor Authentication (2FA)**: Ensure publish access is configured with automated automation tokens or WebAuthn/TOTP 2FA.
