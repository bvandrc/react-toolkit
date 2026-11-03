# @bvandrc/react-ui-hooks — Claude Code Reference

Generic React hooks and helpers for browser UI behavior, published to npm as `@bvandrc/react-ui-hooks`.

## Code conventions

Conventions live outside this file, synced from https://github.com/bvandrc/bvandrc-conventions by `.github/workflows/sync-conventions.yml` — follow all of them, and edit a rule upstream rather than in `conventions/`, which every sync overwrites:

- @conventions/typescript.md — language-level TypeScript/JavaScript rules
- @conventions/react.md — component, JSX, folder layout, and accessibility rules
- @conventions/ts-testing-all.md — testing rules shared by every TypeScript suite: test IDs, naming, assertions
- @conventions/ts-unit-testing.md — TypeScript unit test layout, naming, fixtures, and assertions
- @conventions/all.md — practice for every repo: branches, formatting, comments, testing, writing, PR reviews
- @conventions/npm-publishing.md — releasing, trusted publishing, `package.json` publish fields, versioning

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run build` | Build `dist/` with tsdown: unbundled ESM plus `.d.mts` types |
| `pnpm run format` | Biome format — **run before every commit** |
| `pnpm run lint` | Biome lint and format check |
| `pnpm run ts:check` | TypeScript check |
| `pnpm run test` | Vitest unit tests (single run) |
| `pnpm run test:isolated` | Vitest with each file in its own module graph, for checking whether a failure depends on another file |
| `pnpm run check` | ts + lint (lint includes the format check); `prepublishOnly` runs it, then `test` and `build` |

## Gotchas

- **Generic by intent**: Nothing here may know about an app that uses it. A dependency added here ships to every consumer, so prefer a local copy of a small helper over a new package. A package only tests use, like `ts-extras`, is a devDependency and ships nothing.
- **The public API is `src/index.ts` and `src/test-support/index.ts`**: Removing or renaming an export from either is a breaking change, so it needs a major bump.
- **Test support ships**: `src/test-support/` is published for consumers' own tests, so it imports `vi` from `vitest` explicitly rather than relying on Vitest's globals, which a consumer may not turn on.
- **`@/*` is `src/*`**: Declared once in `tsconfig.json`; Vitest reads it through `resolve.tsconfigPaths`, and tsdown rewrites it to relative paths in `dist/`, so consumers never see it. Use it for any import that would climb out of a folder (`../`), and keep same-folder siblings relative.
- **Unit tests share a worker**: `isolate` is off and files run in a shuffled order, so `vitest.setup.ts` clears the DOM, `localStorage`, and fake timers after every case, but a `vi.spyOn` or a module's own state is the test's to undo. Replay a seed-dependent failure with `--sequence.seed=<n>`.
- **pnpm, pinned**: `packageManager` in `package.json` pins the pnpm version, which `corepack enable` (or CI's `pnpm/action-setup`) picks up. Install with `pnpm install`; npm and its `package-lock.json` aren't used here.
