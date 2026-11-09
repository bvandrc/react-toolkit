import { useRef } from 'react'
import { createEvent, fireEvent, render, screen } from '@testing-library/react'

import { useZoomPanGestures, type ZoomPanGestures } from '../useZoomPanGestures'

const T_IDS = { TARGET: 'target' } as const

// One pixel across the target covers ten of the value, from 0 at its left.
const VALUE_PER_PX = 10

/** A target the hook zooms and pans, whose value at a point is ten per pixel across. */
const ZoomPanTarget = (gestures: Pick<ZoomPanGestures, 'onZoom' | 'onPan'>) => {
  const targetRef = useRef<HTMLDivElement>(null)
  useZoomPanGestures(targetRef, {
    getValueAt: (clientX) => clientX * VALUE_PER_PX,
    valuePerPx: VALUE_PER_PX,
    ...gestures,
  })
  return <div ref={targetRef} data-testid={T_IDS.TARGET} />
}

/** Renders the target with `gestures`' handlers, returning it. */
const renderTarget = (gestures: Pick<ZoomPanGestures, 'onZoom' | 'onPan'>) => {
  render(<ZoomPanTarget {...gestures} />)
  return screen.getByTestId(T_IDS.TARGET)
}

/** Turns the wheel over `target` at `clientX`, with any other `init`, returning whether the page would scroll. */
const turnWheel = (
  target: Element,
  clientX: number,
  deltaY: number,
  init?: WheelEventInit
) => {
  const event = createEvent.wheel(target, { deltaY })
  // The test DOM's WheelEvent drops a clientX, deltaX, or ctrlKey passed in,
  // which a browser's keeps.
  for (const [key, value] of Object.entries({ clientX, ...init })) {
    Object.defineProperty(event, key, { value })
  }
  return fireEvent(target, event)
}

/** Drags a `pointerType` pointer across `target` from `fromX` to `toX`. */
const drag = (
  target: Element,
  pointerType: string,
  fromX: number,
  toX: number
) => {
  const init = { pointerId: 1, pointerType, buttons: 1, isPrimary: true }
  fireEvent.pointerDown(target, { ...init, clientX: fromX })
  fireEvent.pointerMove(target, { ...init, clientX: toX })
  fireEvent.pointerUp(target, { ...init, clientX: toX, buttons: 0 })
}

describe('useZoomPanGestures', () => {
  it('zooms around the value under the wheel, in place of scrolling the page', () => {
    const onZoom = vi.fn()
    const target = renderTarget({ onZoom })

    const scrolled = turnWheel(target, 15, -100)
    expect(scrolled).toBe(false)
    // At 15px across, so the value there.
    expect(onZoom).toHaveBeenCalledWith(150, expect.any(Number))
    turnWheel(target, 15, 100)
    const [[, upFactor], [, downFactor]] = onZoom.mock.calls
    // Turned up, it narrows the span; turned down, it widens it again.
    expect(upFactor).toBeLessThan(1)
    expect(downFactor).toBeCloseTo(1 / upFactor)
  })

  it('leaves the wheel to scroll the page without an `onZoom`', () => {
    const onPan = vi.fn()
    const target = renderTarget({ onPan })

    expect(turnWheel(target, 15, -100)).toBe(true)
    expect(turnWheel(target, 15, 0, { deltaX: 40 })).toBe(true)
    expect(onPan).not.toHaveBeenCalled()
  })

  it('pans for a sideways scroll, by its distance in the value, rather than zooming', () => {
    const onZoom = vi.fn()
    const onPan = vi.fn()
    const target = renderTarget({ onZoom, onPan })

    turnWheel(target, 15, 0, { deltaX: 40 })
    expect(onZoom).not.toHaveBeenCalled()
    expect(onPan).toHaveBeenCalledWith(40 * VALUE_PER_PX)
  })

  it("zooms for a trackpad's pinch, around the point under it, rather than as a wheel's turn", () => {
    const onZoom = vi.fn()
    const target = renderTarget({ onZoom })

    // A trackpad pinch reaches the page as a wheel with ctrl held: two
    // steps apart, since the first only sets where the pinch starts.
    for (const deltaY of [-10, -10]) {
      turnWheel(target, 15, deltaY, { ctrlKey: true })
    }
    // A plain wheel turned at the same point, for the zoom it would take.
    turnWheel(target, 15, -100)
    const [pinchCall, wheelCall] = onZoom.mock.calls
    expect(onZoom).toHaveBeenCalledTimes(2)
    // Spreading, so zooming in, by its own scale rather than a wheel's.
    expect(pinchCall[1]).toBeLessThan(1)
    expect(pinchCall[1]).not.toBe(wheelCall[1])
    expect(pinchCall[0]).toBe(wheelCall[0])
  })

  it("pans for a mouse's drag, the other way to it, and leaves a finger's alone", () => {
    const onPan = vi.fn()
    const target = renderTarget({ onZoom: vi.fn(), onPan })

    drag(target, 'touch', 30, 10)
    expect(onPan).not.toHaveBeenCalled()
    // Dragged left, the span moves right, toward later values.
    drag(target, 'mouse', 30, 10)
    expect(onPan).toHaveBeenCalledWith(20 * VALUE_PER_PX)
  })
})
