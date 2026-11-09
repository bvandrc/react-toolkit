import { render, screen } from '@testing-library/react'

import { mockVisualViewport } from '@/test-support'
import {
  afterFocusScroll,
  findScrollableAncestor,
  getRoomAround,
  getTargetScrollTop,
} from '../layout'

describe('findScrollableAncestor', () => {
  const TEXT = { TARGET: 'Target' }
  const T_IDS = {
    NEAREST: 'nearest',
    OUTER: 'outer',
  } as const

  /**
   * Renders the target three ancestors deep, the middle and outer ones with
   * `overflowY` and the one around the target never scrolling.
   */
  const renderNested = ({
    overflowY,
  }: Pick<React.CSSProperties, 'overflowY'>) => {
    render(
      <div data-testid={T_IDS.OUTER} style={{ overflowY }}>
        <div data-testid={T_IDS.NEAREST} style={{ overflowY }}>
          <div style={{ overflowY: 'hidden' }}>
            <span>{TEXT.TARGET}</span>
          </div>
        </div>
      </div>
    )
    return screen.getByText(TEXT.TARGET)
  }

  it('finds the nearest ancestor that scrolls', () => {
    for (const overflowY of ['auto', 'scroll'] as const) {
      const target = renderNested({ overflowY })

      expect(findScrollableAncestor(target), overflowY).toBe(
        screen.getByTestId(T_IDS.NEAREST)
      )
      document.body.innerHTML = ''
    }
  })

  it('looks past the node itself', () => {
    // The node is what gets scrolled into view, not where it scrolls.
    render(
      <div data-testid={T_IDS.NEAREST} style={{ overflowY: 'auto' }}>
        <div style={{ overflowY: 'auto' }}>{TEXT.TARGET}</div>
      </div>
    )

    expect(findScrollableAncestor(screen.getByText(TEXT.TARGET))).toBe(
      screen.getByTestId(T_IDS.NEAREST)
    )
  })

  it('falls back to the document when nothing above scrolls', () => {
    const target = renderNested({ overflowY: 'visible' })

    expect(findScrollableAncestor(target)).toBe(
      document.scrollingElement ?? document.documentElement
    )
  })
})

describe('getTargetScrollTop', () => {
  /** How much of the scroll container shows at once. */
  const VISIBLE_HEIGHT = 200

  /**
   * An element `top` below its scroll container's content top and `height`
   * tall, with the container scrolled to `scrollTop` -- happy-dom does no real
   * layout, so it's stubbed in.
   */
  const createElInScrollParent = ({
    top,
    height,
    scrollTop = 0,
  }: {
    top: number
    height: number
    scrollTop?: number
  }) => {
    const scrollParent = document.createElement('div')
    scrollParent.style.overflowY = 'auto'
    const el = document.createElement('div')
    scrollParent.appendChild(el)
    document.body.appendChild(scrollParent)
    scrollParent.scrollTop = scrollTop
    vi.spyOn(scrollParent, 'clientHeight', 'get').mockReturnValue(
      VISIBLE_HEIGHT
    )
    vi.spyOn(scrollParent, 'getBoundingClientRect').mockReturnValue({
      top: 0,
    } as DOMRect)
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: top - scrollTop,
      bottom: top - scrollTop + height,
    } as DOMRect)
    return { el, scrollParent }
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('measures against the nearest scrollable ancestor when given none', () => {
    const { el } = createElInScrollParent({
      top: 150,
      height: 100,
      scrollTop: 20,
    })

    // Only the stubbed ancestor gives 50 from scrollTop 20: the document
    // measures nothing under happy-dom.
    expect(getTargetScrollTop(el, 'nearest')).toBe(50)
  })

  it('aligns the top with start, even when already fully visible', () => {
    const { el, scrollParent } = createElInScrollParent({
      top: 50,
      height: 100,
    })

    expect(getTargetScrollTop(el, 'start', scrollParent)).toBe(50)
  })

  it('centers the element with center, even when already fully visible', () => {
    const { el, scrollParent } = createElInScrollParent({
      top: 250,
      height: 100,
      scrollTop: 100,
    })

    // Its middle, 300 down, sits half the 200px visible height below 200.
    expect(getTargetScrollTop(el, 'center', scrollParent)).toBe(200)
  })

  it('aligns the top with center when too tall to fit', () => {
    // Centering would scroll its top out of view.
    const { el, scrollParent } = createElInScrollParent({
      top: 50,
      height: VISIBLE_HEIGHT + 100,
    })

    expect(getTargetScrollTop(el, 'center', scrollParent)).toBe(50)
  })

  it('leaves a fully visible element where it is with nearest', () => {
    const { el, scrollParent } = createElInScrollParent({
      top: 50,
      height: 100,
      scrollTop: 30,
    })

    expect(getTargetScrollTop(el, 'nearest', scrollParent)).toBe(30)
  })

  it('aligns the bottom with nearest when cut off below', () => {
    const { el, scrollParent } = createElInScrollParent({
      top: 150,
      height: 100,
    })

    expect(getTargetScrollTop(el, 'nearest', scrollParent)).toBe(50)
  })

  it('aligns the top with nearest when cut off above', () => {
    const { el, scrollParent } = createElInScrollParent({
      top: 70,
      height: 100,
      scrollTop: 100,
    })

    expect(getTargetScrollTop(el, 'nearest', scrollParent)).toBe(70)
  })

  it('aligns the top with nearest when too tall to fit, wherever it was cut off', () => {
    const { el, scrollParent } = createElInScrollParent({
      top: 50,
      height: VISIBLE_HEIGHT + 100,
    })

    expect(getTargetScrollTop(el, 'nearest', scrollParent)).toBe(50)
  })
})

