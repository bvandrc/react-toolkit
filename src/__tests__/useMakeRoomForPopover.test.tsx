import { useRef } from 'react'
import { act, renderHook } from '@testing-library/react'

import {
  type MakeRoomForPopoverOptions,
  useMakeRoomForPopover,
} from '../useMakeRoomForPopover'

afterEach(() => {
  vi.restoreAllMocks()
})

/** How tall the window is, so the room below the trigger is this less its bottom. */
const WINDOW_HEIGHT = 600

/** Where the target and the trigger inside it start, down an unscrolled scroll area. */
const TARGET_TOP = 300
const TRIGGER_TOP = 340
const TRIGGER_HEIGHT = 30

/** The most room above or below the trigger: 340px above it, 230px below. */
const ROOM = Math.max(TRIGGER_TOP, WINDOW_HEIGHT - TRIGGER_TOP - TRIGGER_HEIGHT)

/**
 * Builds a trigger inside a target inside a scroll area (or straight in the
 * page, with `inPage`), with layout stubbed -- happy-dom does none -- and a
 * popover `popoverHeight` tall.
 */
const createLayout = ({
  popoverHeight,
  inPage = false,
}: {
  popoverHeight: number
  inPage?: boolean
}) => {
  const scrollParent = document.createElement('div')
  if (!inPage) scrollParent.style.overflowY = 'auto'
  const target = document.createElement('div')
  const trigger = document.createElement('button')
  target.appendChild(trigger)
  scrollParent.appendChild(target)
  document.body.appendChild(scrollParent)
  const popover = document.createElement('div')

  vi.stubGlobal('visualViewport', undefined)
  vi.stubGlobal('innerHeight', WINDOW_HEIGHT)
  vi.spyOn(popover, 'scrollHeight', 'get').mockReturnValue(popoverHeight)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const scrolled = scrollParent.scrollTop
      if (this === target) {
        return { top: TARGET_TOP - scrolled, bottom: 0 } as DOMRect
      }
      if (this === trigger) {
        const top = TRIGGER_TOP - scrolled
        return { top, bottom: top + TRIGGER_HEIGHT } as DOMRect
      }
      return { top: 0, bottom: 0 } as DOMRect
    }
  )
  return { scrollParent, target, trigger, popover }
}

/** Renders the hook against `trigger`, and mounts `popover` through its ref. */
const renderAndOpen = (
  { trigger, popover }: { trigger: HTMLElement; popover: HTMLElement },
  options?: (
    target: React.RefObject<HTMLElement | null>
  ) => MakeRoomForPopoverOptions
) => {
  const { result } = renderHook(() => {
    const triggerRef = useRef<HTMLElement | null>(trigger)
    const targetRef = useRef<HTMLElement | null>(trigger.parentElement)
    return useMakeRoomForPopover(triggerRef, options?.(targetRef))
  })
  act(() => result.current(popover))
}

describe('useMakeRoomForPopover', () => {
  it('scrolls the target to the top when the popover fits neither above nor below', () => {
    const layout = createLayout({ popoverHeight: ROOM + 50 })

    renderAndOpen(layout, (scrollTarget) => ({ scrollTarget }))

    expect(layout.scrollParent.scrollTop).toBe(TARGET_TOP)
  })

  it('leaves everything where it is when the popover fits', () => {
    const layout = createLayout({ popoverHeight: ROOM })

    renderAndOpen(layout, (scrollTarget) => ({ scrollTarget }))

    expect(layout.scrollParent.scrollTop).toBe(0)
  })

  it('counts the height the popover takes beyond its content', () => {
    const layout = createLayout({ popoverHeight: ROOM })

    renderAndOpen(layout, (scrollTarget) => ({
      scrollTarget,
      extraHeightPx: 6,
    }))

    expect(layout.scrollParent.scrollTop).toBe(TARGET_TOP)
  })

  it('scrolls the trigger itself when given no target', () => {
    const layout = createLayout({ popoverHeight: ROOM + 50 })

    renderAndOpen(layout)

    expect(layout.scrollParent.scrollTop).toBe(TRIGGER_TOP)
  })

  it('never scrolls the page itself', () => {
    const layout = createLayout({ popoverHeight: ROOM + 50, inPage: true })

    renderAndOpen(layout, (scrollTarget) => ({ scrollTarget }))

    expect(document.documentElement.scrollTop).toBe(0)
  })
})
