/**
 * @fileoverview Hooks that make a tree of rows one tab stop, moved through
 * with the arrow keys the way the WAI-ARIA tree view pattern describes.
 */

import { useCallback, useState, useSyncExternalStore } from 'react'
import { useIsomorphicLayoutEffect } from 'usehooks-ts'

import { useLatestRef } from './useLatestRef'
import { isTextEntry } from './utils/input'

/** One row the tree is showing, in the order it's shown. */
export interface TreeNavigationItem<Id> {
  id: Id
  /** The row this one is nested under, or nothing for a top-level row. */
  parentId?: Id | null
  /**
   * Whether the row's children are shown. Leave it out for a row with no
   * children, which → and ← then don't expand or collapse.
   */
  isExpanded?: boolean
}

export interface UseTreeNavigationOptions<Id> {
  /**
   * Every row the tree shows, top to bottom, and only those: a collapsed row's
   * children are left out, as is a row on its way out in an exit animation.
   * Each new array re-checks every row, so memoize it for a large tree.
   */
  items: readonly TreeNavigationItem<Id>[]
  /** → or ← asked to expand or collapse a row. */
  onExpandedChange: (id: Id, isExpanded: boolean) => void
  /**
   * What takes focus when the focused row goes and there's no row left to
   * take it, like a search field or a filter button.
   */
  fallbackRef?: React.RefObject<HTMLElement | null>
}

/**
 * The handle `useTreeNavigation` gives back, passed to each row's
 * `useTreeItem`. It keeps its identity across renders, so it's safe to pass to
 * memoized rows.
 */
export interface TreeNavigation {
  /**
   * Focuses the tree's tab stop, or `fallbackRef` when no row is shown.
   *
   * For when something that opened from a row closes and the row is gone, like
   * `useFocusReturn`'s `returnFocus` reporting it moved nothing.
   */
  focus: () => void
}

/** What `useTreeNavigation` shares with its rows' `useTreeItem`. */
interface TreeStore<Id> {
  getTabStopId: () => Id | undefined
  subscribe: (listener: () => void) => () => void
  register: (id: Id, element: HTMLElement | null) => void
}

// Keyed by the handle, so the store stays off the handle's public shape.
const STORES = new WeakMap<TreeNavigation, TreeStore<unknown>>()

/**
 * Makes a tree of rows one tab stop, moved through with the arrow keys.
 *
 * Spread `treeProps` onto the element that holds every row, and call
 * `useTreeItem(tree, id)` in each row, spreading what it returns onto the
 * element that takes focus. Rows can nest inside one another's elements, as
 * the WAI-ARIA pattern nests a `group` inside its `treeitem`.
 *
 * - ↓ and ↑ move to the next and previous row; Home and End to the first and
 *   last.
 * - → expands a collapsed row, and on an expanded one moves to its first child.
 * - ← collapses an expanded row, and on any other moves to its parent.
 *
 * Tab enters on the row last focused, or the top row if that one is gone. When
 * the focused row stops being shown -- removed, filtered out, or collapsed
 * away -- focus moves to the top row, or to `fallbackRef` if no row is left.
 * Focus the user had already moved elsewhere is left alone.
 *
 * Moving between rows re-renders only the row losing the tab stop and the row
 * gaining it, however many rows there are. Keys come from the row or anything
 * inside it, except a text field or a `<select>`, which keep their own arrow
 * keys; a key pressed with Alt, Ctrl, or Meta, or already handled, is left
 * alone. Enter and Space aren't handled -- open the row the way a click does,
 * with `clickOnActivationKey`. Roles are set, but `aria-expanded`,
 * `aria-level`, `aria-setsize`, and `aria-posinset` are the rows' to set.
 *
 * @example
 * ```tsx
 * const { treeProps, tree } = useTreeNavigation({
 *   items: visibleRows.map((row) => ({
 *     id: row.id,
 *     parentId: row.parentId,
 *     isExpanded: row.children.length ? expanded.has(row.id) : undefined,
 *   })),
 *   onExpandedChange: setRowExpanded,
 * })
 *
 * return <ul {...treeProps}>{rows.map((row) => <Row key={row.id} tree={tree} row={row} />)}</ul>
 *
 * // In Row:
 * const itemProps = useTreeItem(tree, row.id)
 * return <li {...itemProps} aria-expanded={...}>{row.name}</li>
 * ```
 */
