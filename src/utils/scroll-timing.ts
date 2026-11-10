/**
 * @fileoverview Timing shared by the package's own scrolling code; not
 * exported from the package.
 */

/**
 * The longest to wait for a smooth scroll to say it ended, for one that never
 * does: no scroll came, or the browser lacks `scrollend`. Past any browser's
 * own smooth scroll, which runs a few hundred ms.
 */
export const SMOOTH_SCROLL_MAX_MS = 1000
