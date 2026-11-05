import { fireEvent, render } from '@testing-library/react'

import {
  mockResizeObserver,
  mockTouchDevice,
  mockVisualViewport,
} from '@/test-support'
import { useScrollOnFocus } from '../useScrollOnFocus'

afterEach(() => {
  vi.restoreAllMocks()
})

const Field = () => {
  const handlers = useScrollOnFocus('nearest')
  // `fireEvent.focus`/`blur` dispatch directly, so this needs no real
  // interactivity of its own -- only the focus/blur handlers under test.
  return <div data-testid="field" {...handlers} />
}

/** How much of the scroll container shows at once. */
const VISIBLE_HEIGHT = 200

/**
 * Renders the field inside a scrollable ancestor, with layout stubbed so the
 * field sits `layout.top` below that ancestor's content top and is
 * `layout.height` tall, with `layout.visibleHeight` of the ancestor showing -- happy-dom does no real layout, so the hook has
 * nothing to measure without this. `layout` is read live, so a case can
 * resize the field by changing it.
 */
const renderFieldInScrollParent = (layout: {
  top: number
  height: number
  visibleHeight?: number
}) => {
  const { getByTestId } = render(
    <div data-testid="scroll-parent" style={{ overflowY: 'auto' }}>
      <Field />
    </div>
  )
  const scrollParent = getByTestId('scroll-parent')
  vi.spyOn(scrollParent, 'clientHeight', 'get').mockImplementation(
    () => layout.visibleHeight ?? VISIBLE_HEIGHT
  )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      if (this === scrollParent) return { top: 0 } as DOMRect
      const top = layout.top - scrollParent.scrollTop
      return { top, bottom: top + layout.height } as DOMRect
    }
  )
  return { field: getByTestId('field'), scrollParent }
}

describe('useScrollOnFocus', () => {
  it('scrolls a partly hidden field fully into view on focus, touch screen or not', () => {
    mockTouchDevice(false)
    const { field, scrollParent } = renderFieldInScrollParent({
      top: 150,
      height: 100,
    })

    fireEvent.focus(field)

    // Which way and how far for each case is `useScrollIntoView`'s own
    // behavior to cover -- this only checks that focus asks it to scroll.
    expect(scrollParent.scrollTop).toBe(50)
  })

  it('keeps the field fully in view as it grows while focused', () => {
    mockTouchDevice(false)
    const reportResize = mockResizeObserver()
    const layout = { top: 50, height: 100 }
    const { field, scrollParent } = renderFieldInScrollParent(layout)

    fireEvent.focus(field)
    // A toolbar expanding under the text, say.
    layout.height = 180
    reportResize()

    expect(scrollParent.scrollTop).toBe(30)
  })

  it('keeps the field fully in view as the on-screen keyboard opens', () => {
    mockTouchDevice(true)
    const viewport = mockVisualViewport({ height: 800 })
    const layout = { top: 50, height: 100, visibleHeight: VISIBLE_HEIGHT }
    const { field, scrollParent } = renderFieldInScrollParent(layout)

    fireEvent.focus(field)
    // The keyboard covers the bottom of the container along with the page.
    layout.visibleHeight = 120
    viewport.change({ height: 500 }, 'resize')

    expect(scrollParent.scrollTop).toBe(30)
  })

  it('stops following resizes once blurred', () => {
    mockTouchDevice(false)
    const reportResize = mockResizeObserver()
    const layout = { top: 50, height: 100 }
    const { field, scrollParent } = renderFieldInScrollParent(layout)

    fireEvent.focus(field)
    fireEvent.blur(field)
    layout.height = 180
    reportResize()

    expect(scrollParent.scrollTop).toBe(0)
  })

  it('puts the field back where focus left it once the keyboard closes, on touch devices', () => {
    mockTouchDevice(true)
    const { field, scrollParent } = renderFieldInScrollParent({
      top: 50,
      height: 100,
    })

    fireEvent.focus(field)
    // iOS scrolling the container on its own to keep the caret clear.
    scrollParent.scrollTop = 120
    fireEvent.blur(field)

    expect(scrollParent.scrollTop).toBe(0)
  })

  it('leaves the scroll position alone on blur without a touch screen', () => {
    mockTouchDevice(false)
    const { field, scrollParent } = renderFieldInScrollParent({
      top: 50,
      height: 100,
    })

    fireEvent.focus(field)
    scrollParent.scrollTop = 120
    fireEvent.blur(field)

    expect(scrollParent.scrollTop).toBe(120)
  })

  it('leaves the scroll position alone on a blur that hands focus to another control', () => {
    mockTouchDevice(true)
    const { field, scrollParent } = renderFieldInScrollParent({
      top: 50,
      height: 100,
    })
    const other = document.createElement('button')
    document.body.appendChild(other)

    fireEvent.focus(field)
    scrollParent.scrollTop = 120
    fireEvent.blur(field, { relatedTarget: other })

    expect(scrollParent.scrollTop).toBe(120)
  })
})
