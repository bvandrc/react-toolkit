import { useRef } from 'react'
import { render, screen } from '@testing-library/react'

import { mockResizeObserver } from '@/test-support'
import { useShrinkToFit } from '../useShrinkToFit'

afterEach(() => {
  vi.restoreAllMocks()
})

// One line's height, as the text's own.
const LINE_HEIGHT = 24

// The text's sizes, largest first.
const SIZES = ['large', 'medium', 'small'] as const

type Size = (typeof SIZES)[number]

// What the test DOM, which lays nothing out, measures: the line's width, and
// the sizes it wraps at.
const layout: { width: number; wrapsAt: Size[] } = { width: 400, wrapsAt: [] }

/** A line around its text, whose content is the size the hook steps it to. */
const ShrinkingLine = () => {
  const lineRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const step = useShrinkToFit(lineRef, textRef, SIZES.length)
  return (
    <div ref={lineRef} data-testid="line">
      <span ref={textRef} data-testid="text">
        {SIZES[step]}
      </span>
    </div>
  )
}

/** Measures the line two lines tall where it wraps at its text's size, and as wide as set. */
const mockLayout = () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
    () => layout.width
  )
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      if (this.dataset.testid !== 'line') {
        return LINE_HEIGHT
      }
      const size = this.textContent as Size
      return layout.wrapsAt.includes(size) ? LINE_HEIGHT * 2 : LINE_HEIGHT
    }
  )
}

/** The size the hook stepped the text to. */
const getSize = () => screen.getByTestId('text').textContent

describe('useShrinkToFit', () => {
  beforeEach(() => {
    Object.assign(layout, { width: 400, wrapsAt: [] })
    mockLayout()
  })

  it('steps down to the largest size that keeps the line from wrapping', () => {
    const CASES = [
      // Fits as it is, so nothing to save.
      [[], 'large'],
      [['large'], 'medium'],
      // A step further, where the first step still wraps.
      [['large', 'medium'], 'small'],
      // Wraps at every size, so shrinking saves nothing.
      [['large', 'medium', 'small'], 'large'],
    ] as const
    for (const [wrapsAt, expected] of CASES) {
      layout.wrapsAt = [...wrapsAt]
      const { unmount } = render(<ShrinkingLine />)
      expect(getSize(), `wraps at ${wrapsAt.join(', ')}`).toBe(expected)
      unmount()
    }
  })

  it("measures again when the line's width changes, and not when only its height does", () => {
    const resize = mockResizeObserver()
    layout.wrapsAt = ['large', 'medium']
    render(<ShrinkingLine />)
    expect(getSize()).toBe('small')

    // Taller or shorter, as stepping its text makes it, at its width.
    layout.wrapsAt = []
    resize()
    expect(getSize()).toBe('small')

    // Wide enough now for the largest size.
    layout.width = 800
    resize()
    expect(getSize()).toBe('large')

    // Narrower again, where the largest size wraps once more.
    layout.width = 400
    layout.wrapsAt = ['large']
    resize()
    expect(getSize()).toBe('medium')
  })
})
