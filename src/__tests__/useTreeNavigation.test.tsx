import { memo, useRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  type TreeNavigation,
  type TreeNavigationItem,
  useTreeItem,
  useTreeNavigation,
} from '../useTreeNavigation'

interface TestNode {
  id: string
  children?: readonly TestNode[]
}

/**
 * a
 *   a1
 *   a2
 *     a2x
 * b (holds a text field)
 * c
 *   c1
 */
const NODES = [
  {
    id: 'a',
    children: [{ id: 'a1' }, { id: 'a2', children: [{ id: 'a2x' }] }],
  },
  { id: 'b' },
  { id: 'c', children: [{ id: 'c1' }] },
] as const satisfies readonly TestNode[]

const T_IDS = {
  OUTSIDE_BTN: 'outside',
  FALLBACK_BTN: 'fallback',
  B_INPUT: 'b-input',
} as const

const buildItems = (
  nodes: readonly TestNode[],
  expanded: ReadonlySet<string>,
  leavingIds: ReadonlySet<string>,
  parentId?: string
): TreeNavigationItem<string>[] =>
  nodes.flatMap((node) => {
    if (leavingIds.has(node.id)) return []
    const isExpanded = node.children ? expanded.has(node.id) : undefined
    return [
      { id: node.id, parentId, isExpanded },
      ...(node.children && isExpanded
        ? buildItems(node.children, expanded, leavingIds, node.id)
        : []),
    ]
  })

interface RowProps {
  node: TestNode
  tree: TreeNavigation
  expanded: ReadonlySet<string>
  onRender?: (id: string) => void
}

// Memoized, like a real tree's rows, so a render count shows what the hook
// itself re-renders.
const Row = memo(({ node, tree, expanded, onRender }: RowProps) => {
  onRender?.(node.id)
  const itemProps = useTreeItem(tree, node.id)
  const isExpanded = expanded.has(node.id)
  return (
    <div {...itemProps} data-testid={node.id}>
      {node.id}
      {node.id === 'b' && <input data-testid={T_IDS.B_INPUT} />}
      {node.children && isExpanded && (
        <div>
          {node.children.map((child) => (
            <Row
              key={child.id}
              node={child}
              tree={tree}
              expanded={expanded}
              onRender={onRender}
            />
          ))}
        </div>
      )}
    </div>
  )
})

/**
 * The tree, with a button before it and an optional fallback after it.
 *
 * `leavingIds` stay rendered but out of `items`, as rows in an exit animation
 * would be; `removedIds` aren't rendered at all.
 */
const TestTree = ({
  nodes = NODES,
  initialExpanded = [],
  leavingIds = [],
  removedIds = [],
  hasFallback = false,
  onRender,
  onTree,
}: {
  nodes?: readonly TestNode[]
  initialExpanded?: readonly string[]
  leavingIds?: readonly string[]
  removedIds?: readonly string[]
  hasFallback?: boolean
  onRender?: (id: string) => void
  onTree?: (tree: TreeNavigation) => void
}) => {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(initialExpanded)
  )
  const fallbackRef = useRef<HTMLButtonElement>(null)
  const shownNodes = nodes.filter((node) => !removedIds.includes(node.id))
  const { treeProps, tree } = useTreeNavigation({
    items: buildItems(shownNodes, expanded, new Set(leavingIds)),
    onExpandedChange: (id, isExpanded) =>
      setExpanded((current) => {
        const next = new Set(current)
        if (isExpanded) next.add(id)
        else next.delete(id)
        return next
      }),
    fallbackRef,
  })
  onTree?.(tree)

  return (
    <>
      <button type="button" data-testid={T_IDS.OUTSIDE_BTN} />
      <div {...treeProps}>
        {shownNodes.map((node) => (
          <Row
            key={node.id}
            node={node}
            tree={tree}
            expanded={expanded}
            onRender={onRender}
          />
        ))}
      </div>
      {hasFallback && (
        <button
          type="button"
          ref={fallbackRef}
          data-testid={T_IDS.FALLBACK_BTN}
        />
      )}
    </>
  )
}

const getRow = (id: string) => screen.getByTestId(id)