export const useTreeNavigation = <Id>({
  items,
  onExpandedChange,
  fallbackRef,
}: UseTreeNavigationOptions<Id>) => {
  const onExpandedChangeRef = useLatestRef(onExpandedChange)
  const fallbackRefRef = useLatestRef(fallbackRef)

  const [state] = useState(() => {
    let currentItems: readonly TreeNavigationItem<Id>[] = []
    let indexById = new Map<Id, number>()
    // The row picked as the tab stop, kept even while it isn't shown, so a row
    // that comes back (re-expanded, say) before anything else is focused is
    // still where Tab lands.
    let pickedId: Id | undefined
    // The row holding focus, until focus leaves the tree for somewhere else.
    let focusedId: Id | undefined
    const elementById = new Map<Id, HTMLElement>()
    const idByElement = new Map<HTMLElement, Id>()
    const listeners = new Set<() => void>()
    const notify = () => {
      for (const listener of listeners) listener()
    }

    const getTabStopId = () =>
      pickedId !== undefined && indexById.has(pickedId)
        ? pickedId
        : currentItems[0]?.id

    const focusRow = (id: Id | undefined) => {
      if (id === undefined) return false
      const element = elementById.get(id)
      if (!element) return false
      element.focus()
      return true
    }

    /** The innermost row `target` sits in, within the tree. */
    const findRowId = (target: EventTarget, container: HTMLElement) => {
      for (
        let node = target instanceof Element ? target : null;
        node && node !== container;
        node = node.parentElement
      ) {
        if (node instanceof HTMLElement && idByElement.has(node))
          return idByElement.get(node)
      }
      return undefined
    }

    const store: TreeStore<Id> = {
      getTabStopId,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      register: (id, element) => {
        const previous = elementById.get(id)
        if (previous) idByElement.delete(previous)
        if (element) {
          elementById.set(id, element)
          idByElement.set(element, id)
        } else {
          elementById.delete(id)
        }
      },
    }

    const tree: TreeNavigation = {
      focus: () => {
        if (!focusRow(getTabStopId())) fallbackRefRef.current?.current?.focus()
      },
    }
    STORES.set(tree, store as TreeStore<unknown>)

    return {
      tree,
      setItems: (next: readonly TreeNavigationItem<Id>[]) => {
        currentItems = next
        indexById = new Map(next.map((item, index) => [item.id, index]))
        notify()
        if (focusedId === undefined || indexById.has(focusedId)) return
        // The focused row is no longer shown. It may still be mounted, on its
        // way out in an exit animation, with focus still on it; or already
        // unmounted, which leaves focus on `<body>` with no blur React reports.
        const removed = elementById.get(focusedId)
        focusedId = undefined
        const active = document.activeElement
        const isFocusLost =
          !active || active === document.body || !!removed?.contains(active)
        if (isFocusLost) tree.focus()
      },
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        const id = findRowId(event.target, event.currentTarget)
        focusedId = id
        if (id === undefined || id === pickedId) return
        pickedId = id
        notify()
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        const { relatedTarget, currentTarget, target } = event
        if (relatedTarget && currentTarget.contains(relatedTarget)) return
        // Focus left for nowhere because its row was removed: kept, so the
        // next `setItems` hands it on. React drops the blur a browser fires
        // mid-commit, but one fired outside it would land here.
        if (!relatedTarget && !target.isConnected) return
        focusedId = undefined
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (
          event.defaultPrevented ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        const { target } = event
        if (
          target instanceof Element &&
          (isTextEntry(target) || target instanceof HTMLSelectElement)
        )
          return
        const id = findRowId(target, event.currentTarget)
        const index = id === undefined ? undefined : indexById.get(id)
        if (id === undefined || index === undefined) return
        const item = currentItems[index]

        switch (event.key) {
          case 'ArrowDown':
            focusRow(currentItems[index + 1]?.id)
            break
          case 'ArrowUp':
            focusRow(currentItems[index - 1]?.id)
            break
          case 'Home':
            focusRow(currentItems[0]?.id)
            break
          case 'End':
            focusRow(currentItems.at(-1)?.id)
            break
          case 'ArrowRight': {
            if (item.isExpanded === false) {
              onExpandedChangeRef.current(id, true)
              break
            }
            const next = currentItems[index + 1]
            if (item.isExpanded && next?.parentId === id) focusRow(next.id)
            break
          }
          case 'ArrowLeft':
            if (item.isExpanded) onExpandedChangeRef.current(id, false)
            else if (item.parentId != null) focusRow(item.parentId)
            break
          default:
            return
        }
        // Even a key that moved nothing, like ↓ on the last row, so it doesn't
        // scroll the page instead.
        event.preventDefault()
      },
    }
  })

  // Before paint, so the tab stop never shows on a row that's gone, and the
  // hand-off happens in the same commit as the row leaving.
  useIsomorphicLayoutEffect(() => {
    state.setItems(items)
  }, [items])

  return {
    treeProps: {
      role: 'tree',
      onFocus: state.onFocus,
      onBlur: state.onBlur,
      onKeyDown: state.onKeyDown,
    },
    tree: state.tree,
  } as const
}

/**
 * Props for one row of a `useTreeNavigation` tree, spread onto the element
 * that takes focus.
 *
 * Re-renders the row only when it gains or loses the tab stop.
 */
export const useTreeItem = <Id>(tree: TreeNavigation, id: Id) => {
  // Always set: a handle only comes from `useTreeNavigation`, which stores it.
  const store = STORES.get(tree) as TreeStore<Id>
  const isTabStop = useSyncExternalStore(
    store.subscribe,
    () => store.getTabStopId() === id,
    () => false
  )
  const ref = useCallback(
    (element: HTMLElement | null) => store.register(id, element),
    [store, id]
  )

  return {
    ref,
    role: 'treeitem',
    tabIndex: isTabStop ? 0 : -1,
  } as const
}
