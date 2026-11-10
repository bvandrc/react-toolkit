# @bvandrc/react-toolkit

Generic React hooks and helpers for UI behavior, such as press-and-hold, scrolling into view, the visual viewport and on-screen keyboard, focus handoff and return, and more.

```bash
npm install @bvandrc/react-toolkit
```

Requires React 18 or 19. ESM only, with types included.

## Hooks and Helpers

### Viewport and Device

| Export | What it does |
| --- | --- |
| `useIsMobile` | Whether the viewport is narrower than a breakpoint (Tailwind's `md` by default). |
| `getBelowBreakpointQuery` | The media query `useIsMobile` matches for a breakpoint, stopping 1px short so it never overlaps a `min-width` style at the same width. |
| `isTouchDevice` | Whether the primary input is touch, based on the `(pointer: coarse)` media query. |
| `detectDevice` | Whether the page is running on iOS, Android, or desktop, based on `navigator.userAgent`. |
| `useVisualViewportPin` | Keeps a fixed, full-screen element, like a sheet, matched to `window.visualViewport`, so it stays on screen and scrollable while the on-screen keyboard is open or the page is pinch-zoomed. |
| `useVisualViewportListener` | Calls a handler on each visual viewport `resize` or `scroll`, for as long as the component is mounted. |
| `getRoomAround` | How much of the screen is free above and below an element, not counting what an open on-screen keyboard covers. |
| `getContentHeight` | How tall an element's content is, inside its padding and border. |
| `useShrinkToFit` | How many steps down through a set of text sizes, largest first, keep a line from wrapping: the fewest that do, or none where no step does. Measures before paint, and again when the line's width or the number of sizes changes, or a font loads. The text must not wrap itself. |
<!-- Not really that important / useful compared to how much it takes to explain -->
<!-- | `getBelowBreakpointQuery` | The media query `useIsMobile` matches for a breakpoint, stopping 1px short so it never overlaps a `min-width` style at the same width. | -->

### Page Lifecycle

| Export | What it does |
| --- | --- |
| `useAppVisibility` | Calls `onVisible` or `onHidden` as the document's visibility changes. |
| `useIsOnline` | Whether the browser reports a network connection, re-rendering as it goes offline and back. Takes an optional `onChange` for each switch. |
| `onAppLeave` | Calls back when the page is hidden or unloading, including when a phone kills a backgrounded app without `pagehide` ever firing. Works outside React. |

### Scrolling

| Export | What it does |
| --- | --- |
| `useScrollIntoView` | `scrollIntoView` within an element's own scroll container, held against scroll anchoring, and cancelable. Jumps by default; pass `smooth` to animate it, except for users who prefer reduced motion. `onScrollEnd` is called once it lands. |
| `useScrollOnFocus` | Handlers that scroll a focused element into view and keep it there as it resizes. On touch devices, also restores the scroll position the on-screen keyboard leaves behind when it closes. Jumps by default; pass `smooth` to animate it. |
| `useMakeRoomForPopover` | When a popover mounts too tall to fit above or below its trigger, scrolls the trigger's scroll area so it does. Jumps by default; pass `smooth` to animate it. |
| `getTargetScrollTop` | The `scrollTop` that would bring an element into view within its scroll container: at its top, centered, or as little as it takes. |
| `findScrollableAncestor` | The nearest ancestor whose own overflow scrolls, or the document's scrolling element when none does. |
| `getVisibleBounds` | The visible top and bottom of a scroll container in viewport coordinates, counting only the on-screen part when that's the document itself. |
| `isInView` | Whether all of an element is on screen: inside the window, and inside the visible part of its scroll container. |
| `onFocusScrollEnd` | Calls back once the scroll that focusing an element brings has finished, in its scroll container or the page: on `scrollend`, or a second on at most, for one out of view, or a frame on for one already in view. Returns a function that calls it off. Works outside React. |

### Focus

| Export | What it does |
| --- | --- |
| `useFocusHandoff` | Hands focus to a target when the focused element inside a container unmounts, so focus doesn't fall to `<body>`. |
| `useFocusReturn` | Remembers what had focus when a dialog opened, and returns focus to it on close. Plugs straight into a Radix dialog's `onCloseAutoFocus`. |
| `useTouchKeepsFocus` | Props for a menu or popover's trigger and content that leave focus in a text field when it's opened by touch, so the on-screen keyboard stays open through the open and each tap on an item. Plugs straight into a Radix menu or popover's `onOpenAutoFocus`. |
| `useFocusVisibleOpen` | Open state for something focus opens, like a tooltip, with focus and blur handlers to spread onto its trigger. Only focus the browser would ring opens it, keyboard focus say, the same as Radix's own triggers, and only once the scroll that focus brings has finished, since Radix closes a tooltip whose trigger scrolls. A blur or a close before then calls it off. |
| `blurFocusedTextInput` | Blurs the focused text `input`, `textarea`, or `contenteditable`, closing the on-screen keyboard, and returns whether there was one to blur. |

### Press and Toggle

| Export | What it does |
| --- | --- |
| `usePressHold` | Detects a press held in place, for a long-press action. Cancels on movement, lift, the OS taking the touch over, or unmount. |
| `usePressToggle` | Active state for something hover or focus can also open, like a tooltip, that a tap, click, Enter, Space, or a screen reader's activation toggles. One that hover or focus opened stays open on the first click or key, and a tap, which can't have hovered, turns it off. Pass `pointerTypes`, like `['touch']`, for a trigger inside a link or control: only those pointers' presses toggle, and their clicks are cancelled, leaving every other click and key to what's around it. `cancelClick` sets whether toggled clicks are cancelled either way. |

### Input

| Export | What it does |
| --- | --- |
| `clickOnActivationKey` | A keydown handler that clicks its element on Enter or Space, so a non-button element activates like a button does. |
| `isActivationKey` | Whether a key activates a button: Enter or Space. |
| `nativeActivationKeys` | The keys the browser already clicks an element on by itself, such as Enter for a link and Space for a checkbox. |
| `isTextEntry` | Whether an element takes typed text: an `<input>`, a `<textarea>`, or `contenteditable`. |
| `isComposing` | Whether a keydown belongs to an IME composition, such as the Enter that commits a candidate, including Safari's case that reports it as not composing. |
| `isPrimaryPress` | Whether a pointer event is the primary pointer's main button: the first finger down, or a left click. |
| `clientPointOf` | Where a mouse or touch event's pointer is in the viewport, as a `Point`: the first finger for a touch, or `null` once none is down. Takes React's events and the DOM's alike. |

### State and Timing

| Export | What it does |
| --- | --- |
| `useMaybeControlled` | A value that's controlled when the caller passes one, and managed internally when they don't. |
| `useStateRef` | `useState`, plus a ref that always holds the latest value set, for handlers built once. |
| `useTimer` | A timeout started from a handler rather than on render, replaced by the next `start` and cleared on unmount. |
| `useHasPassed` | Whether a date has passed, re-rendering at the moment it does with one timer rather than polling. |
| `useDebouncedPersist` | Persists a value to `localStorage`, debounced, and flushed when the app is hidden or closed so nothing is lost to the debounce window. |
| `createLazyLoad` | Makes a hook for something loaded on demand, like code and data kept out of the first load, which every component using it shares: the value once loaded, whether loading failed and why, and a `prefetch` to start it, say as a pointer arrives. Loads once, however many components prefetch, and every mounted component sees the result at once. |

### Tabs

From `@bvandrc/react-toolkit/active-tab`, with [`tab-election`](https://www.npmjs.com/package/tab-election) installed alongside (an optional peer dependency).

| Export | What it does |
| --- | --- |
| `useActiveTab` | Runs an app in one tab at a time, with a `takeOver` to move it to this tab. |

## Other Helpers

Plain functions, usable outside React:

<table>
  <thead>
    <tr><th>Export</th><th>What it does</th></tr>
  </thead>
  <tbody>
    <tr><td colspan="2"><b><i>Sharing</i></b></td></tr>
    <tr><td><code>shareFiles</code></td><td>Opens the native share sheet with files, and resolves to whether they were shared, the user cancelled, or the caller should fall back.</td></tr>
    <tr><td><code>buildMailtoHref</code></td><td>A <code>mailto:</code> link with its subject and body filled in, with spaces encoded so mail clients don't show them as <code>+</code>.</td></tr>
    <tr><td colspan="2"><b><i>Context</i></b></td></tr>
    <tr><td><code>createRequiredContext</code></td><td>A context paired with the hook that reads it, which throws outside its provider so callers get the value without a <code>null</code> check.</td></tr>
    <tr><td colspan="2"><b><i>Device identity</i></b></td></tr>
    <tr><td><code>createDeviceId</code></td><td>A per-install id kept in <code>localStorage</code>, minted on first read under a Web Lock so tabs opening at once agree on one, with a setter that can be used to carry it across a wholesale <code>localStorage.clear()</code>.</td></tr>
    <tr><td colspan="2"><b><i>Constants</i></b></td></tr>
    <tr><td><code>TAILWIND_BREAKPOINTS</code></td><td>Tailwind's default breakpoints in px, each the <code>min-width</code> its prefix applies from.</td></tr>
  </tbody>
</table>

## Test Support

`@bvandrc/react-toolkit/test-support` fills in the browser APIs these hooks read and test DOMs like happy-dom and jsdom don't fully provide:

- `mockVisualViewport`, `mockResizeObserver`, `mockMatchMedia`, `mockMobile`, and `mockTouchDevice`: Vitest mocks, which need `vitest` and `@testing-library/react` (optional peer dependencies).
- `installTabApis`: Node's own Web Locks and `BroadcastChannel`, for testing code that coordinates tabs, like `useActiveTab`. Needs Node 24 or later.

## License

MIT
