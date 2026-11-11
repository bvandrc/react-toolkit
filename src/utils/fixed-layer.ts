/**
 * @fileoverview Whether an element sits on a fixed layer, for the package's
 * own layout and scrolling code; not exported from the package.
 */

/** Whether `el`, or an ancestor, is `position: fixed`, which keeps it still as the page scrolls. */
export const isOnFixedLayer = (el: HTMLElement) => {
  // A fixed element inside a transformed or filtered ancestor scrolls with
  // the page all the same, which this doesn't catch; dialogs portal to the
  // body, out of any such ancestor.
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (getComputedStyle(node).position === 'fixed') return true
  }
  return false
}
