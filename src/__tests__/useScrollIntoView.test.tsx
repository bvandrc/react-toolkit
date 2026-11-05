import { act, render, renderHook } from '@testing-library/react'

import { mockMatchMedia } from '@/test-support'
import { useScrollIntoView } from '../useScrollIntoView'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** How much of the scroll container shows at once. */
const VISIBLE_HEIGHT = 200

/**
 * Renders a scrollable ancestor with one child inside it, with layout stubbed
 * so the child sits `top` below the ancestor's content top and is `height`
 * tall -- happy-dom does no real layout, so the hook would have nothing to
 * scroll to without this.
 */
const renderElInScrollParent = ({
  top,
  height,
}: {
  top: number
  height: number
}) => {
  const { getByTestId } = render(
    <div data-testid="scroll-parent" style={{ overflowY: 'auto' }}>
      <div data-testid="el" />
    </div>
  )
  const scrollParent = getByTestId('scroll-parent')
  vi.spyOn(scrollParent, 'clientHeight', 'get').mockReturnValue(VISIBLE_HEIGHT)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      if (this === scrollParent) return { top: 0 } as DOMRect
      const elTop = top - scrollParent.scrollTop
      return { top: elTop, bottom: elTop + height } as DOMRect
    }
  )
  return { el: getByTestId('el'), scrollParent }
}

/** Longer than the hook's own anchor-suppression window, so it's always done by then. */
const PAST_SUPPRESSION_MS = 400

