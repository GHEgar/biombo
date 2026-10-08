# biombo

Headless panel and window management for React. biombo owns the state (stacking, focus, Escape,
docking, minimize, persistence) and you own every pixel: it ships no styles.

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
    <Table />
</BiomboProvider>
```

`biombo` is the framework-free core; `biombo/react` adds the hooks. Run `npm run demo` to try it.

## License

AGPL-3.0-only
