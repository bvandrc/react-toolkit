import { act, renderHook } from '@testing-library/react'

import { useUrlHashTarget } from '../useUrlHashTarget'

/** Puts an element with `id` on the page, and returns its mocked `scrollIntoView`. */
const createTarget = (id: string) => {
  const target = document.createElement('div')
  target.id = id
  document.body.append(target)
  const scrollIntoView = vi.fn()
  target.scrollIntoView = scrollIntoView
  return scrollIntoView
}

/** Sets the URL's `#` and fires `hashchange`, as following an in-page link does. */
const changeHash = (hash: string) =>
  act(() => {
    window.history.replaceState(null, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })

/** Runs the next animation frame's callbacks. */
const advanceFrame = () => act(() => vi.advanceTimersToNextFrame())

// Which target it lands on, and when, is the hook's own; how a `#` reads is
// `parseUrlHash`'s, tested there.
describe('useUrlHashTarget', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    })
  })

  // The URL outlives the case, for every file after it in the worker.
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it("jumps to the `#`'s element a frame after rendering, and returns its target a frame after that", () => {
    window.history.replaceState(null, '', '/#pricing?plan=pro')
    const scrollIntoView = createTarget('pricing')
    const { result } = renderHook(useUrlHashTarget)
    // Not until what's above it has settled.
    expect(scrollIntoView).not.toHaveBeenCalled()

    advanceFrame()
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant' })
    // Not until past the jump's scroll event.
    expect(result.current).toBeUndefined()

    advanceFrame()
    expect(result.current?.id).toBe('pricing')
  })

  it('jumps again to a `#` with parameters it changes to, which names no element the browser could find', () => {
    const scrollIntoView = createTarget('pricing')
    const { result } = renderHook(useUrlHashTarget)

    changeHash('#pricing?plan=pro')
    advanceFrame()
    advanceFrame()
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(result.current?.id).toBe('pricing')
  })

  it('leaves a plain `#id` it changes to for the browser to scroll to, returning it at once', () => {
    const scrollIntoView = createTarget('pricing')
    const { result } = renderHook(useUrlHashTarget)

    changeHash('#pricing')
    expect(result.current?.id).toBe('pricing')

    advanceFrame()
    advanceFrame()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('drops a landing still on its way when the `#` changes again', () => {
    window.history.replaceState(null, '', '/#pricing?plan=pro')
    const scrollToPricing = createTarget('pricing')
    const scrollToFaq = createTarget('faq')
    const { result } = renderHook(useUrlHashTarget)

    changeHash('#faq?open=1')
    advanceFrame()
    advanceFrame()
    expect(scrollToPricing).not.toHaveBeenCalled()
    expect(scrollToFaq).toHaveBeenCalledOnce()
    expect(result.current?.id).toBe('faq')
  })
})
