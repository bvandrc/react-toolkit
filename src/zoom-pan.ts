// biome-ignore-all lint/performance/noBarrelFile: a package entry point is a
// barrel by definition -- it is what `exports` resolves to.

/**
 * @fileoverview The `./zoom-pan` entry point: apart from the main one, since
 * it imports `@use-gesture/react`, which only a consumer using it installs.
 */

export * from './useZoomPanGestures'
