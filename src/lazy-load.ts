import { useState } from 'react'

/**
 * A hook for something loaded on demand, like code and data kept out of a
 * page's first load, which every component using the hook shares.
 *
 * `load` runs at most once at a time, and not again once it resolves, so a
 * component mounted later starts with the value. The hook takes whether it
 * may load at all, and returns the value, undefined until loaded, whether
 * loading failed, and `prefetch`, which starts loading it, say as a pointer
 * arrives ahead of a tooltip opening. Prefetching after a failure tries again.
 */
export const createLazyLoad = <T>(load: () => Promise<T>) => {
  // Kept once loaded, so components mounted later start with it.
  let loaded: { value: T } | undefined
  // Shared while in flight, so components prefetching at once load it once.
  let pending: Promise<T> | undefined
  const loadOnce = () => {
    pending ??= load().then(
      (value) => {
        loaded = { value }
        return value
      },
      (error: unknown) => {
        // Let the next prefetch try again, offline say.
        pending = undefined
        throw error
      }
    )
    return pending
  }

  // biome-ignore lint/correctness/noComponentHookFactories: the factory runs once per thing loaded, at module scope, so the hook keeps one identity
  const useLazyLoad = (enabled = true) => {
    // Wrapped, so a value that is itself undefined still reads as loaded.
    const [state, setState] = useState<{
      loaded?: { value: T }
      isFailed: boolean
    }>(() => ({ loaded, isFailed: false }))
    const prefetch = () => {
      if (!enabled || state.loaded) {
        return
      }
      if (state.isFailed) {
        setState({ isFailed: false })
      }
      loadOnce().then(
        (value) => setState({ loaded: { value }, isFailed: false }),
        () => setState({ isFailed: true })
      )
    }
    return { value: state.loaded?.value, isFailed: state.isFailed, prefetch }
  }

  return useLazyLoad
}
