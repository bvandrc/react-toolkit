/**
 * @fileoverview Active state for something hover or focus can also activate,
 * where a tap, click, or activation of its trigger toggles it.
 */

import { useCallback, useMemo, useRef } from 'react'

import { useStateRef } from './useStateRef'
import {
  clickOnActivationKey,
  isPrimaryPress,
  isTextEntry,
  nativeActivationKeys,
} from './utils'

/** A kind of pointer a press can come from, as a pointer event's `pointerType` names it. */
export type PressPointerType = 'mouse' | 'pen' | 'touch'

export type UsePressToggleOptions = {
  /**
   * The only kinds of pointer whose press toggles it, for a trigger inside a
   * link or control that should still act on everything else.
   *
   * A press it toggles on has its click cancelled, so what's around the
   * trigger doesn't act on it too. Any other press, a key, or a screen
   * reader's activation is left alone, as if the trigger had no handlers.
   * Defaults to every activation toggling, with nothing cancelled.
   */
  pointerTypes?: readonly PressPointerType[]
}

/**
 * Active state and trigger handlers, so activating the trigger toggles it.
 *
 * - A tap, click, Enter or Space, or a screen reader's activation all toggle,
 *   unless `pointerTypes` narrows that to presses from those pointers.
 * - One that hover or focus made active stays active on the first activation,
 *   since a mouse hovers before it clicks and a keyboard focuses before Enter;
 *   the next one turns it off.
 * - A trigger that isn't a native button gets Enter and Space too.
 *
 * Spread `triggerProps` on the trigger, and route every other change through
 * `setIsActive`. Both keep their identity across renders.
 */
export const usePressToggle = ({
  pointerTypes,
}: UsePressToggleOptions = {}) => {
  const [isActive, setIsActiveState, isActiveRef] = useStateRef(false)
  // Read by the handlers, so they keep their identity while it changes.
  const pointerTypesRef = useRef(pointerTypes)
  pointerTypesRef.current = pointerTypes
  /**
   * Whether an activation made it active.
   *
   * Only that kind is one the next activation toggles off again.
   */
  const activatedByPressRef = useRef(false)
  /**
   * Whether a press had made it active as of pointerdown, before anything that
   * turns it off on a press has run; null when no press is waiting for its
   * click.
   */
  const pressActiveBeforeClickRef = useRef<boolean | null>(null)

  const setIsActive = useCallback((next: boolean) => {
    if (!next) activatedByPressRef.current = false
    setIsActiveState(next)
  }, [])

  const triggerProps = useMemo(() => {
    const isActivatedByPress = () =>
      isActiveRef.current && activatedByPressRef.current
    const toggle = (wasActivatedByPress: boolean) => {
      if (!wasActivatedByPress) activatedByPressRef.current = true
      setIsActive(!wasActivatedByPress)
    }
    const forgetPress = () => {
      pressActiveBeforeClickRef.current = null
    }

    return {
      onPointerDown: (event: React.PointerEvent<Element>) => {
        // Only the main button's press ends in a click.
        if (!isPrimaryPress(event)) return
        const allowed = pointerTypesRef.current
        // A press from a kind of pointer not allowed leaves its click alone.
        pressActiveBeforeClickRef.current =
          !allowed || allowed.some((type) => type === event.pointerType)
            ? isActivatedByPress()
            : null
      },
      // A press the browser takes over for a scroll won't end in a click. Not
      // pointerleave: a finger lifting fires it before its click.
      onPointerCancel: forgetPress,
      onClick: (event: React.MouseEvent<Element>) => {
        // A keyboard's or screen reader's click has a `detail` of 0 and no
        // pointerdown before it, so it reads the state as it is now.
        const pressActive = pressActiveBeforeClickRef.current
        forgetPress()
        if (pointerTypesRef.current) {
          // Only an allowed pointer's press is this hook's; any other click
          // goes on to whatever the trigger sits in.
          if (event.detail === 0 || pressActive === null) return
          // Stops a link or control around the trigger acting on it too.
          event.preventDefault()
          toggle(pressActive)
          return
        }
        toggle(
          event.detail > 0 && pressActive !== null
            ? pressActive
            : isActivatedByPress()
        )
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        // A key pressed on something inside the trigger, one the trigger
        // clicks on or types with by itself, or one it handled already, is its
        // own; anything else gets the click a button would, which `onClick`
        // toggles on.
        if (
          // Keys don't toggle one narrowed to pointers.
          pointerTypesRef.current ||
          // Held down, the key repeats; a button clicks once.
          event.repeat ||
          event.target !== event.currentTarget ||
          event.defaultPrevented ||
          isTextEntry(event.currentTarget) ||
          nativeActivationKeys(event.currentTarget).includes(event.key)
        )
          return
        clickOnActivationKey(event)
      },
    }
  }, [setIsActive])

  return useMemo(
    () => ({ isActive, setIsActive, triggerProps }),
    [isActive, setIsActive, triggerProps]
  )
}
