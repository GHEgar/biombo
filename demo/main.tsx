import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BiomboProvider, localStorageAdapter, useArea, useGlobalMode, useSnapPreview } from 'biombo/react';
import { DemoPanel } from './DemoPanel';
import { PANELS, TITLES } from './panels';
import { PillBar, Scale } from './PillBar';
import { Toolbar } from './Toolbar';

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
            <PillBar titles={TITLES} />
        </BiomboProvider>
    );
}

const root = document.getElementById('root');
if (root) {
    createRoot(root).render(<StrictMode><App /></StrictMode>);
}
