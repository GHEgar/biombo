# biombo

Headless panel and window management for React. biombo owns the state (stacking, focus, Escape,
docking, minimize, persistence) and you own every pixel: it ships no styles.

```bash
npm install biombo
```

```tsx
import { BiomboProvider, usePanel, localStorageAdapter } from 'biombo/react';

function Table() {
    const panel = usePanel('table', { dockable: ['bottom'], group: 'tables' });
    return (
        <>
            <button onClick={() => panel.toggle()}>Table</button>
            <section {...panel.getWindowProps()} className="your-styles">…</section>
        </>
    );
}

<BiomboProvider options={{ persist: { storage: localStorageAdapter(), key: 'app.panels', version: 1 } }}>
    <Table />
</BiomboProvider>
```

`biombo` is the framework-free core; `biombo/react` adds the hooks.

## License

AGPL-3.0-only
