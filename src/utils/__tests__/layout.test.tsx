import { render, screen } from '@testing-library/react'

import { mockScrollLayout, mockVisualViewport } from '@/test-support'
import {
  findScrollableAncestor,
  getContentHeight,
  getRoomAround,
  getTargetScrollTop,
  getVisibleBounds,
  isInView,
  onFocusScrollEnd,
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

/** Sets the page's own scroll padding for one case, as a sticky header would. */
const setPageScrollPadding = (padding: Partial<CSSStyleDeclaration>) => {
  const { style } = document.documentElement
  Object.assign(style, padding)
  // The setup clears the body's style after each case, but not the root's.
  onTestFinished(() => {
    style.removeProperty('scroll-padding-top')
    style.removeProperty('scroll-padding-bottom')
  })
}

describe('getVisibleBounds', () => {
  it("leaves out a scroll container's scroll padding, in px or as a share of its height", () => {
    const CASES = [
      ['none', { scrollPaddingTop: '', scrollPaddingBottom: '' }, 200, 400],
      [
        'px',
        { scrollPaddingTop: '48px', scrollPaddingBottom: '8px' },
        248,
        392,
      ],
      // Of its 200px height.
      ['%', { scrollPaddingTop: '10%', scrollPaddingBottom: '5%' }, 220, 390],
    ] as const
    for (const [unit, padding, top, bottom] of CASES) {
      const container = document.createElement('div')
      Object.assign(container.style, padding)
      // Attached, since the test DOM computes no style for a detached one.
      document.body.append(container)
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ y: 200, height: 200 })
      )
      vi.spyOn(container, 'clientHeight', 'get').mockReturnValue(200)

      expect(getVisibleBounds(container), unit).toEqual({ top, bottom })
    }
  })

  it("leaves out the page's scroll padding from the window", () => {
    vi.stubGlobal('innerHeight', 600)
    setPageScrollPadding({ scrollPaddingTop: '48px' })

    expect(getVisibleBounds(document.scrollingElement as HTMLElement)).toEqual({
      top: 48,
      bottom: 600,
    })
  })
})

