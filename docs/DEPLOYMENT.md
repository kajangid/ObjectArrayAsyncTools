# Deployment & Release Workflow Guide

This document outlines the step-by-step deployment process, single source of truth versioning, automated publishing scripts, and GitHub Actions CI/CD pipeline for `@kjangid/array-async-tools`.

---

## 1. Automated Pre-Publish Verification

The package defines an automated safety gate in `package.json`:

```json
{
  "scripts": {
    "lint": "tsc --noEmit",
    "prepublishOnly": "npm run lint && npm run test && npm run build",
    "publish:dry": "npm publish --dry-run"
  }
}
```

Whenever `npm publish` is executed (locally or in CI):
1. `npm run lint`: Runs strict TypeScript validation with `tsc --noEmit`.
2. `npm run test`: Runs the full 168-test Vitest suite across all 18 test files.
3. `npm run build`: Compiles fresh dual ESM (`.mjs`), CJS (`.cjs`), and DTS (`.d.ts` / `.d.cts`) bundles via `tsup`, baking in the version from `package.json`.

---

## 2. Release & Versioning Flow

Releases are completely automated via Git tags and GitHub Actions. **Never manually edit the version string in `package.json`**.

```text
npm version patch | minor | major
              ↓
    git push --follow-tags
              ↓
      GitHub tag v1.2.3
              ↓
        GitHub Actions
              ↓
  npm ci → lint → test → build → verify tag
              ↓
   npm publish (OIDC + Provenance)
              ↓
        GitHub Release
```

### Step 1: Clean Working Tree Check
Ensure all changes are committed and the working tree is clean:
```bash
git status
```

### Step 2: Run Local Validation
```bash
npm run lint
npm test
npm run build
```

### Step 3: Bump Version & Create Tag
Use `npm version` to automatically increment the version in `package.json`, commit the change, and create a Git tag:
```bash
# For backwards-compatible bug fixes (e.g. 1.0.0 -> 1.0.1)
npm version patch

# For backwards-compatible new features (e.g. 1.0.0 -> 1.1.0)
npm version minor

# For breaking API changes (e.g. 1.0.0 -> 2.0.0)
npm version major
```

### Step 4: Push Commit & Git Tag
Push the version commit and the generated tag to GitHub:
```bash
git push --follow-tags
```

---

## 3. GitHub Actions CI/CD Pipelines

The repository employs two dedicated GitHub Actions workflows:

### A. Continuous Integration (`.github/workflows/ci.yml`)
Triggered on all pull requests and pushes to `main` and `master`.

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  validate:
    name: Lint, Test & Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter / typecheck
        run: npm run lint

      - name: Run Test Suite
        run: npm test

      - name: Build Package
        run: npm run build
```

### B. Continuous Delivery (`.github/workflows/release.yml`)
Triggered strictly when a Git tag matching `v*` is pushed.

```yaml
name: Release & Publish

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    name: Release & Publish to npm
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required for npm OIDC Trusted Publishing
      contents: write # Required to create GitHub Release

    steps:
      - name: Checkout Tagged Commit
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: "https://registry.npmjs.org"
          cache: "npm"

      - name: Check Node and npm versions
        run: |
          node --version
          npm --version

      - name: Install dependencies
        run: npm ci

      - name: Verify Git tag matches package.json version
        run: |
          TAG_VERSION="${GITHUB_REF_NAME#v}"
          PKG_VERSION=$(node -p "require('./package.json').version")
          if [ "$TAG_VERSION" != "$PKG_VERSION" ]; then
            echo "::error::Tag version ($TAG_VERSION) does not match package.json version ($PKG_VERSION)"
            exit 1
          fi
          echo "Verified: Tag version ($TAG_VERSION) matches package.json ($PKG_VERSION)"

      - name: Run linter / typecheck
        run: npm run lint

      - name: Run test suite
        run: npm test

      - name: Build package
        run: npm run build

      - name: Publish to npm via OIDC
        run: npm publish --access public --provenance

      - name: Create GitHub Release
        run: gh release create "$GITHUB_REF_NAME" --title "Release $GITHUB_REF_NAME" --generate-notes
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 4. npm Trusted Publishing (OIDC) Setup

This pipeline uses **npm Trusted Publishing** via OpenID Connect (OIDC). No static API keys or long-lived secret tokens (`NPM_TOKEN`) are needed or stored in GitHub secrets.

### One-Time Configuration Steps:
1. Log in to your account on [npmjs.com](https://www.npmjs.com).
2. Go to your package settings: `https://www.npmjs.com/package/@kjangid/array-async-tools/access` (or go to **Account Settings** → **Trusted Publishers** if creating the package for the first time).
3. Under the **Trusted Publishers** section, click **"Add Trusted Publisher"** and select **"GitHub Actions"**.
4. Enter the repository details:
   - **GitHub Organization / User**: `kajangid`
   - **Repository Name**: `ObjectArrayAsyncTools`
   - **Workflow filename**: `release.yml`
   - **Environment**: *(leave empty)*
5. Click **"Add Publisher"**.

### Security & Provenance:
- **Zero Static Secrets**: Authentication is negotiated ephemeral-per-job using OIDC JWTs signed by GitHub and verified by npm.
- **SLSA Provenance Attestation**: The `--provenance` flag generates cryptographic attestations via Sigstore, linking the published package directly back to the GitHub commit and workflow execution.
