import 'rotulo';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BiomboProvider, localStorageAdapter, useArea, useGlobalMode, useSnapPreview, type Point } from 'biombo/react';
import { DemoPanel } from './DemoPanel';
import { InfoBox } from './InfoBox';
import { PANELS, TITLES } from './panels';
import { PillBar, Scale } from './PillBar';
import { Surfaces } from './Surfaces';
import { Toolbar } from './Toolbar';

function FakeMap({ onPick }: { onPick: (point: Point) => void }) {
    const area = useArea();
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        const element = ref.current;
        const onClick = (event: MouseEvent): void => onPick({ x: event.clientX, y: event.clientY });
        element?.addEventListener('click', onClick);
        return () => element?.removeEventListener('click', onClick);
    }, [onPick]);
    return (
        <main ref={ref} className="map" style={{ inset: `${area.top}px ${area.right}px ${area.bottom}px ${area.left}px` }} data-testid="map">
            <span>{`usable area · top ${area.top} · right ${area.right} · bottom ${area.bottom} · left ${area.left}`}</span>
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
            {active ? 'Mode active (Esc exits)' : 'Activate mode'}
        </button>
    );
}

function App() {
    const [point, setPoint] = useState<Point | null>(null);
    return (
        <BiomboProvider
            options={{
                edges: { left: { policy: 'stack' }, right: { policy: 'tabs' } },
                persist: { storage: localStorageAdapter(), key: 'biombo.demo', version: 1 },
            }}
        >
            <FakeMap onPick={setPoint} />
            <Toolbar panels={PANELS} mode={<Mode />} />
            {Object.entries(PANELS).map(([id, panel]) => (
                <DemoPanel key={id} id={id} title={panel.title} config={panel.config} />
            ))}
            <SnapPreview />
            <Scale />
            <PillBar titles={TITLES} />
            <Surfaces />
            {point && <InfoBox key={`${point.x},${point.y}`} point={point} onClose={() => setPoint(null)} />}
        </BiomboProvider>
    );
}

const root = document.getElementById('root');
if (root) {
    createRoot(root).render(<StrictMode><App /></StrictMode>);
}
