import { defineConfig } from 'tsdown'

export default defineConfig({
  // `active-tab` stands apart so the main entry never imports `tab-election`,
  // an optional peer a consumer without the hook doesn't install.
  entry: ['src/index.ts', 'src/active-tab.ts', 'src/test-support/index.ts'],
  format: 'esm',
  // Unbundled, so a consumer's bundler tree-shakes per module rather than
  // through one file.
  unbundle: true,
  dts: true,
  clean: true,
})