/** Tabs in from the button before the tree. */
const tabIntoTree = async () => {
  screen.getByTestId(T_IDS.OUTSIDE_BTN).focus()
  await userEvent.tab()
}

describe('useTreeNavigation', () => {
  describe('tab stop', () => {
    it('makes the top row the only row in the tab order', async () => {
      render(<TestTree initialExpanded={['a']} />)

      for (const id of ['a', 'a1', 'a2', 'b', 'c']) {
        expect(getRow(id), id).toHaveAttribute(
          'tabindex',
          id === 'a' ? '0' : '-1'
        )
      }
      await tabIntoTree()
      expect(getRow('a')).toHaveFocus()
      await userEvent.tab()
      // Past the rows, onto the text field inside row b, which isn't a row.
      expect(screen.getByTestId(T_IDS.B_INPUT)).toHaveFocus()
    })

    it('tabs back in on the row last focused', async () => {
      render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{ArrowDown}')

      screen.getByTestId(T_IDS.OUTSIDE_BTN).focus()
      await userEvent.tab()

      expect(getRow('b')).toHaveFocus()
    })

    it('moves the tab stop to a row focused by a click', async () => {
      render(<TestTree />)

      await userEvent.click(getRow('c'))

      expect(getRow('c')).toHaveAttribute('tabindex', '0')
      expect(getRow('a')).toHaveAttribute('tabindex', '-1')
    })

    it('marks the tree and its rows with their roles', () => {
      render(<TestTree />)

      expect(screen.getByRole('tree')).toBeInTheDocument()
      expect(screen.getAllByRole('treeitem')).toHaveLength(3)
    })
  })

  describe('arrow keys', () => {
    it('moves down and up through the shown rows, into and out of children', async () => {
      render(<TestTree initialExpanded={['a', 'a2']} />)
      await tabIntoTree()

      for (const id of ['a1', 'a2', 'a2x', 'b', 'c']) {
        await userEvent.keyboard('{ArrowDown}')
        expect(getRow(id), id).toHaveFocus()
      }
      for (const id of ['b', 'a2x', 'a2', 'a1', 'a']) {
        await userEvent.keyboard('{ArrowUp}')
        expect(getRow(id), id).toHaveFocus()
      }
    })

    it('stops at the first and last rows rather than wrapping', async () => {
      render(<TestTree />)
      await tabIntoTree()

      await userEvent.keyboard('{ArrowUp}')
      expect(getRow('a')).toHaveFocus()

      await userEvent.keyboard('{End}{ArrowDown}')
      expect(getRow('c')).toHaveFocus()
    })

    it('jumps to the first and last shown rows on Home and End', async () => {
      render(<TestTree initialExpanded={['c']} />)
      await tabIntoTree()

      await userEvent.keyboard('{End}')
      expect(getRow('c1')).toHaveFocus()

      await userEvent.keyboard('{Home}')
      expect(getRow('a')).toHaveFocus()
    })

    it('expands a collapsed row on →, then moves to its first child', async () => {
      render(<TestTree />)
      await tabIntoTree()

      await userEvent.keyboard('{ArrowRight}')
      expect(getRow('a1')).toBeInTheDocument()
      // Expanding leaves focus where it was.
      expect(getRow('a')).toHaveFocus()

      await userEvent.keyboard('{ArrowRight}')
      expect(getRow('a1')).toHaveFocus()
    })

    it('does nothing on → on a row with no children', async () => {
      render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{ArrowDown}{ArrowRight}')

      expect(getRow('b')).toHaveFocus()
    })

    it('collapses an expanded row on ←', async () => {
      render(<TestTree initialExpanded={['a']} />)
      await tabIntoTree()

      await userEvent.keyboard('{ArrowLeft}')

      expect(screen.queryByTestId('a1')).not.toBeInTheDocument()
      expect(getRow('a')).toHaveFocus()
    })

    it('moves to the parent on ← from a collapsed row or a row with no children', async () => {
      render(<TestTree initialExpanded={['a']} />)
      await tabIntoTree()
      // a2 has children but is collapsed; a1 has none.
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowLeft}')
      expect(getRow('a')).toHaveFocus()

      await userEvent.keyboard('{ArrowDown}{ArrowLeft}')
      expect(getRow('a')).toHaveFocus()
    })

    it('does nothing on ← on a collapsed top-level row', async () => {
      render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowLeft}')

      expect(getRow('c')).toHaveFocus()
    })

    it('leaves keys pressed with a modifier alone', async () => {
      render(<TestTree />)
      await tabIntoTree()

      for (const modifier of ['Alt', 'Control', 'Meta']) {
        await userEvent.keyboard(`{${modifier}>}{ArrowDown}{/${modifier}}`)
        expect(getRow('a'), modifier).toHaveFocus()
      }
    })

    it('leaves a text field inside a row its own arrow keys', async () => {
      render(<TestTree />)
      await userEvent.click(screen.getByTestId(T_IDS.B_INPUT))

      await userEvent.keyboard('{ArrowDown}')

      expect(screen.getByTestId(T_IDS.B_INPUT)).toHaveFocus()
    })

    it('moves from a row when focus is on something inside it', async () => {
      render(<TestTree initialExpanded={['a']} />)
      // A nested row is inside its parent's element, so this also shows the
      // key goes to the innermost row it came from.
      const span = document.createElement('span')
      span.tabIndex = -1
      getRow('a1').append(span)
      span.focus()

      await userEvent.keyboard('{ArrowDown}')

      expect(getRow('a2')).toHaveFocus()
    })
  })

  describe('when the focused row stops being shown', () => {
    it('moves focus to the top row when the focused row is removed', async () => {
      const { rerender } = render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{End}')

      rerender(<TestTree removedIds={['c']} />)

      expect(getRow('a')).toHaveFocus()
    })

    it('moves focus off a row still on its way out', async () => {
      const { rerender } = render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{ArrowDown}')

      rerender(<TestTree leavingIds={['b']} />)

      expect(getRow('a')).toHaveFocus()
    })

    it('moves focus to the fallback when no row is left', async () => {
      const { rerender } = render(<TestTree hasFallback />)
      await tabIntoTree()

      rerender(<TestTree hasFallback removedIds={['a', 'b', 'c']} />)

      expect(screen.getByTestId(T_IDS.FALLBACK_BTN)).toHaveFocus()
    })

    it('leaves focus alone when it had already left the tree', async () => {
      const { rerender } = render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{End}')
      screen.getByTestId(T_IDS.OUTSIDE_BTN).focus()

      rerender(<TestTree removedIds={['c']} />)

      expect(screen.getByTestId(T_IDS.OUTSIDE_BTN)).toHaveFocus()
      // The tab stop still moves on, so Tab doesn't skip the tree.
      expect(getRow('a')).toHaveAttribute('tabindex', '0')
    })

    it('leaves focus on <body> when the user had blurred the row before it went', async () => {
      const { rerender } = render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{End}')
      getRow('c').blur()

      rerender(<TestTree removedIds={['c']} />)

      expect(document.body).toHaveFocus()
    })

    it('leaves focus on another row when an unfocused row goes', async () => {
      const { rerender } = render(<TestTree />)
      await tabIntoTree()
      await userEvent.keyboard('{ArrowDown}')

      rerender(<TestTree removedIds={['c']} />)

      expect(getRow('b')).toHaveFocus()
    })
  })

  describe('tree.focus', () => {
    it('focuses the tab stop', async () => {
      const onTree = vi.fn()
      render(<TestTree onTree={onTree} />)
      await userEvent.click(getRow('b'))
      screen.getByTestId(T_IDS.OUTSIDE_BTN).focus()

      onTree.mock.lastCall?.[0].focus()

      expect(getRow('b')).toHaveFocus()
    })

    it('focuses the fallback when no row is shown', () => {
      const onTree = vi.fn()
      render(
        <TestTree onTree={onTree} hasFallback removedIds={['a', 'b', 'c']} />
      )

      onTree.mock.lastCall?.[0].focus()

      expect(screen.getByTestId(T_IDS.FALLBACK_BTN)).toHaveFocus()
    })
  })

  it('re-renders only the two rows the tab stop moves between', async () => {
    const onRender = vi.fn()
    render(<TestTree onRender={onRender} />)
    await tabIntoTree()
    onRender.mockClear()

    await userEvent.keyboard('{ArrowDown}')

    expect(onRender.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'b'])
  })
})