describe('getTargetScrollTop', () => {
  /** How much of the scroll container shows at once. */
  const VISIBLE_HEIGHT = 200

  /**
   * An element `top` below its scroll container's content top and `height`
   * tall, with the container scrolled to `scrollTop`.
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
    mockScrollLayout(scrollParent, el, {
      top,
      height,
      visibleHeight: VISIBLE_HEIGHT,
    })
    return { el, scrollParent }
  }

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

  it('centers the element below its scroll padding with center', () => {
    const { el, scrollParent } = createElInScrollParent({
      top: 250,
      height: 100,
      scrollTop: 100,
    })
    // A 40px sticky header, leaving 160px visible below it.
    scrollParent.style.scrollPaddingTop = '40px'

    // Its middle, 300 down, sits half that 160px below the header's 40px.
    expect(getTargetScrollTop(el, 'center', scrollParent)).toBe(180)
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

  it("leaves the page where it is for an element on a fixed layer, which the page's scroll doesn't move", () => {
    vi.stubGlobal('innerHeight', 600)
    // A field in the strip the page's padding keeps clear, in a dialog with
    // no scroll container of its own.
    setPageScrollPadding({ scrollPaddingTop: '48px' })
    const dialog = document.createElement('div')
    dialog.style.position = 'fixed'
    const field = document.createElement('input')
    dialog.append(field)
    document.body.append(dialog)
    vi.spyOn(field, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ y: 10, height: 20 })
    )
    const page = document.scrollingElement as HTMLElement
    vi.spyOn(page, 'scrollTop', 'get').mockReturnValue(300)

    for (const block of ['start', 'center', 'nearest'] as const) {
      expect(getTargetScrollTop(field, block), block).toBe(300)
    }
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

describe('getContentHeight', () => {
  it('measures inside the padding, and counts an empty one as none', () => {
    const CASES = [
      // Padded 4px above and 6px below a 48px content box.
      ['4px', '6px', 48],
      // Unset, as a DOM that doesn't lay out leaves it.
      ['', '', 58],
    ] as const
    for (const [paddingTop, paddingBottom, expected] of CASES) {
      const el = document.createElement('div')
      Object.assign(el.style, { paddingTop, paddingBottom })
      // Attached, since the test DOM computes no style for a detached one.
      document.body.append(el)
      vi.spyOn(el, 'clientHeight', 'get').mockReturnValue(58)

      expect(getContentHeight(el), `padded ${paddingTop || 'none'}`).toBe(
        expected
      )
    }
  })
})

const VIEWPORT_HEIGHT = 768

/** Creates an element laid out 20px tall at `top`, and `left` across, inside `parent`. */
const createElementAt = (
  top: number,
  parent: ParentNode = document.body,
  left = 0
) => {
  const element = document.createElement('a')
  parent.append(element)
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: left, y: top, width: 100, height: 20 })
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

describe('isInView', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT)
  })

  it('is true only for an element wholly inside the window and its scroll container', () => {
    const container = createScrollContainer()
    const CASES = [
      ['in the window', createElementAt(100), true],
      ['below the window', createElementAt(2000), false],
      ['above the window', createElementAt(-10), false],
      [
        'off the window to the left',
        createElementAt(100, document.body, -5),
        false,
      ],
      ['in its container', createElementAt(250, container), true],
      // In the window, but scrolled out of the container's visible part.
      ['above its container', createElementAt(150, container), false],
      ['below its container', createElementAt(320, container), false],
    ] as const
    for (const [where, element, expected] of CASES) {
      expect(isInView(element), where).toBe(expected)
    }
  })

  it("leaves out the page's scroll padding only for an element that scrolls with the page", () => {
    setPageScrollPadding({ scrollPaddingTop: '220px' })
    const container = createScrollContainer()
    const fixedLayer = document.createElement('div')
    fixedLayer.style.position = 'fixed'
    document.body.append(fixedLayer)
    const fixedContainer = createScrollContainer()
    fixedLayer.append(fixedContainer)
    const CASES = [
      ['under the header', createElementAt(210), false],
      ['below the header', createElementAt(220), true],
      // Its container, 200px down, has scrolled partly under the header.
      [
        'in its container, under the header',
        createElementAt(210, container),
        false,
      ],
      // A dialog sits over the header, so the page's padding doesn't apply.
      ['on a fixed layer', createElementAt(210, fixedLayer), true],
      [
        'in a scroll container on a fixed layer',
        createElementAt(210, fixedContainer),
        true,
      ],
    ] as const
    for (const [where, element, expected] of CASES) {
      expect(isInView(element), where).toBe(expected)
    }
  })
})

