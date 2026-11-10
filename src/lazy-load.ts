import { useCallback, useSyncExternalStore } from 'react'

type LazyLoadState<T> = {
  /** The value once loaded, wrapped so one that is itself undefined still reads as loaded */
  loaded?: { value: T }
  /** Why the last load failed, until the next one starts */
  failure?: { error: unknown }
}

/**
 * A hook for something loaded on demand, like code and data kept out of a
 * page's first load, which every component using the hook shares.
 *
 * `load` runs at most once at a time, and not again once it resolves, and
 * every mounted component sees what it gives, or why it failed, at once. The
 * hook takes whether it may start loading, and returns the value, undefined
 * until loaded, whether loading failed and the error it failed with, and
 * `prefetch`, which starts loading it, say as a pointer arrives ahead of a
 * tooltip opening. Prefetching after a failure tries again. `prefetch` keeps
 * its identity while `enabled` holds.
 */
export const createLazyLoad = <T>(load: () => Promise<T>) => {
  let state: LazyLoadState<T> = {}
  let isLoading = false
  const listeners = new Set<() => void>()
  const setState = (next: LazyLoadState<T>) => {
    state = next
    for (const listener of listeners) listener()
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const getState = () => state
  /** Starts loading, unless it's loaded or loading already. */
  const startLoad = () => {
    if (state.loaded || isLoading) {
      return
    }
    isLoading = true
    if (state.failure) {
      setState({})
    }
    // Through `then`, so a `load` that throws before it returns a promise
    // fails the same way as one whose promise rejects.
    Promise.resolve()
      .then(load)
      .then(
        (value) => {
          isLoading = false
          setState({ loaded: { value } })
        },
        (error: unknown) => {
          isLoading = false
          setState({ failure: { error } })
        }
      )
  }

  // biome-ignore lint/correctness/noComponentHookFactories: the factory runs once per thing loaded, at module scope, so the hook keeps one identity
  const useLazyLoad = (enabled = true) => {
    const { loaded, failure } = useSyncExternalStore(
      subscribe,
      getState,
      getState
    )
    const prefetch = useCallback(() => {
      if (enabled) {
        startLoad()
      }
    }, [enabled])
    return {
      value: loaded?.value,
      isFailed: failure !== undefined,
      error: failure?.error,
      prefetch,
    }
  }

  return useLazyLoad
}
