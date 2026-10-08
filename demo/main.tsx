import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BiomboProvider, localStorageAdapter, useArea, useGlobalMode, useSnapPreview, type PanelConfig } from 'biombo/react';
import { DemoPanel } from './DemoPanel';
import { PillBar, Scale } from './PillBar';
import { Toolbar } from './Toolbar';

export const PANELS: Record<string, { title: string; config: PanelConfig }> = {
    tabla: {
        title: 'Tabla',
        config: { dockable: ['top', 'right', 'bottom', 'left'], defaultSize: { width: 520, height: 280 } },
    },
    capas: {
        title: 'Capas',
        config: { dockable: ['left', 'right'], defaultSize: { width: 300, height: 360 }, initial: { dockSize: 300 } },
    },
    info: {
        title: 'Info',
        config: { defaultSize: { width: 320, height: 200 }, minimizable: false, compact: 'fullscreen' },
    },
};

function FakeMap() {
    const area = useArea();
    return (
        <main className="map" style={{ inset: `${area.top}px ${area.right}px ${area.bottom}px ${area.left}px` }} data-testid="map">
            <span>{`área útil · top ${area.top} · right ${area.right} · bottom ${area.bottom} · left ${area.left}`}</span>
        </main>
    );
}

function SnapPreview() {
    const snap = useSnapPreview();
    if (!snap) {
        return null;
    }
    const { rect } = snap;
    return <div className="snap" data-testid="snap" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />;
}

function Mode() {
    const [active, setActive] = useState(false);
    useGlobalMode(() => setActive(false), active);
    return (
        <button type="button" className={active ? 'mode on' : 'mode'} data-testid="mode" onClick={() => setActive((value) => !value)}>
            {active ? 'Modo activo (Esc sale)' : 'Activar modo'}
        </button>
    );
}

function App() {
    return (
        <BiomboProvider
            options={{
                edges: { left: { policy: 'stack' }, right: { policy: 'tabs' } },
                persist: { storage: localStorageAdapter(), key: 'biombo.demo', version: 1 },
            }}
        >
            <FakeMap />
            <Toolbar panels={PANELS} mode={<Mode />} />
            {Object.entries(PANELS).map(([id, panel]) => (
                <DemoPanel key={id} id={id} title={panel.title} config={panel.config} />
            ))}
            <SnapPreview />
            <Scale />
            <PillBar titles={Object.fromEntries(Object.entries(PANELS).map(([id, panel]) => [id, panel.title]))} />
        </BiomboProvider>
    );
}

const root = document.getElementById('root');
if (root) {
    createRoot(root).render(<StrictMode><App /></StrictMode>);
}