describe('getRoomAround', () => {
  /** An element from 100px to 140px down the layout viewport. */
  const createEl = () => {
    const el = document.createElement('div')
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 140,
    } as DOMRect)
    return el
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('measures against the window without a visual viewport', () => {
    vi.stubGlobal('visualViewport', undefined)
    vi.stubGlobal('innerHeight', 600)

    expect(getRoomAround(createEl())).toEqual({ above: 100, below: 460 })
  })

  it('leaves out what the visual viewport has scrolled past or the keyboard covers', () => {
    vi.stubGlobal('innerHeight', 600)
    // Scrolled 20px down the page, with a keyboard covering all but 300px.
    mockVisualViewport({ offsetTop: 20, height: 300 })

    expect(getRoomAround(createEl())).toEqual({ above: 80, below: 180 })
  })
})

describe('afterFocusScroll', () => {
  const VIEWPORT_HEIGHT = 768

  beforeEach(() => {
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT)
  })

  /** Creates an element laid out at `top`, 20px tall, inside `parent`. */
  const createElementAt = (
    top: number,
    parent: HTMLElement = document.body
  ) => {
    const element = document.createElement('a')
    parent.append(element)
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: top, width: 100, height: 20 })
    )
    return element
  }

  /** Creates a scroll container 100px tall, 200px down the viewport. */
  const createScrollContainer = () => {
    const container = document.createElement('div')
    container.style.overflowY = 'auto'
    document.body.append(container)
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 200, width: 100, height: 100 })
    )
    vi.spyOn(container, 'clientHeight', 'get').mockReturnValue(100)
    return container
  }

  /** Ends the page's scroll, which bubbles up to the window, as a browser's does. */
  const endPageScroll = () =>
    document.dispatchEvent(new Event('scrollend', { bubbles: true }))

  /** Resolves after the next animation frame's callbacks have run. */
  const waitForFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)))

  it('calls back a frame on for an element already in view', async () => {
    const callback = vi.fn()
    afterFocusScroll(createElementAt(100), callback)

    expect(callback).not.toHaveBeenCalled()
    await waitForFrame()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('calls back once the page has scrolled an element out of view to it', async () => {
    const callback = vi.fn()
    afterFocusScroll(createElementAt(2000), callback)

    await waitForFrame()
    expect(callback).not.toHaveBeenCalled()
    endPageScroll()
    endPageScroll()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('waits on a scroll container for an element its overflow hides, though the window shows it', async () => {
    const container = createScrollContainer()
    // Scrolled above the container's visible part, and below it.
    for (const top of [150, 320]) {
      const callback = vi.fn()
      afterFocusScroll(createElementAt(top, container), callback)

      await waitForFrame()
      expect(callback, `at ${top}px`).not.toHaveBeenCalled()
      // A scroll container's `scrollend` doesn't bubble.
      container.dispatchEvent(new Event('scrollend'))
      expect(callback, `at ${top}px`).toHaveBeenCalledOnce()
    }
  })

  it('calls back anyway a second on, for a scroll that never says it ended', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    afterFocusScroll(createElementAt(2000), callback)

    vi.advanceTimersByTime(999)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledOnce()
    // Nothing left waiting, once it's called back.
    endPageScroll()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('never calls back once called off', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    afterFocusScroll(createElementAt(100), callback)()
    afterFocusScroll(createElementAt(2000), callback)()

    await vi.advanceTimersByTimeAsync(1000)
    endPageScroll()
    expect(callback).not.toHaveBeenCalled()
  })
})
