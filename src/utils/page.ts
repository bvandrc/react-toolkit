/**
 * @fileoverview Hooks into the page's own lifecycle, for code that lives
 * outside React as well as inside it.
 */

/**
 * Calls `callback` whenever the app may be about to go away: hidden, or the
 * page itself unloading. Returns an unsubscribe.
 *
 * Hidden as well as `pagehide`, since a phone can kill a backgrounded app
 * without `pagehide` ever firing -- so `callback` can run more than once per
 * visit, and should be safe to.
 *
 * @example
 * ```tsx
 * // The unsubscribe it returns doubles as the effect's cleanup.
 * useEffect(() => onAppLeave(flushDrafts), [flushDrafts])
 * ```
 */
export const onAppLeave = (callback: () => void) => {
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') callback()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', callback)
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', callback)
  }
}
