# @bvandrc/react-toolkit

Generic React hooks and helpers for UI behavior, such as press-and-hold, scrolling into view, the on-screen keyboard, and focus handoff.

```bash
npm install @bvandrc/react-toolkit
```

Requires React 18 or 19. ESM only, with types included. Each export's JSDoc covers its options and edge cases; the tables below are an index.

## Hooks and Helpers

### Viewport and Device

| Export | What it does |
| --- | --- |
| `useIsMobile` | Whether the viewport is narrower than a breakpoint (Tailwind's `md` by default). |
| `isTouchDevice` | Whether the primary input is touch (`pointer: coarse`). |
| `detectDevice` | Whether the page is running on iOS, Android, or desktop. |
| `useVisualViewportPin` | Keeps a fixed, full-screen element, like a sheet, matched to the visual viewport, so it stays on screen while the on-screen keyboard is open or the page is zoomed. |
| `useVisualViewportListener` | Calls a handler on each visual viewport `resize` or `scroll` while mounted. |
<!-- Not really that important / useful compared to how much it takes to explain -->
<!-- | `getBelowBreakpointQuery` | The media query `useIsMobile` matches for a breakpoint, stopping 1px short so it never overlaps a `min-width` style at the same width. | -->

### Layout

| Export | What it does |
| --- | --- |
| `useShrinkToFit` | How many steps down a set of text sizes a line needs to stop wrapping, re-measured as its width changes or fonts load. |
| `getContentHeight` | An element's height inside its padding and border. |
| `isInView` | Whether all of an element is on screen, clear of its scroll container's scroll padding. |
| `getRoomAround` | How much of the screen is free above and below an element, not counting the on-screen keyboard. |

### Page Lifecycle

| Export | What it does |
| --- | --- |
| `useAppVisibility` | Calls `onVisible` or `onHidden` as the document's visibility changes. |
| `useIsOnline` | Whether the browser reports a network connection, re-rendering as it changes. |
| `onAppLeave` | Calls back when the page is hidden or unloading, including when a phone kills a backgrounded app without `pagehide`. Works outside React. |

### Scrolling

| Export | What it does |
| --- | --- |
| `useScrollIntoView` | `scrollIntoView` within an element's own scroll container: cancelable, held against scroll anchoring, and clear of its scroll padding. |
| `useScrollOnFocus` | Scrolls a focused element into view and keeps it there as it resizes. On touch, restores the scroll the on-screen keyboard leaves behind. |
| `useMakeRoomForPopover` | Scrolls a popover's trigger so a popover too tall to fit above or below it does. |
| `getTargetScrollTop` | The `scrollTop` that brings an element into view within its scroll container. |
| `findScrollableAncestor` | The nearest ancestor that scrolls, or the document's scrolling element. |
| `getVisibleBounds` | The visible top and bottom of a scroll container, in viewport coordinates, minus its scroll padding. |
| `onFocusScrollEnd` | Calls back once the scroll that focusing an element brings has finished. Works outside React. |

The scrolling hooks jump by default; pass `scrollBehavior: 'smooth'` to animate, except for users who prefer reduced motion.

### Focus

| Export | What it does |
| --- | --- |
| `useFocusHandoff` | Hands focus to a target when the focused element inside a container unmounts, so it doesn't fall to `<body>`. |
| `useFocusReturn` | Returns focus to what had it when a dialog opened. Fits a Radix dialog's `onCloseAutoFocus`. |
| `useTouchKeepsFocus` | Keeps focus in a text field while a menu or popover opened by touch is used, so the on-screen keyboard stays up. Fits Radix's `onOpenAutoFocus`. |
| `useFocusVisibleOpen` | Open state for something keyboard focus opens, like a tooltip, waiting until the scroll that focus brings has finished. |
| `useTooltipFocusOpen` | `useFocusVisibleOpen` fitted to a Radix tooltip, replacing Radix's own focus open, which a scrolled-to trigger loses. |
| `blurFocusedTextInput` | Blurs the focused text field, closing the on-screen keyboard. |

### Press and Toggle

| Export | What it does |
| --- | --- |
| `useAfterPress` | Runs a change once any press in progress has finished, so a layout shift doesn't move a control out from under its click. |
| `usePressHold` | Detects a press held in place, for a long-press action. |
| `usePressToggle` | Active state a tap, click, Enter, or Space toggles, for something hover or focus can also open, like a tooltip. |

### Input

| Export | What it does |
| --- | --- |
| `clickOnActivationKey` | A keydown handler that clicks its element on Enter or Space, so a non-button activates like a button. |
| `isActivationKey` | Whether a key is Enter or Space. |
| `nativeActivationKeys` | The keys the browser already clicks an element on, such as Enter for a link and Space for a checkbox. |
| `isTextEntry` | Whether an element takes typed text. |
| `isComposing` | Whether a keydown belongs to an IME composition, including Safari's misreported case. |
| `isPrimaryPress` | Whether a pointer event is the first finger down or a left click. |
| `clientPointOf` | A mouse or touch event's pointer position in the viewport. |

### State and Timing

| Export | What it does |
| --- | --- |
| `useMaybeControlled` | A value that's controlled when the caller passes one, and internal when they don't. |
| `useStateRef` | `useState`, plus a ref that always holds the latest value. |
| `useTimer` | A timeout started from a handler, replaced by the next `start` and cleared on unmount. |
| `useHasPassed` | Whether a date has passed, re-rendering the moment it does. |
| `useDebouncedPersist` | Persists a value to `localStorage`, debounced, and flushed when the app is hidden or closed. |
| `createLazyLoad` | Makes a hook for something loaded on demand and shared across components, with a `prefetch` to start it early. |

### Tabs

From `@bvandrc/react-toolkit/active-tab`, with [`tab-election`](https://www.npmjs.com/package/tab-election) installed alongside (an optional peer dependency).

| Export | What it does |
| --- | --- |
| `useActiveTab` | Runs an app in one tab at a time, with a `takeOver` to move it to this tab. |

### Gestures

From `@bvandrc/react-toolkit/gestures`, with [`@use-gesture/react`](https://www.npmjs.com/package/@use-gesture/react) installed alongside (an optional peer dependency).

| Export | What it does |
| --- | --- |
| `useZoomPanGestures` | Zooms and pans an element's content along one axis, with the wheel, a pinch, or a drag. Give the element `touch-action: none`. |

### Other Helpers

| Export | What it does |
| --- | --- |
| `shareFiles` | Opens the native share sheet with files, resolving to whether they were shared, cancelled, or need a fallback. |
| `buildMailtoHref` | A `mailto:` link with its subject and body filled in. |
| `createRequiredContext` | A context and a hook that reads it, throwing outside its provider so there's no `null` check. |
| `createDeviceId` | A per-install id in `localStorage`, which tabs opening at once agree on. |
| `TAILWIND_BREAKPOINTS` | Tailwind's default breakpoints in px. |

## Test Support

`@bvandrc/react-toolkit/test-support` fills in the browser APIs and layout that happy-dom and jsdom lack:

- `mockVisualViewport`, `mockResizeObserver`, `mockMatchMedia`, `mockMobile`, and `mockTouchDevice`: Vitest mocks, which need `vitest` and `@testing-library/react` (optional peer dependencies).
- `mockScrollLayout`: lays an element out in its scroll container, for testing code that scrolls to it. Smooth `scrollTo` calls are recorded but never run.
- `installTabApis`: Node's own Web Locks and `BroadcastChannel`, for testing `useActiveTab`. Needs Node 24 or later.

## License

MIT
