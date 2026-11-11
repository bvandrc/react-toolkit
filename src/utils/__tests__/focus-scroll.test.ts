import { onFocusScrollEnd } from '../focus-scroll'
import {
  createElementAt,
  createScrollContainer,
  VIEWPORT_HEIGHT,
} from './layout-fixtures'

describe('onFocusScrollEnd', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT)
  })

  /** Ends the page's scroll, which bubbles up to the window, as a browser's does. */
  const endPageScroll = () =>
    document.dispatchEvent(new Event('scrollend', { bubbles: true }))

  /** Resolves after the callbacks of the next `count` animation frames have run. */
  const waitForFrames = (count: number) =>
    new Promise((resolve) => {
      const waitOne = (left: number) =>
        requestAnimationFrame(() =>
          left > 1 ? waitOne(left - 1) : setTimeout(resolve)
        )
      waitOne(count)
    })

  /** Resolves after the next animation frame's callbacks have run. */
  const waitForFrame = () => waitForFrames(1)

  /** Resolves once the two frames waited out past the last scroll's end have run. */
  const waitPastScrollEnd = () => waitForFrames(2)

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

  it('ignores the scroll of the element itself, which never moves it', async () => {
    const element = createElementAt(2000)
    element.style.overflowY = 'auto'
    const callback = vi.fn()
    onFocusScrollEnd(element, callback)

    await waitForFrame()
    document.dispatchEvent(new Event('scroll', { bubbles: true }))
    element.dispatchEvent(new Event('scroll'))
    endPageScroll()
    await waitPastScrollEnd()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('still counts the container the element sat in when called, once a render moves it out', async () => {
    const container = createScrollContainer()
    const element = createElementAt(2000, container)
    const callback = vi.fn()
    onFocusScrollEnd(element, callback)

    await waitForFrame()
    document.dispatchEvent(new Event('scroll', { bubbles: true }))
    container.dispatchEvent(new Event('scroll'))
    element.remove()
    endPageScroll()
    await waitPastScrollEnd()
    expect(callback).not.toHaveBeenCalled()
    container.dispatchEvent(new Event('scrollend'))
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
    const FRAMES_IN = [
      0, // Before the first of the two frames.
      1, // Between them, once the second is requested.
    ]
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
