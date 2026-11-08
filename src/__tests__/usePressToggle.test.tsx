import {
  createEvent,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'

import {
  type PressPointerType,
  type UsePressToggleOptions,
  usePressToggle,
} from '../usePressToggle'

const TEXT = {
  TRIGGER: 'Trigger',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  HOVER_ON: 'Hover on',
  HOVER_OFF: 'Hover off',
} as const

describe('usePressToggle', () => {
  type TriggerProps = ReturnType<typeof usePressToggle>['triggerProps']

  /** Each kind of trigger a case renders, carrying the handlers. */
  const TRIGGERS = {
    button: (props: TriggerProps) => (
      <button type="button" {...props}>
        {TEXT.TRIGGER}
      </button>
    ),
    span: (props: TriggerProps) => (
      // biome-ignore lint/a11y/noNoninteractiveTabindex: stands in for a span trigger, as DisabledWithTooltip uses
      <span tabIndex={0} {...props}>
        {TEXT.TRIGGER}
      </span>
    ),
    spanAroundButton: (props: TriggerProps) => (
      <span {...props}>
        <button type="button">{TEXT.TRIGGER}</button>
      </span>
    ),
    textInput: (props: TriggerProps) => (
      <input aria-label={TEXT.TRIGGER} {...props} />
    ),
  } satisfies Record<string, (props: TriggerProps) => React.ReactNode>

  /**
   * Renders a trigger carrying the handlers beside its active state, with
   * buttons that turn it on and off the way hover or focus would.
   */
  const renderToggle = ({
    trigger = 'button',
    options,
  }: {
    trigger?: keyof typeof TRIGGERS
    options?: UsePressToggleOptions
  } = {}) => {
    const Toggle = () => {
      const { isActive, setIsActive, triggerProps } = usePressToggle(options)
      return (
        <>
          {TRIGGERS[trigger](triggerProps)}
          <button type="button" onClick={() => setIsActive(true)}>
            {TEXT.HOVER_ON}
          </button>
          <button type="button" onClick={() => setIsActive(false)}>
            {TEXT.HOVER_OFF}
          </button>
          <p>{isActive ? TEXT.ACTIVE : TEXT.INACTIVE}</p>
        </>
      )
    }
    render(<Toggle />)
    return {
      trigger:
        screen.queryByLabelText(TEXT.TRIGGER) ?? screen.getByText(TEXT.TRIGGER),
      setActivePassively: (next: boolean) =>
        fireEvent.click(
          screen.getByText(next ? TEXT.HOVER_ON : TEXT.HOVER_OFF)
        ),
    }
  }

  /** Presses and clicks `trigger` the way a mouse or finger does. */
  const pressTrigger = (trigger: Element) => {
    fireEvent.pointerDown(trigger)
    fireEvent.click(trigger, { detail: 1 })
  }

  const getState = () =>
    screen.getByText(new RegExp(`^(${TEXT.ACTIVE}|${TEXT.INACTIVE})$`))
      .textContent

  it('toggles on each tap or click', () => {
    const { trigger } = renderToggle()

    for (const expected of [TEXT.ACTIVE, TEXT.INACTIVE, TEXT.ACTIVE]) {
      pressTrigger(trigger)
      expect(getState(), `after a press, expected ${expected}`).toBe(expected)
    }
  })

  it('keeps active what something else activated, then turns off on the next click', () => {
    // Someone hovering a help icon and then clicking it means to read it.
    const { trigger, setActivePassively } = renderToggle()
    setActivePassively(true)

    pressTrigger(trigger)
    expect(getState()).toBe(TEXT.ACTIVE)

    pressTrigger(trigger)
    expect(getState()).toBe(TEXT.INACTIVE)
  })

  it('forgets a press-activation once something else turns it off', () => {
    // Pointer leaving turns it off; hovering back and clicking should keep it.
    const { trigger, setActivePassively } = renderToggle()
    pressTrigger(trigger)
    setActivePassively(false)
    setActivePassively(true)

    pressTrigger(trigger)

    expect(getState()).toBe(TEXT.ACTIVE)
  })

  it('toggles on a click with no pointer, as a keyboard or screen reader sends', () => {
    // Focus activated it first, so the first activation keeps it and the next
    // turns it off -- the same rule a pointer gets.
    const { trigger, setActivePassively } = renderToggle()
    setActivePassively(true)

    for (const expected of [TEXT.ACTIVE, TEXT.INACTIVE, TEXT.ACTIVE]) {
      fireEvent.click(trigger, { detail: 0 })
      expect(getState(), `after an activation, expected ${expected}`).toBe(
        expected
      )
    }
  })

  it('reads a keyboard click from the state as it is, not a press left waiting', () => {
    // A press on the active trigger dragged off without a click, which pointer
    // leaving then turns off, then Enter.
    const { trigger, setActivePassively } = renderToggle()
    pressTrigger(trigger)
    fireEvent.pointerDown(trigger)
    setActivePassively(false)

    fireEvent.click(trigger, { detail: 0 })

    expect(getState()).toBe(TEXT.ACTIVE)
  })

  it('ignores a press the browser cancelled when the next click comes', () => {
    // A press on the active trigger taken over by a scroll, then a click with
    // no pointerdown of its own.
    const { trigger } = renderToggle()
    pressTrigger(trigger)
    fireEvent.pointerDown(trigger)
    fireEvent.pointerCancel(trigger)
    fireEvent.click(screen.getByText(TEXT.HOVER_OFF))
    fireEvent.click(screen.getByText(TEXT.HOVER_ON))

    fireEvent.click(trigger, { detail: 1 })

    expect(getState()).toBe(TEXT.ACTIVE)
  })

  it('toggles a trigger that is not a button on Enter and Space', () => {
    const { trigger } = renderToggle({ trigger: 'span' })

    for (const [key, expected] of [
      ['Enter', TEXT.ACTIVE],
      [' ', TEXT.INACTIVE],
    ] as const) {
      fireEvent.keyDown(trigger, { key })
      expect(getState(), `after ${key}, expected ${expected}`).toBe(expected)
    }
  })

  it('leaves a button to its own Enter and Space', () => {
    // A native button clicks on those keys itself; toggling here too would
    // undo it.
    const { trigger } = renderToggle()

    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(getState()).toBe(TEXT.INACTIVE)
  })

  it('leaves Enter and Space to a trigger that handled them already', () => {
    // One that clicks itself on those keys, say; toggling here too would undo
    // its own toggle.
    const { trigger } = renderToggle({ trigger: 'span' })
    const HANDLED_ENTER = createEvent.keyDown(trigger, { key: 'Enter' })
    HANDLED_ENTER.preventDefault()

    fireEvent(trigger, HANDLED_ENTER)

    expect(getState()).toBe(TEXT.INACTIVE)
  })

  it('leaves Enter and Space to a control inside the trigger', () => {
    // The browser clicks that control itself, and the click reaches the
    // trigger's own handler; clicking the trigger too would undo it.
    renderToggle({ trigger: 'spanAroundButton' })

    fireEvent.keyDown(screen.getByRole('button', { name: TEXT.TRIGGER }), {
      key: 'Enter',
    })

    expect(getState()).toBe(TEXT.INACTIVE)
  })

  it('leaves Enter and Space to a text field as the trigger', () => {
    // Space types a space there, and Enter submits its form.
    const { trigger } = renderToggle({ trigger: 'textInput' })

    for (const key of ['Enter', ' ']) {
      expect(fireEvent.keyDown(trigger, { key }), `${key} not cancelled`).toBe(
        true
      )
      expect(getState(), `${key} toggles nothing`).toBe(TEXT.INACTIVE)
    }
  })

  it('toggles once for a held key, not on each repeat', () => {
    // A button clicks once however long the key is held.
    const { trigger } = renderToggle({ trigger: 'span' })

    fireEvent.keyDown(trigger, { key: ' ' })
    for (let i = 0; i < 3; i++)
      fireEvent.keyDown(trigger, { key: ' ', repeat: true })

    expect(getState()).toBe(TEXT.ACTIVE)
  })

  it('keeps setIsActive and triggerProps across renders', () => {
    // A consumer may list them as effect or callback dependencies.
    const { result, rerender } = renderHook(() => usePressToggle())
    const { setIsActive, triggerProps } = result.current

    rerender()

    expect(result.current.setIsActive).toBe(setIsActive)
    expect(result.current.triggerProps).toBe(triggerProps)
  })

  describe('with pointerTypes', () => {
    const OPTIONS = { pointerTypes: ['touch'] } satisfies UsePressToggleOptions

    /** Presses and clicks `trigger` with a `pointerType` pointer, returning whether its click went on to what's around it. */
    const pressTriggerWith = (
      trigger: Element,
      pointerType: PressPointerType
    ) => {
      fireEvent.pointerDown(trigger, {
        pointerType,
        isPrimary: true,
        button: 0,
      })
      return fireEvent.click(trigger, { detail: 1 })
    }

    it("toggles on an allowed pointer's press, cancelling its click", () => {
      // So a link the trigger sits in isn't followed too.
      const { trigger } = renderToggle({ options: OPTIONS })

      for (const expected of [TEXT.ACTIVE, TEXT.INACTIVE]) {
        expect(pressTriggerWith(trigger, 'touch'), 'click went on').toBe(false)
        expect(getState(), `after a tap, expected ${expected}`).toBe(expected)
      }
    })

    it("leaves another pointer's press to what the trigger sits in", () => {
      const { trigger } = renderToggle({ options: OPTIONS })

      expect(pressTriggerWith(trigger, 'mouse'), 'click went on').toBe(true)
      expect(getState()).toBe(TEXT.INACTIVE)
    })

    it("leaves a keyboard's or screen reader's activation to what the trigger sits in", () => {
      const { trigger } = renderToggle({ trigger: 'span', options: OPTIONS })

      expect(fireEvent.click(trigger, { detail: 0 }), 'click went on').toBe(
        true
      )
      expect(
        fireEvent.keyDown(trigger, { key: 'Enter' }),
        'Enter went on'
      ).toBe(true)
      expect(getState()).toBe(TEXT.INACTIVE)
    })

    it('turns off on a tap what a tap turned on, though something else turns it off at pointerdown', () => {
      // As a tooltip closes itself on any pointerdown, before the click.
      const { trigger, setActivePassively } = renderToggle({ options: OPTIONS })
      pressTriggerWith(trigger, 'touch')

      fireEvent.pointerDown(trigger, {
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
      })
      setActivePassively(false)
      fireEvent.click(trigger, { detail: 1 })

      expect(getState()).toBe(TEXT.INACTIVE)
    })

    it('keeps triggerProps across renders given a new array each time', () => {
      const { result, rerender } = renderHook(() =>
        usePressToggle({ pointerTypes: ['touch'] })
      )
      const { triggerProps } = result.current

      rerender()

      expect(result.current.triggerProps).toBe(triggerProps)
    })
  })
})
