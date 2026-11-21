/**
 * @fileoverview Hook that keeps focus inside a container whose contents swap
 * out from under it, rather than letting it fall to `<body>` when the element
 * holding it unmounts.
 */

import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Hands focus to `targetRef` when the focused element inside the container
 * unmounts.
 *
 * Spread `containerProps` onto the container and attach `targetRef` to
 * whichever element should receive focus once that happens. Focus the user
 * moved anywhere else, `<body>` included, is left alone. `containerProps`
 * carries the container's `ref`, so a `ref` set beside it replaces it and
 * stops the handoff for anything a child unmounts on its own.
 *
 * @example
 * ```tsx
 * // Deleting a row moves focus to the add field rather than dropping it.
 * const { containerProps, targetRef } = useFocusHandoff<
 *   HTMLUListElement,
 *   HTMLInputElement
 * >()
 *
 * return (
 *   <>
 *     <ul {...containerProps}>
 *       {todos.map((todo) => (
 *         <li key={todo.id}>
 *           <button type="button" onClick={() => remove(todo.id)}>
 *             Delete
 *           </button>
 *         </li>
 *       ))}
 *     </ul>
 *     <input ref={targetRef} />
 *   </>
 * )
 * ```
 */
export const useFocusHandoff = <
  Container extends HTMLElement = HTMLElement,
  Target extends HTMLElement = HTMLElement,
>() => {
  const targetRef = useRef<Target>(null)
  // The element inside the container that has focus, until focus leaves for
  // somewhere else. Unmounting it moves focus to no target, which is how it
  // can still be held here once it's gone.
  const focusedRef = useRef<Element | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  const handOffIfGone = useCallback(() => {
    const focused = focusedRef.current
    if (!focused || focused.isConnected) return
    // Dropped whether or not it's handed off: focus already elsewhere when
    // the element went means it's no longer ours to hand off later.
    focusedRef.current = null
    const isFocusLost =
      !document.activeElement || document.activeElement === document.body
    if (isFocusLost) targetRef.current?.focus()
  }, [])

  // Every commit of this component, so a swap it renders hands off within that
  // commit rather than a microtask later, and so a focused element portaled out
  // of the container, which the observer below can't see, is still caught.
  useLayoutEffect(handOffIfGone)

  // Watches the container too, for an element a child unmounts without this
  // component re-rendering.
  const containerRef = useCallback(
    (container: Container | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      if (!container) return
      const observer = new MutationObserver(handOffIfGone)
      observer.observe(container, { childList: true, subtree: true })
      observerRef.current = observer
    },
    [handOffIfGone]
  )

  return {
    containerProps: {
      ref: containerRef,
      onFocus: (event: React.FocusEvent<Container>) => {
        focusedRef.current = event.target
      },
      onBlur: (event: React.FocusEvent<Container>) => {
        const { relatedTarget, currentTarget, target } = event
        if (relatedTarget) {
          if (!currentTarget.contains(relatedTarget)) focusedRef.current = null
          return
        }
        // Focus left for nowhere while the element is still mounted: the user
        // sent it there. The blur a browser fires while React removes the
        // element never gets here, since React drops events mid-commit.
        if (target.isConnected) focusedRef.current = null
      },
    },
    targetRef,
  }
}
