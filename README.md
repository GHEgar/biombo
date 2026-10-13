# biombo

Headless panel and window management for React. biombo owns the state — stacking, focus, Escape,
docking, minimize, tabs, persistence — and you own every pixel: it ships no styles, only state, events,
`data-*`/ARIA attributes and the functional inline style (`position`, `left/top/width/height`, `z-index`).

```bash
npm install biombo
```

```tsx
import { BiomboProvider, usePanel, useArea, localStorageAdapter } from 'biombo/react';

function Table() {
    const panel = usePanel('table', { dockable: ['bottom'], defaultSize: { width: 520, height: 280 } });
    return (
        <>
            <button onClick={() => panel.toggle()}>Table</button>
            <section {...panel.getWindowProps()} className="your-styles">
                <header {...panel.getHandleProps()}>Drag me</header>
                <div {...panel.getResizerProps()} />
            </section>
        </>
    );
}

function Map() {
    const area = useArea();
    return <main style={{ position: 'fixed', inset: `${area.top}px ${area.right}px ${area.bottom}px ${area.left}px` }} />;
}

<BiomboProvider options={{ persist: { storage: localStorageAdapter(), key: 'app.panels', version: 1 } }}>
    <Map />
    <Table />
</BiomboProvider>
```

## What it does

| Feature | API |
|---|---|
| Z-order by named bands, focus on pointer down | `bands`, `getWindowProps` |
| Escape closes only the topmost layer; global modes last | `useEscape`, `useGlobalMode` |
| Groups where one panel is shown at a time | `groups: { name: { mode: 'single' } }` |
| Drag, snap to edges, undock by dragging | `getHandleProps`, `snap`, `undockOnDrag`, `useSnapPreview` |
| Dock to any edge with `replace`, `stack` or `tabs` policies | `dock`, `edges`, `useEdge` |
| Usable area left for your content | `useArea`, `onAreaChange` |
| Resize docked and floating panels | `getResizerProps(direction?)` |
| Minimize and maximize | `minimize`, `maximize` |
| Compact mode: sheets, fullscreen or inline below a breakpoint | `compactBreakpoint`, `compact`, `useCompact` |
| Keep floating controls clear of panels and obstacles | `useClearance`, `useObstacle` |
| Tabs with keyboard and drag reorder, controlled or not | `useTabs`, `onReorder` |
| F6 cycles focus between panels | `cycleKey` |
| Versioned persistence and external sync | `persist`, `serialize`, `hydrate`, `onEvent` |
| Keep a floating panel fully on screen instead of partially | `contain: 'full'`, `containMargin` |
| Focus trap with stacked traps, `inert` for the rest of the page and focus returned on close | `useFocusTrap` |
| Body scroll lock that survives nested modals | `useScrollLock` |
| Dismiss on a press outside, topmost surface only | `useDismissOutside` |
| Tooltips and popovers anchored to an element or a point, flipping and clamped to the viewport | `useAnchoredPosition`, `placeAnchored` |
| Render into `document.body`, SSR-safe | `Portal` |
| Drag any element inside the viewport, alone or on top of an anchored surface | `useDraggable` |
| Swipe to dismiss, driven by CSS variables instead of re-renders | `useDismissGesture` |

`biombo` is the framework-free core; `biombo/react` adds the hooks. `npm run demo` runs a playground.

## Surfaces

These hooks work with or without `BiomboProvider`. A modal combines four of them:

```tsx
import { ESCAPE_PRIORITY, Portal, useDismissOutside, useEscape, useFocusTrap, useScrollLock } from 'biombo/react';

function Modal({ onClose, children }) {
    const ref = useRef(null);
    const { getTrapProps } = useFocusTrap(ref);
    const { getDismissProps } = useDismissOutside(ref, onClose);
    useScrollLock();
    useEscape(onClose, { priority: ESCAPE_PRIORITY.modal });
    return (
        <Portal>
            <div ref={ref} {...getTrapProps()} {...getDismissProps()} role="dialog" aria-modal="true">{children}</div>
        </Portal>
    );
}
```

A tooltip anchors to its trigger; an info box anchors to a map click and can be dragged away:

```tsx
const anchored = useAnchoredPosition(tipRef, { anchor: triggerRef, open, placement: 'top' });
<div ref={tipRef} {...anchored.getFloatingProps()} role="tooltip" />

const drag = useDraggable(boxRef, { margin: 10 });
const anchored = useAnchoredPosition(boxRef, { anchor: { x, y }, shift: drag.offset, paused: drag.dragging });
<div ref={boxRef} {...anchored.getFloatingProps()}><header {...drag.getHandleProps()} /></div>
```

`useDismissGesture` writes `--biombo-swipe` (px) and `--biombo-swipe-progress` (0–1) on the element and sets
`data-swipe` to `idle`, `moving`, `armed` or `dismissed`; the animation is yours:

```css
.card { transform: translateX(var(--biombo-swipe, 0px)); opacity: calc(1 - var(--biombo-swipe-progress, 0) * 0.6); }
.card[data-swipe='idle'], .card[data-swipe='dismissed'] { transition: transform 0.22s, opacity 0.22s; }
```

Notes:

- `position: fixed` is relative to the nearest ancestor with `transform`, `filter` or `contain`, not to the
  viewport. Render anchored surfaces through `Portal` (this needs `react-dom`, an optional peer).
- In a registered panel, pass `returnFocus: false` to `useFocusTrap`: closing the panel already returns focus
  to its trigger.
- `useAnchoredPosition` owns the inline `max-height` and `max-width` of the surface.
- A surface rendered through a portal inside another one counts as inside it for `useDismissOutside` when
  the outer surface spreads `getDismissProps()`.

## License

AGPL-3.0-only
