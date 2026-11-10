import { defineConfig } from 'tsdown'

export default defineConfig({
  // `active-tab` and `gestures` stand apart so the main entry never imports
  // `tab-election` or `@use-gesture/react`, optional peers a consumer without
  // their hooks doesn't install.
  entry: [
    'src/index.ts',
    'src/active-tab.ts',
    'src/gestures/index.ts',
    'src/test-support/index.ts',
  ],
  format: 'esm',
  // Unbundled, so a consumer's bundler tree-shakes per module rather than
  // through one file.
  unbundle: true,
  dts: true,
  clean: true,
})