describe('useScrollIntoView', () => {
  it('scrolls the element where block asks', () => {
    const { el, scrollParent } = renderElInScrollParent({
      top: 50,
      height: 100,
    })
    const { result } = renderHook(() => useScrollIntoView())

    act(() => result.current.scrollIntoView(el, 'start'))

    // Where each `block` lands is `getTargetScrollTop`'s own behavior to
    // cover -- this only checks the hook writes what it works out.
    expect(scrollParent.scrollTop).toBe(50)
  })

  it('never writes to scrollTop while the element is already fully visible', () => {
    // A transition resizing something nearby can make even a same-value
    // write to `scrollTop` a live scroll action, so the fix is to never make
    // that write at all rather than to make it land correctly.
    const { el, scrollParent } = renderElInScrollParent({
      top: 50,
      height: 100,
    })
    const scrollTopSetter = vi
      .spyOn(scrollParent, 'scrollTop', 'set')
      .mockImplementation(() => {
        // Left unimplemented deliberately: a call reaching this at all,
        // for any value, is what the test below is checking didn't happen.
      })
    const { result } = renderHook(() => useScrollIntoView())

    act(() => result.current.scrollIntoView(el, 'nearest'))

    expect(scrollTopSetter).not.toHaveBeenCalled()
  })

  it("turns off the scroll container's own scroll anchoring, restoring it once the suppression window elapses", () => {
    vi.useFakeTimers()
    const { el, scrollParent } = renderElInScrollParent({
      top: 250,
      height: 100,
    })
    scrollParent.style.overflowAnchor = 'auto'
    const { result } = renderHook(() => useScrollIntoView())

    act(() => result.current.scrollIntoView(el, 'nearest'))
    // CSS scroll anchoring reacting to a layout shift alongside this
    // scroll (an expanding toolbar under `el`, say) is what caused the
    // overshoot-and-settle bug -- there's nothing else it should be
    // protecting here, since this container's position is exactly what's
    // being managed for the length of the suppression window.
    expect(scrollParent.style.overflowAnchor).toBe('none')

    act(() => vi.advanceTimersByTime(PAST_SUPPRESSION_MS))
    expect(scrollParent.style.overflowAnchor).toBe('auto')
  })

  it("restores the scroll container's scroll anchoring on cancel", () => {
    vi.useFakeTimers()
    const { el, scrollParent } = renderElInScrollParent({
      top: 250,
      height: 100,
    })
    scrollParent.style.overflowAnchor = 'auto'
    const { result } = renderHook(() => useScrollIntoView())

    act(() => result.current.scrollIntoView(el, 'nearest'))
    act(() => result.current.cancel())

    expect(scrollParent.style.overflowAnchor).toBe('auto')
  })

  it('cancels a still-pending anchor restoration when a new scroll starts', () => {
    vi.useFakeTimers()
    const { el, scrollParent } = renderElInScrollParent({
      top: 250,
      height: 100,
    })
    const other = document.createElement('div')
    scrollParent.appendChild(other)
    const { result } = renderHook(() => useScrollIntoView())

    act(() => result.current.scrollIntoView(el, 'nearest'))
    // Most, but not all, of the first call's own suppression window --
    // its restoration is still pending when the second call starts.
    act(() => vi.advanceTimersByTime(250))
    act(() => result.current.scrollIntoView(other, 'nearest'))
    // Past when the first call's own restoration would have fired, had the
    // second call not cancelled it -- catching it turning anchoring back
    // on mid-way through the second call's own suppression window.
    act(() => vi.advanceTimersByTime(60))

    expect(scrollParent.style.overflowAnchor).toBe('none')
  })

  it('stops a pending anchor restoration on unmount, leaving anchoring as it was', () => {
    vi.useFakeTimers()
    const { el, scrollParent } = renderElInScrollParent({
      top: 250,
      height: 100,
    })
    scrollParent.style.overflowAnchor = 'auto'
    const { result, unmount } = renderHook(() => useScrollIntoView())

    act(() => result.current.scrollIntoView(el, 'nearest'))
    unmount()

    expect(scrollParent.style.overflowAnchor).toBe('auto')
  })

  it('reports the scroll ended straight away when it jumps', () => {
    const { el } = renderElInScrollParent({ top: 250, height: 100 })
    const onScrollEnd = vi.fn()
    const { result } = renderHook(() => useScrollIntoView())

    act(() => result.current.scrollIntoView(el, 'nearest', { onScrollEnd }))

    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  describe("with behavior 'smooth'", () => {
    /** Renders `el` cut off below its scroll container, with the container's `scrollTo` stubbed out. */
    const renderCutOffEl = () => {
      const layout = renderElInScrollParent({ top: 250, height: 100 })
      layout.scrollParent.style.overflowAnchor = 'auto'
      const scrollTo = vi
        .spyOn(layout.scrollParent, 'scrollTo')
        .mockImplementation(() => {
          // happy-dom has no smooth scroll to run, so this only records the request.
        })
      return { ...layout, scrollTo }
    }

    it("hands the scroll to the browser's own smooth scroll, keeping anchoring off until it ends", () => {
      const { el, scrollParent, scrollTo } = renderCutOffEl()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', { behavior: 'smooth' })
      )
      expect(scrollTo).toHaveBeenCalledWith({ top: 150, behavior: 'smooth' })
      expect(scrollParent.style.overflowAnchor).toBe('none')

      act(() => {
        scrollParent.dispatchEvent(new Event('scrollend'))
      })
      expect(scrollParent.style.overflowAnchor).toBe('auto')
    })

    it('reports the scroll ended only once it does', () => {
      const { el, scrollParent } = renderCutOffEl()
      const onScrollEnd = vi.fn()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', {
          behavior: 'smooth',
          onScrollEnd,
        })
      )
      expect(onScrollEnd).not.toHaveBeenCalled()

      act(() => {
        scrollParent.dispatchEvent(new Event('scrollend'))
      })
      expect(onScrollEnd).toHaveBeenCalledOnce()
    })

    it('never reports the end of a scroll cancelled first', () => {
      const { el, scrollParent } = renderCutOffEl()
      const onScrollEnd = vi.fn()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', {
          behavior: 'smooth',
          onScrollEnd,
        })
      )
      act(() => result.current.cancel())
      act(() => {
        scrollParent.dispatchEvent(new Event('scrollend'))
      })

      expect(onScrollEnd).not.toHaveBeenCalled()
    })

    it("takes it as the hook's default, which a call can still override", () => {
      const { el, scrollParent, scrollTo } = renderCutOffEl()
      const { result } = renderHook(() =>
        useScrollIntoView({ scrollBehavior: 'smooth' })
      )

      act(() => result.current.scrollIntoView(el, 'nearest'))
      expect(scrollTo).toHaveBeenCalledWith({ top: 150, behavior: 'smooth' })

      act(() =>
        result.current.scrollIntoView(el, 'nearest', { behavior: 'instant' })
      )
      expect(scrollParent.scrollTop).toBe(150)
    })

    it('ignores a scrollend that comes before it lands', () => {
      const { el, scrollParent } = renderCutOffEl()
      vi.spyOn(scrollParent, 'scrollHeight', 'get').mockReturnValue(1000)
      const onScrollEnd = vi.fn()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', {
          behavior: 'smooth',
          onScrollEnd,
        })
      )
      // The end of the scroll this one interrupted, still at the start.
      act(() => {
        scrollParent.dispatchEvent(new Event('scrollend'))
      })
      expect(onScrollEnd).not.toHaveBeenCalled()

      scrollParent.scrollTop = 150
      act(() => {
        scrollParent.dispatchEvent(new Event('scrollend'))
      })
      expect(onScrollEnd).toHaveBeenCalledOnce()
    })

    it("jumps instead where the DOM can't tell whether the user prefers reduced motion", () => {
      // jsdom, say, has no `matchMedia`.
      vi.stubGlobal('matchMedia', undefined)
      const { el, scrollParent, scrollTo } = renderCutOffEl()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', { behavior: 'smooth' })
      )

      expect(scrollTo).not.toHaveBeenCalled()
      expect(scrollParent.scrollTop).toBe(150)
    })

    it('jumps instead when the user prefers reduced motion', () => {
      mockMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')
      const { el, scrollParent, scrollTo } = renderCutOffEl()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', { behavior: 'smooth' })
      )

      expect(scrollTo).not.toHaveBeenCalled()
      expect(scrollParent.scrollTop).toBe(150)
    })

    it('stops the scroll where it is on cancel, and restores anchoring', () => {
      const { el, scrollParent, scrollTo } = renderCutOffEl()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', { behavior: 'smooth' })
      )
      // Partway there when it's cancelled.
      scrollParent.scrollTop = 60
      act(() => result.current.cancel())

      expect(scrollTo).toHaveBeenLastCalledWith({
        top: 60,
        behavior: 'instant',
      })
      expect(scrollParent.style.overflowAnchor).toBe('auto')
    })

    it('restores anchoring anyway where the browser never fires scrollend', () => {
      vi.useFakeTimers()
      const { el, scrollParent } = renderCutOffEl()
      const { result } = renderHook(() => useScrollIntoView())

      act(() =>
        result.current.scrollIntoView(el, 'nearest', { behavior: 'smooth' })
      )
      // Past the anchor-suppression window an instant scroll gets, but well
      // short of what a smooth one waits for its end.
      act(() => vi.advanceTimersByTime(PAST_SUPPRESSION_MS))
      expect(scrollParent.style.overflowAnchor).toBe('none')

      act(() => vi.advanceTimersByTime(1000))
      expect(scrollParent.style.overflowAnchor).toBe('auto')
    })
  })
})
