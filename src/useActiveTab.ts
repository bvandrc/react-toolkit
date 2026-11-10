/**
 * @fileoverview Keeping an app to one active tab at a time, so only one tab
 * ever reads and writes its storage -- every tab of an app keeping its own copy
 * in memory would otherwise overwrite the others'.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Tab } from 'tab-election'

import { useLatestRef } from './useLatestRef'

/**
 * Where this tab stands: still finding out, the one tab running the app, or
 * not running it because another tab is.
 */
export type ActiveTabStatus = 'pending' | 'active' | 'elsewhere'

/** Broadcast by a tab taking over: the active tab steps down, the rest step back. */
const MAKE_WAY = 'make-way'

/** Joins the back of the line for the lead, giving up any place already in it. */
const requeue = (tab: Tab, onLead: () => void) => {
  tab.relinquishLeadership()
  void tab.waitForLeadership(onLead)
}

/** Whether the browser can keep tabs to one -- without both, every tab runs. */
const canCoordinate = () =>
  Boolean(navigator.locks) && typeof BroadcastChannel !== 'undefined'

/**
 * Runs an app in one tab at a time; `takeOver` moves it to this tab.
 *
 * Render the app only while `status` is `active`, from this component or one
 * below it, so a tab stepping down lets go only once the app has unmounted
 * and `beforeHandOver` has resolved.
 */
export const useActiveTab = (
  name: string,
  {
    beforeHandOver,
    enabled = true,
  }: {
    beforeHandOver?: () => Promise<void>
    /**
     * When false, this tab takes no part: it gives up the lead and its place
     * in line at once, without `beforeHandOver`, and reports `elsewhere`.
     */
    enabled?: boolean
  } = {}
) => {
  const [status, setStatus] = useState<ActiveTabStatus>(() =>
    canCoordinate() ? 'pending' : 'active'
  )
  const tabRef = useRef<Tab | null>(null)
  const isHandingOverRef = useRef(false)
  const beforeHandOverRef = useLatestRef(beforeHandOver)

  useEffect(() => {
    if (!canCoordinate()) return
    // A new name is a new election, as is joining again: nothing held before
    // counts -- so re-enabling can't report a lead this tab has since let go.
    setStatus('pending')
    if (!enabled) return
    const tab = new Tab(name)
    tabRef.current = tab

    const showActive = () => setStatus('active')
    // Another tab leading: on opening, and whenever the lead changes hands.
    const showElsewhere = () => {
      if (!tab.isLeader) setStatus('elsewhere')
    }
    void tab.hasLeader().then((hasLeader) => hasLeader && showElsewhere())
    tab.addEventListener('state', showElsewhere)

    tab.addEventListener('message', (event) => {
      if (event.data !== MAKE_WAY) return
      if (!tab.isLeader) {
        requeue(tab, showActive)
        return
      }
      // Let go once the app below has unmounted, in the effect after this.
      isHandingOverRef.current = true
      setStatus('elsewhere')
    })

    requeue(tab, showActive)
    return () => {
      tab.close()
      tabRef.current = null
    }
  }, [name, enabled])

  useEffect(() => {
    const tab = tabRef.current
    if (!tab || status !== 'elsewhere' || !isHandingOverRef.current) return
    isHandingOverRef.current = false
    // This runs after the app's own cleanups, which flushed what it held; the
    // caller's hook covers whatever it still has on the way.
    void (beforeHandOverRef.current?.() ?? Promise.resolve()).finally(() => {
      // Closed meanwhile, by an unmount or a new name: queuing a closed tab
      // would take the lock with nothing left to let it go.
      if (tabRef.current !== tab) return
      requeue(tab, () => setStatus('active'))
    })
  }, [status])

  const takeOver = useCallback(() => {
    const tab = tabRef.current
    // Already the one running it: there is nothing to move.
    if (!tab || tab.isLeader) return
    setStatus('pending')
    tab.send(MAKE_WAY)
  }, [])

  // Derived rather than set, so a tab is `elsewhere` in the very render that
  // disables it -- not one commit later, with the app already rendered.
  return { status: enabled ? status : 'elsewhere', takeOver }
}
