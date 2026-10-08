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

`biombo` is the framework-free core; `biombo/react` adds the hooks. `npm run demo` runs a playground.

## License

AGPL-3.0-only
