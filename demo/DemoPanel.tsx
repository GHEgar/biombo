import { usePanel, type Edge, type PanelConfig, type ResizeDirection } from 'biombo/react';

const CORNERS: ResizeDirection[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];

const OPPOSITE: Record<Edge, string> = { top: 's', bottom: 'n', left: 'e', right: 'w' };

export function DemoPanel({ id, title, config }: { id: string; title: string; config: PanelConfig }) {
    const panel = usePanel(id, config);
    const { state } = panel;
    const dockable = config.dockable ?? [];
    const floating = state.presentation === 'floating';

    return (
        <section {...panel.getWindowProps()} className="panel" aria-label={title} data-testid={`panel-${id}`}>
            <header {...panel.getHandleProps()} className="panel-bar" data-testid={`handle-${id}`}>
                <strong>{title}</strong>
                <span className="z">{`z ${state.zIndex}`}</span>
                <span className="spacer" />
                {dockable.includes('bottom') && (
                    <button type="button" onClick={() => panel.dock(state.dock ? null : 'bottom')}>
                        {state.dock ? 'Soltar' : 'Acoplar'}
                    </button>
                )}
                {config.minimizable !== false && (
                    <button type="button" onClick={() => panel.minimize()} aria-label={`Minimizar ${title}`}>_</button>
                )}
                <button type="button" onClick={() => panel.maximize(!state.maximized)} aria-label={`Maximizar ${title}`}>□</button>
                <button type="button" onClick={() => panel.close()} aria-label={`Cerrar ${title}`}>×</button>
            </header>
            <div className="panel-body">
                <p>{`Presentación: ${state.presentation}${state.dock ? ` · borde ${state.dock}` : ''}`}</p>
                <input placeholder="Un input no arrastra" />
            </div>
            {state.presentation === 'docked' && state.dock && (
                <div {...panel.getResizerProps()} className={`resizer dock ${OPPOSITE[state.dock]}`} data-testid={`resizer-${id}`} />
            )}
            {floating && CORNERS.map((direction) => (
                <div key={direction} {...panel.getResizerProps(direction)} className={`resizer ${direction}`} />
            ))}
        </section>
    );
}
