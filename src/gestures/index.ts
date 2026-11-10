// biome-ignore-all lint/performance/noBarrelFile: a package entry point is a
// barrel by definition -- it is what `exports` resolves to.

/**
 * @fileoverview The `./gestures` entry point, for hooks that read pointer,
 * wheel, and touch gestures: apart from the main one, since it imports
 * `@use-gesture/react`, which only a consumer using it installs.
 */

export * from './useZoomPanGestures'
