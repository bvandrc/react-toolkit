import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    // Apart, so the main entry never imports `tab-election`, an optional peer
    // a consumer without `useActiveTab` doesn't install.
    'src/active-tab.ts',
    // Apart, so the main entry never imports `@use-gesture/react`, an optional
    // peer a consumer without the gesture hooks doesn't install.
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
