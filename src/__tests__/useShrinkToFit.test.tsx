import { useRef } from 'react'
import { act, render, screen } from '@testing-library/react'

import { mockResizeObserver } from '@/test-support'
import { useShrinkToFit } from '../useShrinkToFit'

const T_IDS = { LINE: 'line', TEXT: 'text' } as const

afterEach(() => {
  vi.restoreAllMocks()
})

// One line's height, as the text's own.
const LINE_HEIGHT = 24

// The text's sizes, largest first.
const SIZES = ['large', 'medium', 'small'] as const

type Size = (typeof SIZES)[number]

// What the test DOM, which lays nothing out, measures: the line's width, the
// sizes it wraps at, and its padding above and below.
const layout: { width: number; wrapsAt: Size[]; padding: number } = {
  width: 400,
  wrapsAt: [],
  padding: 0,
}

type ShrinkingLineProps = {
  /** How many of `SIZES` the text may take, largest first */
  stepCount?: number
}

/** A line around its text, whose content is the size the hook steps it to. */
const ShrinkingLine = ({ stepCount = SIZES.length }: ShrinkingLineProps) => {
  const lineRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const step = useShrinkToFit({ lineRef, textRef, stepCount })
  return (
    <div
      ref={lineRef}
      style={{ paddingTop: layout.padding, paddingBottom: layout.padding }}
      data-testid={T_IDS.LINE}>
      <span ref={textRef} data-testid={T_IDS.TEXT}>
        {SIZES.slice(0, stepCount)[step]}
      </span>
    </div>
  )
}

/** Measures the line two lines tall, inside its padding, where it wraps at its text's size, and as wide as set. */
const mockLayout = () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
    () => layout.width
  )
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
    LINE_HEIGHT
  )
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      const size = this.textContent as Size
      const lines = layout.wrapsAt.includes(size) ? 2 : 1
      return LINE_HEIGHT * lines + layout.padding * 2
    }
  )
}

/** Stands in for `document.fonts`, which the test DOM lacks, returning a function that reports a font loaded. */
const mockFonts = () => {
  const fonts = new EventTarget()
  Object.defineProperty(document, 'fonts', { value: fonts, configurable: true })
  onTestFinished(() => {
    Reflect.deleteProperty(document, 'fonts')
  })
  return () =>
    act(() => {
      fonts.dispatchEvent(new Event('loadingdone'))
    })
}

/** The size the hook stepped the text to. */
const getSize = () => screen.getByTestId(T_IDS.TEXT).textContent

describe('useShrinkToFit', () => {
  beforeEach(() => {
    Object.assign(layout, { width: 400, wrapsAt: [], padding: 0 })
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

  it("measures the line inside its padding, which doesn't count as a wrap", () => {
    layout.padding = 4
    layout.wrapsAt = ['large']
    render(<ShrinkingLine />)

    expect(getSize()).toBe('medium')
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

  it('measures again from the largest for a new number of sizes', () => {
    layout.wrapsAt = ['large', 'medium']
    const { rerender } = render(<ShrinkingLine />)
    expect(getSize()).toBe('small')

    // Without the smallest, every size left wraps, so none is worth taking.
    rerender(<ShrinkingLine stepCount={2} />)
    expect(getSize()).toBe('large')
  })

  it('measures again once a font loads, which changes how wide the text runs', () => {
    const loadFont = mockFonts()
    render(<ShrinkingLine />)
    expect(getSize()).toBe('large')

    // The loaded font runs wider, so the largest size wraps now.
    layout.wrapsAt = ['large']
    loadFont()
    expect(getSize()).toBe('medium')
  })
})
