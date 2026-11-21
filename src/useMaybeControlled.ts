/**
 * @fileoverview A value that works controlled or uncontrolled.
 */

import { useState } from 'react'

/**
 * Pass `controlledValue`/`onControlledChange` together to own the value from
 * outside, or leave both `undefined` to let this hook manage it internally,
 * starting from `defaultValue`.
 *
 * @example
 * ```tsx
 * const Disclosure = ({
 *   open: openProp,
 *   onOpenChange,
 *   children,
 * }: {
 *   open?: boolean
 *   onOpenChange?: (open: boolean) => void
 *   children: React.ReactNode
 * }) => {
 *   const [open, setOpen] = useMaybeControlled(openProp, onOpenChange, false)
 *   return (
 *     <>
 *       <button type="button" onClick={() => setOpen(!open)}>
 *         Details
 *       </button>
 *       {open && children}
 *     </>
 *   )
 * }
 * ```
 */
export const useMaybeControlled = <T>(
  controlledValue: T | undefined,
  onControlledChange: ((value: T) => void) | undefined,
  defaultValue: T
): [T, (value: T) => void] => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const value = controlledValue ?? uncontrolledValue
  const onChange = onControlledChange ?? setUncontrolledValue
  return [value, onChange]
}
