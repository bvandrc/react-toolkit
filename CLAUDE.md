# @bvandrc/react-toolkit — Claude Code Reference

Generic React hooks and helpers for browser UI behavior, published to npm as `@bvandrc/react-toolkit`.

## Code conventions

Follow all of these. `.github/workflows/sync-conventions.yml` syncs them from https://github.com/bvandrc/bvandrc-conventions and overwrites `conventions/` each time, so change a rule upstream.

- @conventions/typescript.md — TypeScript/JavaScript language rules
- @conventions/react.md — components, JSX, folder layout, and accessibility
- @conventions/ts-testing-all.md — every TypeScript suite: test IDs, naming, and assertions
- @conventions/ts-unit-testing.md — unit test layout, naming, fixtures, and assertions
- @conventions/all.md — every repo: branches, formatting, comments, testing, writing, and PR reviews
- @conventions/npm-publishing.md — releasing, trusted publishing, `package.json` fields, and versioning

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run build` | Build `dist/` with tsdown: unbundled ESM plus `.d.mts` types |
| `pnpm run format` | Biome format — **run before every commit** |
| `pnpm run lint` | Biome lint and format check |
| `pnpm run ts:check` | TypeScript check |
| `pnpm run test` | Vitest unit tests (single run) |
| `pnpm run test:isolated` | Vitest with each file in its own module graph, to see whether a failure depends on another file |
| `pnpm run check` | `ts:check` + `lint`; `prepublishOnly` runs it, then `test` and `build` |

## Gotchas

- **Generic by intent**: nothing here may know about an app that uses it.
  - A dependency ships to every consumer, so prefer a local copy of a small helper over a new package.
  - A package only tests use, like `ts-extras`, is a devDependency and ships nothing.
- **Public API**: `src/index.ts` and `src/test-support/index.ts`. Removing or renaming an export from either is breaking, so it needs a major bump.
- **README is an index; JSDoc holds the details**:
  - Each README row says what the export is for, plus any requirement that breaks it when missed (like `useShrinkToFit`'s text not wrapping). That's enough to pick it and use it safely.
  - Options, edge cases, timing, and examples go in its JSDoc, which ships in the `dist/*.d.mts` types, where a consumer's editor or agent reads it.
  - So a change to an existing export, like a new optional parameter or a fixed edge case, usually touches only its JSDoc. Its row changes only when what the export is for changes, or when it gains a requirement that breaks it when missed.
- **Test support ships**: `src/test-support/` is published for consumers' tests, so it imports `vi` from `vitest` rather than relying on globals a consumer may not turn on.
- **`@/*` is `src/*`**:
  - Use it for any import that would climb out of a folder (`../`); keep same-folder siblings relative.
  - Declared once in `tsconfig.json`. Vitest reads it through `resolve.tsconfigPaths`, and tsdown rewrites it to relative paths in `dist/`, so consumers never see it.
- **Unit tests share a worker**: `isolate` is off, and files run in a shuffled order.
  - `vitest.setup.ts` clears the DOM, `localStorage`, and fake timers after every case, and `vitest.config.ts` restores spies and stubbed globals before each.
  - A module's own state is the test's to undo.
  - A spy made once for a whole `describe` is restored before its first case, so make it in each case or a `beforeEach`.
  - Replay a seed-dependent failure with `--sequence.seed=<n>`.
- **pnpm, pinned**: `packageManager` in `package.json` pins the version, which `corepack enable` (or CI's `pnpm/action-setup`) picks up. Install with `pnpm install`; npm and `package-lock.json` aren't used.
