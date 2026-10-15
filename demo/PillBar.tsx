import { useRef, useSyncExternalStore } from 'react';
import { ChevronUp } from 'tesela/react';
import { useClearance, useManager, useObstacle } from 'biombo/react';

export function Scale() {
    const ref = useRef<HTMLDivElement>(null);
    useObstacle(ref);
    return <div ref={ref} className="scale" data-testid="scale">0 — 5 km</div>;
}

export function PillBar({ titles }: { titles: Record<string, string> }) {
    const manager = useManager();
    const ref = useRef<HTMLDivElement>(null);
    const snapshot = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
    const bottom = useClearance(ref, { side: 'bottom', base: 12 });
    const minimized = Object.values(snapshot.panels).filter((panel) => panel.open && panel.minimized);

    return (
        <div ref={ref} className="pillbar" style={{ bottom }} data-testid="pillbar">
            {minimized.length === 0 && <span className="pillbar-empty">Nothing minimized</span>}
            {minimized.map((panel) => (
                <button key={panel.id} type="button" className="pill" onClick={() => manager.open(panel.id)}>
                    {titles[panel.id] ?? panel.id}
                    <ChevronUp size={14} />
                </button>
            ))}
        </div>
    );
}
