/// <reference types="node" />

/**
 * @fileoverview Node's own Web Locks and `BroadcastChannel`, for tests of code
 * that coordinates tabs -- like `useActiveTab` -- in DOMs that lack them.
 */

// The default export rather than a named `locks`, which fails to link before
// Node 24 and would take every other helper in this entry point down with it.
import workerThreads from 'node:worker_threads'

/** Puts `key` back on `target` as it was described, or removes it if it wasn't there. */
const restoreProperty = (
  target: object,
  key: string,
  descriptor: PropertyDescriptor | undefined
) => {
  if (descriptor) Object.defineProperty(target, key, descriptor)
  else Reflect.deleteProperty(target, key)
}

/**
 * Installs Node's Web Locks and `BroadcastChannel` into the test DOM, returning
 * a teardown that puts back what was there.
 *
 * Needs Node 24. Its locks are shared by the whole test process, so give each
 * case's locks a name of its own.
 */
export const installTabApis = () => {
  // Typed as always there, but absent before Node 24.
  const locks = workerThreads.locks as LockManager | undefined
  if (!locks) {
    throw new Error('installTabApis needs Node 24 or later, for Web Locks')
  }
  const ownLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')
  const ownChannel = Object.getOwnPropertyDescriptor(
    globalThis,
    'BroadcastChannel'
  )
  for (const [target, key, value] of [
    [navigator, 'locks', locks],
    [globalThis, 'BroadcastChannel', workerThreads.BroadcastChannel],
  ] as const) {
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  return () => {
    restoreProperty(navigator, 'locks', ownLocks)
    restoreProperty(globalThis, 'BroadcastChannel', ownChannel)
  }
}
