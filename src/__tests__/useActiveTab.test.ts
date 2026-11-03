import { act, renderHook } from '@testing-library/react'

import { installTabApis } from '@/test-support'
import { useActiveTab } from '../useActiveTab'

/** Each case's own, since Node's locks outlive the case that took them. */
let lockName = ''
let casesRun = 0

/** One tab running the hook; several in a case share the lock and channel. */
const renderTab = (options?: Parameters<typeof useActiveTab>[1]) => {
  const name = lockName
  return renderHook(() => useActiveTab(name, options))
}

type Tab = ReturnType<typeof renderTab>

const getStatus = (tab: Pick<Tab, 'result'>) => tab.result.current.status

/** Lets every queued grant, release, and message land. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve)))

/** Opens `count` tabs in order, each settled before the next, as a user would. */
const openTabs = async (count: number) => {
  const tabs: Tab[] = []
  for (let opened = 0; opened < count; opened++) {
    tabs.push(renderTab())
    await settle()
  }
  return tabs
}

describe('useActiveTab', () => {
  describe('where the browser can coordinate tabs', () => {
    let restoreLocks: () => void

    beforeEach(() => {
      lockName = `test-active-tab-${++casesRun}`
      restoreLocks = installTabApis()
    })
    afterEach(() => restoreLocks())

    it('makes the first tab the active one', async () => {
      const first = renderTab()
      expect(getStatus(first), 'before the lock answers').toBe('pending')

      await settle()

      expect(getStatus(first)).toBe('active')
    })

    it('keeps a second tab out while the first is active', async () => {
      const [first, second] = await openTabs(2)

      expect(getStatus(first)).toBe('active')
      expect(getStatus(second)).toBe('elsewhere')
    })

    it('moves the app to a tab that takes over, and steps the active one down', async () => {
      const [first, second] = await openTabs(2)

      act(() => second.result.current.takeOver())
      await settle()

      expect(getStatus(second)).toBe('active')
      expect(getStatus(first)).toBe('elsewhere')
    })

    it('lets the first tab take the app back', async () => {
      const [first, second] = await openTabs(2)
      act(() => second.result.current.takeOver())
      await settle()

      act(() => first.result.current.takeOver())
      await settle()

      expect(getStatus(first)).toBe('active')
      expect(getStatus(second)).toBe('elsewhere')
    })

    it('gives the app to the tab that asked, not one waiting ahead of it', async () => {
      const [first, second, third] = await openTabs(3)

      act(() => third.result.current.takeOver())
      await settle()

      expect(getStatus(third)).toBe('active')
      expect(getStatus(second)).toBe('elsewhere')
      expect(getStatus(first)).toBe('elsewhere')
    })

    it('hands the app to the next tab when the active one closes', async () => {
      const [first, second] = await openTabs(2)

      first.unmount()
      await settle()

      expect(getStatus(second)).toBe('active')
    })

    it('leaves the active tab active when it asks to take over', async () => {
      const [first, second] = await openTabs(2)

      act(() => first.result.current.takeOver())
      await settle()

      expect(getStatus(first)).toBe('active')
      expect(getStatus(second)).toBe('elsewhere')
    })

    it('lets go for good when a tab unmounts while handing over', async () => {
      const { promise, resolve } = Promise.withResolvers<void>()
      const first = renderTab({ beforeHandOver: () => promise })
      await settle()
      const [second] = await openTabs(1)
      act(() => second.result.current.takeOver())
      await settle()

      // Gone mid hand-over: its `beforeHandOver` resolves after it has closed.
      first.unmount()
      resolve()
      await settle()
      // Once the new active tab closes too, the lead must reach a live tab.
      second.unmount()
      const [third] = await openTabs(1)

      expect(getStatus(third)).toBe('active')
    })

    it('starts over when the name changes, rather than keeping the old status', async () => {
      const [elsewhereTab] = await openTabs(1)
      const otherName = `${lockName}-other`
      const holder = renderHook(() => useActiveTab(otherName))
      await settle()
      expect(getStatus(holder), 'holds the other name').toBe('active')

      elsewhereTab.unmount()
      const tab = renderHook(({ name }) => useActiveTab(name), {
        initialProps: { name: lockName },
      })
      await settle()
      expect(getStatus(tab)).toBe('active')

      tab.rerender({ name: otherName })
      expect(getStatus(tab), 'before the new election answers').not.toBe(
        'active'
      )
      await settle()
      expect(getStatus(tab)).toBe('elsewhere')
    })

    it("holds the app back from the new tab until the old one's `beforeHandOver` resolves", async () => {
      const { promise, resolve } = Promise.withResolvers<void>()
      const first = renderTab({ beforeHandOver: () => promise })
      await settle()
      const [second] = await openTabs(1)

      act(() => second.result.current.takeOver())
      await settle()

      expect(getStatus(first)).toBe('elsewhere')
      expect(getStatus(second), 'still waiting on the old tab').toBe('pending')
      resolve()
      await settle()
      expect(getStatus(second)).toBe('active')
    })
  })

  it('makes every tab active where the browser cannot coordinate them', () => {
    // happy-dom has neither Web Locks nor `BroadcastChannel`.
    const first = renderTab()
    const second = renderTab()

    expect(getStatus(first)).toBe('active')
    expect(getStatus(second)).toBe('active')
  })
})
