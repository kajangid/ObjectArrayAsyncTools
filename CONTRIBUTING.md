# Contributing to @kjangid/array-async-tools

Thank you for contributing! This guide covers the local development workflow, scripts, and architectural rules.

---

## 1. Development Setup

```bash
# Clone the repository
git clone https://github.com/kajangid/ObjectArrayAsyncTools.git
cd ObjectArrayAsyncTools

# Install development dependencies (zero runtime dependencies allowed)
npm install
```

---

## 2. Available NPM Scripts

| Script | Command | Description |
|---|---|---|
| `lint` | `tsc --noEmit` | Strict TypeScript typechecking as linter gate. |
| `test` | `vitest run` | Runs all 18 unit and integration test suites. |
| `test:watch` | `vitest` | Runs Vitest in interactive watch mode during development. |
| `test:coverage` | `vitest run --coverage` | Generates V8 code coverage reports (must maintain >95% lines/statements). |
| `typecheck` | `tsc --noEmit` | Strict TypeScript compiler validation. |
| `build` | `tsup` | Compiles dual ESM (`.mjs`), CJS (`.cjs`), and TypeScript declarations (`.d.ts` / `.d.cts`). |
| `bump:patch` | `npm version patch` | Bumps patch version, updates `package.json`, and creates a Git tag. |
| `bump:minor` | `npm version minor` | Bumps minor version, updates `package.json`, and creates a Git tag. |
| `bump:major` | `npm version major` | Bumps major version, updates `package.json`, and creates a Git tag. |
| `prepublishOnly` | `npm run lint && npm run test && npm run build` | Full local CI safety gate executed prior to publishing. |
| `publish:dry` | `npm publish --dry-run` | Verifies the release tarball contents without publishing. |

---

## 3. Contribution Guidelines & Architecture Rules

1. **Zero Runtime Dependencies**: Every single utility must be built from first principles. No third-party runtime dependencies may be added.
2. **Security by Default**: All object transformations must protect against prototype pollution (`__proto__`, `constructor`, `prototype`).
3. **100% Test Coverage**: Every utility file must have a corresponding `.test.ts` file covering standard usage, edge cases, type boundaries, and attack vectors.
4. **Dual Module Output**: Code must build cleanly for both ESM and CommonJS via `tsup`.
5. **No Manual Version Edits**: Never edit the version string in `package.json` manually; use `npm version` which creates the version commit and Git tag.
