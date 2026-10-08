import { useSyncExternalStore, type ReactNode } from 'react';
import { useManager, type PanelConfig } from 'biombo/react';

export function Toolbar({ panels, mode }: { panels: Record<string, { title: string; config: PanelConfig }>; mode: ReactNode }) {
    const manager = useManager();
    const snapshot = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);

    return (
        <nav className="toolbar">
            {Object.entries(panels).map(([id, { title }]) => {
                const state = snapshot.panels[id];
                return (
                    <button
                        key={id}
                        type="button"
                        data-testid={`toggle-${id}`}
                        className={state?.visible ? 'on' : ''}
                        onClick={(event) => manager.toggle(id, event.currentTarget)}
                    >
                        {title}
                    </button>
                );
            })}
            {mode}
        </nav>
    );
}
