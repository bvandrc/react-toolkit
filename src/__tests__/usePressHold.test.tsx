import { act, fireEvent, render, screen } from '@testing-library/react'
import { objectEntries } from 'ts-extras'

import { usePressHold } from '../usePressHold'

/** Long enough that any press still down has become a hold. */
const PAST_THE_HOLD_MS = 1000
/** Short of it, so a press this old is still building. */
const MID_PRESS_MS = PAST_THE_HOLD_MS - 600

type ClientPoint = { clientX: number; clientY: number }

/** Where every press in these cases starts. */
const ORIGIN = { clientX: 50, clientY: 100 } as const satisfies ClientPoint

/** The press dragged up the element, as a scroll does. */
const SCROLLED = {
  ...ORIGIN,
  clientY: ORIGIN.clientY + 40,
} as const satisfies ClientPoint
/** The press dragged across it, as a swipe does. */
const SWIPED = {
  ...ORIGIN,
  clientX: ORIGIN.clientX + 40,
} as const satisfies ClientPoint
/**
 * The press dragged diagonally, within the default threshold on either axis
 * but past it as a distance (9, 9 is 12.7 away).
 */
const DRAGGED_DIAGONALLY = {
  clientX: ORIGIN.clientX + 9,
  clientY: ORIGIN.clientY + 9,
} as const satisfies ClientPoint

/** Movement the default threshold tolerates, as a finger never rests still. */
const WITHIN_THRESHOLD_PX = 8

