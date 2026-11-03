/// <reference types="node" />

import { locks as nodeLocks } from 'node:worker_threads'
import { noop } from 'es-toolkit'

import { installTabApis } from '../install-tab-apis'

describe('installTabApis', () => {
  let restoreLocks: () => void = noop
  afterEach(() => restoreLocks())

  it('gives the DOM Web Locks that two requests contend for, and takes them back', async () => {
    restoreLocks = installTabApis()
    const LOCK = 'test-install-tab-apis'

    const isFree = await navigator.locks.request(
      LOCK,
      { ifAvailable: true },
      // Asked again while held: a second tab finds it taken.
      () =>
        navigator.locks.request(LOCK, { ifAvailable: true }, (lock) => !lock)
    )

    expect(
      isFree,
      'held for the first request, so the second goes without'
    ).toBe(true)
    restoreLocks()
    // Node's, not just any: happy-dom keeps a `locks` of its own on the
    // navigator's prototype.
    expect(navigator.locks).not.toBe(nodeLocks)
  })

  it('gives the DOM a BroadcastChannel that reaches another tab on the same name', async () => {
    restoreLocks = installTabApis()
    const sender = new BroadcastChannel('test-install-tab-apis')
    const receiver = new BroadcastChannel('test-install-tab-apis')

    const received = new Promise((resolve) => {
      receiver.onmessage = (event) => resolve(event.data)
    })
    sender.postMessage('hello')

    await expect(received).resolves.toBe('hello')
    sender.close()
    receiver.close()
  })
})