describe('onFocusScrollEnd', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT)
  })

  /** Ends the page's scroll, which bubbles up to the window, as a browser's does. */
  const endPageScroll = () =>
    document.dispatchEvent(new Event('scrollend', { bubbles: true }))

  /** Resolves after the next animation frame's callbacks have run. */
  const waitForFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)))

  /** Resolves once the two frames waited out past the last scroll's end have run. */
  const waitPastScrollEnd = () =>
    new Promise((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTimeout(resolve))
      )
    )

  it('calls back a frame on for an element already in view', async () => {
    const callback = vi.fn()
    onFocusScrollEnd(createElementAt(100), callback)

    expect(callback).not.toHaveBeenCalled()
    await waitForFrame()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('calls back once the page has scrolled an element out of view to it', async () => {
    const callback = vi.fn()
    onFocusScrollEnd(createElementAt(2000), callback)

    await waitForFrame()
    expect(callback).not.toHaveBeenCalled()
    endPageScroll()
    endPageScroll()
    // Not yet, in case another scroll follows.
    expect(callback).not.toHaveBeenCalled()
    await waitPastScrollEnd()
    expect(callback).toHaveBeenCalledOnce()
  })

  it("calls back once a scroll container's own scroll ends, for an element its overflow hides", async () => {
    const container = createScrollContainer()
    const callback = vi.fn()
    onFocusScrollEnd(createElementAt(320, container), callback)

    await waitForFrame()
    expect(callback).not.toHaveBeenCalled()
    // A scroll container's `scrollend` doesn't bubble.
    container.dispatchEvent(new Event('scrollend'))
    await waitPastScrollEnd()
    expect(callback).toHaveBeenCalledOnce()
  })

  it("ignores a scroll ending elsewhere, as a sticky bar's own does, until the page's ends", async () => {
    // Beside the element, not around it, so its scroll never moves it.
    const bar = createScrollContainer()
    const callback = vi.fn()
    onFocusScrollEnd(createElementAt(2000), callback)

    await waitForFrame()
    document.dispatchEvent(new Event('scroll', { bubbles: true }))
    bar.dispatchEvent(new Event('scroll'))
    bar.dispatchEvent(new Event('scrollend'))
    await waitPastScrollEnd()
    expect(callback).not.toHaveBeenCalled()
    endPageScroll()
    await waitPastScrollEnd()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('waits for both the page and the container around the element to stop, whichever ends first', async () => {
    const CASES = ['page first', 'container first'] as const
    for (const order of CASES) {
      const container = createScrollContainer()
      const callback = vi.fn()
      onFocusScrollEnd(createElementAt(2000, container), callback)
      const ENDS = {
        page: endPageScroll,
        container: () => container.dispatchEvent(new Event('scrollend')),
      }
      const [first, last] =
        order === 'page first'
          ? [ENDS.page, ENDS.container]
          : [ENDS.container, ENDS.page]

      await waitForFrame()
      document.dispatchEvent(new Event('scroll', { bubbles: true }))
      container.dispatchEvent(new Event('scroll'))
      first()
      await waitPastScrollEnd()
      expect(callback, order).not.toHaveBeenCalled()
      last()
      await waitPastScrollEnd()
      expect(callback, order).toHaveBeenCalledOnce()
      container.remove()
    }
  })

  it("waits for the page's scroll that starts the frame after the container's ends, as a browser running them in turn does", async () => {
    const container = createScrollContainer()
    const callback = vi.fn()
    onFocusScrollEnd(createElementAt(2000, container), callback)

    await waitForFrame()
    container.dispatchEvent(new Event('scroll'))
    container.dispatchEvent(new Event('scrollend'))
    // The page's first `scroll`, a frame after the container's `scrollend`:
    // past a frame request made on that end, but ahead of one made in it.
    requestAnimationFrame(() =>
      document.dispatchEvent(new Event('scroll', { bubbles: true }))
    )
    await waitPastScrollEnd()
    expect(callback).not.toHaveBeenCalled()
    endPageScroll()
    await waitPastScrollEnd()
    expect(callback).toHaveBeenCalledOnce()
  })

  it("ignores the page's scroll for an element on a fixed layer, like a dialog, which it never moves", async () => {
    const container = createScrollContainer()
    container.style.position = 'fixed'
    const callback = vi.fn()
    onFocusScrollEnd(createElementAt(320, container), callback)

    await waitForFrame()
    document.dispatchEvent(new Event('scroll', { bubbles: true }))
    endPageScroll()
    await waitPastScrollEnd()
    expect(callback).not.toHaveBeenCalled()
    container.dispatchEvent(new Event('scrollend'))
    await waitPastScrollEnd()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('counts the scroll of a container around the shadow root the element sits in', async () => {
    const container = createScrollContainer()
    const host = document.createElement('div')
    container.append(host)
    const callback = vi.fn()
    onFocusScrollEnd(
      createElementAt(2000, host.attachShadow({ mode: 'open' })),
      callback
    )

    await waitForFrame()
    document.dispatchEvent(new Event('scroll', { bubbles: true }))
    container.dispatchEvent(new Event('scroll'))
    endPageScroll()
    await waitPastScrollEnd()
    expect(callback).not.toHaveBeenCalled()
    container.dispatchEvent(new Event('scrollend'))
    await waitPastScrollEnd()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('calls back anyway a second on, for a scroll that never says it ended', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    onFocusScrollEnd(createElementAt(2000), callback)

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
    onFocusScrollEnd(createElementAt(100), callback)()
    onFocusScrollEnd(createElementAt(2000), callback)()

    await vi.advanceTimersByTimeAsync(1000)
    endPageScroll()
    expect(callback).not.toHaveBeenCalled()
  })

  it('never calls back once called off while waiting out the frames after the last scroll ends', async () => {
    // Called off before the first of the two frames, and between them.
    const FRAMES_IN = [0, 1]
    for (const framesIn of FRAMES_IN) {
      const callback = vi.fn()
      const cancel = onFocusScrollEnd(createElementAt(2000), callback)

      endPageScroll()
      if (framesIn > 0) await new Promise(requestAnimationFrame)
      cancel()
      await waitPastScrollEnd()
      expect(callback, `${framesIn} frames in`).not.toHaveBeenCalled()
    }
  })
})