describe('usePressHold', () => {
  const onHold = vi.fn()

  /** Renders the harness and returns the element the gesture is held on. */
  const renderPressHold = (
    options: Partial<Parameters<typeof usePressHold>[0]> = {}
  ) => {
    /**
     * The gesture on an element that holds a button of its own, as `TaskCard` does.
     *
     * `data-holding` is how a case reads `isHolding`, since that is all the card
     * itself does with it -- style off it.
     */
    const PressHoldHarness = (opts: Parameters<typeof usePressHold>[0]) => {
      const { isHolding, handlers } = usePressHold(opts)

      return (
        <div data-holding={isHolding} {...handlers}>
          <button type="button">
            {/* What a press actually lands on inside a button. */}
            <span>nested</span>
          </button>
        </div>
      )
    }

    const { container, unmount } = render(
      <PressHoldHarness onHold={onHold} {...options} />
    )
    const target = container.firstElementChild as HTMLElement

    const isHolding = () => target.dataset.holding === 'true'

    return {
      unmount,
      target,
      isHolding,
    }
  }

  const touchAt = (point: ClientPoint) => ({ touches: [point] })

  /** Lets time pass, with whatever a fired timer rendered flushed. */
  const advanceBy = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('fires once a press has been held for the duration', () => {
    const { target, isHolding } = renderPressHold()

    fireEvent.mouseDown(target, ORIGIN)
    expect(isHolding()).toBe(true)
    expect(onHold, 'nothing fires on the press alone').not.toHaveBeenCalled()

    advanceBy(PAST_THE_HOLD_MS)

    expect(onHold).toHaveBeenCalledOnce()
    // The gesture is spent, so the held styling comes off rather than staying under whatever the hold opened.
    expect(isHolding()).toBe(false)
  })

  it('holds a touch that stays put, wandering within the threshold', () => {
    const { target, isHolding } = renderPressHold()

    fireEvent.touchStart(target, touchAt(ORIGIN))
    fireEvent.touchMove(
      target,
      touchAt({ ...ORIGIN, clientY: ORIGIN.clientY + WITHIN_THRESHOLD_PX })
    )
    expect(isHolding()).toBe(true)

    advanceBy(PAST_THE_HOLD_MS)

    expect(onHold).toHaveBeenCalledOnce()
    // The gesture is spent, so the held styling comes off rather than staying under whatever the hold opened.
    expect(isHolding()).toBe(false)
  })

  it('cancels a press that moves in any direction past the threshold', () => {
    for (const [direction, pointPastThreshold] of objectEntries({
      scroll: SCROLLED,
      swipe: SWIPED,
    })) {
      const { target, isHolding } = renderPressHold()

      fireEvent.touchStart(target, touchAt(ORIGIN))
      expect(isHolding()).toBe(true)
      fireEvent.touchMove(target, touchAt(pointPastThreshold))
      expect(isHolding()).toBe(false)

      advanceBy(PAST_THE_HOLD_MS)

      expect(isHolding()).toBe(false)
      expect(onHold, direction).not.toHaveBeenCalled()
    }
  })

  it('holds through movement along an axis it was given no threshold for', () => {
    for (const [bounded, { moveThreshold, ...moves }] of objectEntries({
      // A vertically scrolling list, which is what `TaskCard` sits in: a swipe
      // across a card is still a press on that card.
      y: { moveThreshold: { y: 10 }, holds: SWIPED, cancels: SCROLLED },
      x: { moveThreshold: { x: 10 }, holds: SCROLLED, cancels: SWIPED },
    } as const)) {
      for (const [outcome, point] of objectEntries(moves)) {
        // A spy per press, since `clearMocks` only reaches between cases.
        const pressOnHold = vi.fn()
        const { target, isHolding } = renderPressHold({
          moveThreshold,
          onHold: pressOnHold,
        })

        const shouldHold = outcome === 'holds'

        fireEvent.touchStart(target, touchAt(ORIGIN))
        fireEvent.touchMove(target, touchAt(point))
        expect(isHolding()).toBe(shouldHold)

        advanceBy(PAST_THE_HOLD_MS)

        expect(
          pressOnHold,
          `only ${bounded} bounded, movement that ${outcome}`
        ).toHaveBeenCalledTimes(shouldHold ? 1 : 0)
        expect(isHolding()).toBe(false)
      }
    }
  })

  it('refuses a threshold that bounds neither axis', () => {
    // @ts-expect-error -- `{}` would be a threshold nothing can ever spend,
    // which is what leaving `moveThreshold` off already means.
    renderPressHold({ moveThreshold: {} })
  })

  it('reads one threshold as a distance, and a pair as a box', () => {
    for (const [form, moveThreshold] of objectEntries({
      // 9 on each axis is 12.7 from the origin, so the distance is spent while
      // neither axis is.
      distance: 10,
      box: { x: 10, y: 10 },
    } as const)) {
      const formOnHold = vi.fn()
      const { target, isHolding } = renderPressHold({
        moveThreshold,
        onHold: formOnHold,
      })
      const shouldHold = form === 'box'

      fireEvent.touchStart(target, touchAt(ORIGIN))
      fireEvent.touchMove(target, touchAt(DRAGGED_DIAGONALLY))
      expect(isHolding()).toBe(Boolean(shouldHold))

      advanceBy(PAST_THE_HOLD_MS)

      expect(formOnHold, form).toHaveBeenCalledTimes(shouldHold ? 1 : 0)
      expect(isHolding()).toBe(false)
    }
  })

  it('cancels a press the pointer ends before the duration is up', () => {
    for (const [ending, endPress] of objectEntries({
      mouseUp: (target: HTMLElement) => fireEvent.mouseUp(target, ORIGIN),
      // The pointer dragged off the element mid-press.
      mouseLeave: (target: HTMLElement) => fireEvent.mouseLeave(target, ORIGIN),
      // A `touchend` carries no points, being the finger that just lifted.
      touchEnd: (target: HTMLElement) => fireEvent.touchEnd(target),
      // The OS took the touch over -- an incoming call, or a back-swipe.
      touchCancel: (target: HTMLElement) => fireEvent.touchCancel(target),
    } as const)) {
      const { target, isHolding } = renderPressHold()

      fireEvent.mouseDown(target, ORIGIN)
      advanceBy(MID_PRESS_MS)
      endPress(target)

      expect(isHolding(), ending).toBe(false)

      advanceBy(PAST_THE_HOLD_MS)

      expect(isHolding()).toBe(false)
      expect(onHold, ending).not.toHaveBeenCalled()
    }
  })

  it('reads a move with nothing down as nothing, once the press is over', () => {
    const { target, isHolding } = renderPressHold()

    fireEvent.mouseDown(target, ORIGIN)
    fireEvent.mouseUp(target, ORIGIN)
    // A pointer crossing the element with no button down, which is every mouse
    // that passes over a card.
    fireEvent.mouseMove(target, SWIPED)

    expect(isHolding()).toBe(false)
    expect(onHold).not.toHaveBeenCalled()
  })

  it('ignores a press that landed on a control of its own', () => {
    const { isHolding } = renderPressHold({ ignoreSelector: 'button' })

    fireEvent.mouseDown(screen.getByText('nested'), ORIGIN)

    expect(isHolding(), 'the element never looks held').toBe(false)

    advanceBy(PAST_THE_HOLD_MS)

    expect(isHolding()).toBe(false)
    expect(onHold).not.toHaveBeenCalled()
  })

  it('does not fire for a press the unmount interrupted', () => {
    const { target, unmount } = renderPressHold()

    fireEvent.mouseDown(target, ORIGIN)
    unmount()
    advanceBy(PAST_THE_HOLD_MS)

    expect(
      onHold,
      'a pending hold would open a dialog for a card that is gone'
    ).not.toHaveBeenCalled()
  })
})
