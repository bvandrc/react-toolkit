/**
 * @fileoverview Active state for something hover or focus can also activate,
 * where a tap, click, or activation of its trigger toggles it.
 */

import { useCallback, useMemo, useRef } from 'react'
import { useIsomorphicLayoutEffect } from 'usehooks-ts'

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
   * Any other press, a key, or a screen reader's activation is left alone, as
   * if the trigger had no handlers. Defaults to every activation toggling.
   */
  pointerTypes?: readonly PressPointerType[]
  /**
   * Whether a click it toggles on is cancelled, so a link or control around
   * the trigger doesn't act on it too.
   *
   * Defaults to true with `pointerTypes`, and false without.
   */
  cancelClick?: boolean
}

/**
 * Active state and trigger handlers, so activating the trigger toggles it.
 *
 * - A tap, click, Enter or Space, or a screen reader's activation all toggle,
 *   unless `pointerTypes` narrows that to presses from those pointers.
 * - One that hover or focus made active stays active on the first activation,
 *   since a mouse hovers before it clicks and a keyboard focuses before Enter;
 *   the next one turns it off. A finger can't have hovered first, so a tap
 *   turns off whatever is active.
 * - A trigger that isn't a native button gets Enter and Space too, unless
 *   `pointerTypes` is set.
 *
 * Spread `triggerProps` on the trigger, and route every other change through
 * `setIsActive`. Both keep their identity across renders.
 */
export const usePressToggle = ({
  pointerTypes,
  cancelClick = pointerTypes !== undefined,
}: UsePressToggleOptions = {}) => {
  const [isActive, setIsActiveState, isActiveRef] = useStateRef(false)
  // Read by the handlers, so they keep their identity while the options
  // change. Set once committed, so a render React throws away never reaches
  // them.
  const optionsRef = useRef({ pointerTypes, cancelClick })
  useIsomorphicLayoutEffect(() => {
    optionsRef.current = { pointerTypes, cancelClick }
  })
  /**
   * Whether an activation made it active.
   *
   * Only that kind is one the next activation toggles off again.
   */
  const activatedByPressRef = useRef(false)
  /**
   * Whether a press had made it active as of pointerdown, before anything that
   * turns it off on a press has run; null when no press is waiting for its
   * click, or the one waiting is from a pointer `pointerTypes` leaves out.
   */
  const pressActiveBeforeClickRef = useRef<boolean | null>(null)

  const setIsActive = useCallback((next: boolean) => {
    if (!next) activatedByPressRef.current = false
    setIsActiveState(next)
  }, [])

  const triggerProps = useMemo(() => {
    const isActivatedByPress = () =>
      isActiveRef.current && activatedByPressRef.current
    const toggle = (wasActive: boolean) => {
      if (!wasActive) activatedByPressRef.current = true
      setIsActive(!wasActive)
    }
    const forgetPress = () => {
      pressActiveBeforeClickRef.current = null
    }
    /**
     * Whether a press from `pointerType` finds it active, by that pointer's
     * rule, or null for one `pointerTypes` leaves out.
     */
    const readPress = (pointerType: string | undefined) => {
      const allowed = optionsRef.current.pointerTypes
      if (allowed && !allowed.some((type) => type === pointerType)) return null
      // A finger can't hover, so nothing it didn't do itself kept it active.
      return pointerType === 'touch'
        ? isActiveRef.current
        : isActivatedByPress()
    }

    /**
     * Whether a click finds it active, by the rule for what sent it, given
     * what its press read at pointerdown, or null for one it leaves alone.
     */
    const readClick = (
      event: React.MouseEvent<Element>,
      pressActive: boolean | null
    ) => {
      // A keyboard's or screen reader's click has a `detail` of 0 and no
      // pointerdown before it, so it reads the state as it is now, unless only
      // pointers toggle it.
      if (event.detail === 0) {
        return optionsRef.current.pointerTypes ? null : isActivatedByPress()
      }
      // With no pointerdown before it, the click's own pointerType says what
      // pressed: a click is a PointerEvent in browsers that have them, and a
      // plain MouseEvent, with none, elsewhere.
      return (
        pressActive ??
        readPress((event.nativeEvent as Partial<PointerEvent>).pointerType)
      )
    }

    return {
      onPointerDown: (event: React.PointerEvent<Element>) => {
        // Only the main button's press ends in a click.
        if (isPrimaryPress(event))
          pressActiveBeforeClickRef.current = readPress(event.pointerType)
      },
      // A press the browser takes over for a scroll won't end in a click. Not
      // pointerleave: a finger lifting fires it before its click.
      onPointerCancel: forgetPress,
      onClick: (event: React.MouseEvent<Element>) => {
        const pressActive = pressActiveBeforeClickRef.current
        forgetPress()
        const wasActive = readClick(event, pressActive)
        // Left to whatever the trigger sits in.
        if (wasActive === null) return
        if (optionsRef.current.cancelClick) event.preventDefault()
        toggle(wasActive)
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        // A key pressed on something inside the trigger, one the trigger
        // clicks on or types with by itself, or one it handled already, is its
        // own; anything else gets the click a button would, which `onClick`
        // toggles on.
        if (
          // Keys don't toggle one narrowed to pointers.
          optionsRef.current.pointerTypes ||
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
