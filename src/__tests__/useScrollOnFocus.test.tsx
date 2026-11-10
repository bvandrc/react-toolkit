import { act, fireEvent, render } from '@testing-library/react'

import {
  mockScrollLayout,
  type ScrollLayout,
  VISIBLE_HEIGHT,
} from '@/__tests__/support/mock-scroll-layout'
import {
  mockResizeObserver,
  mockTouchDevice,
  mockVisualViewport,
} from '@/test-support'
import type { ScrollIntoViewBehavior } from '@/useScrollIntoView'
import { useScrollOnFocus } from '../useScrollOnFocus'

const Field = ({
  scrollBehavior,
}: {
  scrollBehavior?: ScrollIntoViewBehavior
}) => {
  const handlers = useScrollOnFocus('nearest', { scrollBehavior })
  // `fireEvent.focus`/`blur` dispatch directly, so this needs no real
  // interactivity of its own -- only the focus/blur handlers under test.
  return <div data-testid="field" {...handlers} />
}

/**
 * Renders the field inside a scrollable ancestor, laid out as `layout` says --
 * happy-dom does no real layout, so the hook has nothing to measure without
 * it. `layout` is read live, so a case can resize the field by changing it.
 */
const renderFieldInScrollParent = (
  layout: ScrollLayout,
  scrollBehavior?: ScrollIntoViewBehavior
) => {
  const { getByTestId } = render(
    <div data-testid="scroll-parent" style={{ overflowY: 'auto' }}>
      <Field scrollBehavior={scrollBehavior} />
    </div>
  )
  const scrollParent = getByTestId('scroll-parent')
  mockScrollLayout(scrollParent, layout)
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

  it('puts the field back where a smooth scroll landed it once the keyboard closes', () => {
    mockTouchDevice(true)
    const { field, scrollParent } = renderFieldInScrollParent(
      { top: 150, height: 100 },
      'smooth'
    )
    vi.spyOn(scrollParent, 'scrollTo').mockImplementation(() => {
      // happy-dom has no smooth scroll to run, so this only stands in for it.
    })

    fireEvent.focus(field)
    // The smooth scroll landing.
    scrollParent.scrollTop = 50
    act(() => {
      scrollParent.dispatchEvent(new Event('scrollend'))
    })
    // iOS scrolling the container on its own to keep the caret clear.
    scrollParent.scrollTop = 120
    fireEvent.blur(field)

    expect(scrollParent.scrollTop).toBe(50)
  })

  it('leaves the field where a blur stopped a smooth scroll, on touch devices', () => {
    mockTouchDevice(true)
    const { field, scrollParent } = renderFieldInScrollParent(
      { top: 150, height: 100 },
      'smooth'
    )
    vi.spyOn(scrollParent, 'scrollTo').mockImplementation(() => {
      // happy-dom has no smooth scroll to run, so this only stands in for it.
    })

    fireEvent.focus(field)
    // The smooth scroll partway there when the blur stops it.
    scrollParent.scrollTop = 30
    fireEvent.blur(field)

    expect(scrollParent.scrollTop).toBe(30)
  })
})
