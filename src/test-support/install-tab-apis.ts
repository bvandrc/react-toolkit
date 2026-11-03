/// <reference types="node" />

/**
 * @fileoverview Node's own Web Locks and `BroadcastChannel`, for tests of code
 * that coordinates tabs -- like `useActiveTab` -- in DOMs that lack them.
 */

import { BroadcastChannel, locks } from 'node:worker_threads'
import { vi } from 'vitest'

/**
 * Installs Node's Web Locks and `BroadcastChannel` into the test DOM, so
 * several "tabs" rendered in one test coordinate as tabs in one browser would.
 * Returns the teardown for the locks; `vi.unstubAllGlobals` undoes the channel.
 *
 * Needs Node 24 or later, which ships Web Locks. Node's locks are shared by the
 * whole test process rather than reset per case, so give each case's locks a
 * name of its own.
 */
export const installTabApis = () => {
  // Typed as always there, but absent before Node 24.
  if (!(locks as LockManager | undefined)) {
    throw new Error('installTabApis needs Node 24 or later, for Web Locks')
  }
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: locks,
  })
  vi.stubGlobal('BroadcastChannel', BroadcastChannel)
  return () => {
    Reflect.deleteProperty(navigator, 'locks')
  }
}
