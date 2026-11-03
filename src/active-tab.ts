// biome-ignore-all lint/performance/noBarrelFile: a package entry point is a
// barrel by definition -- it is what `exports` resolves to.

/**
 * @fileoverview The `./active-tab` entry point: apart from the main one, since
 * it imports `tab-election`, which only a consumer using it installs.
 */

export * from './useActiveTab'
