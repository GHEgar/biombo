import { useRef, useState } from 'react';
import { ESCAPE_PRIORITY, Portal, useAnchoredPosition, useDismissGesture, useDraggable, useEscape, type Point } from 'biombo/react';

const CARDS = ['Municipio', 'Colonia', 'Manzana'];
const ANY_POINTER = ['touch', 'pen', 'mouse'];

function SwipeCard({ label, onDismiss }: { label: string; onDismiss: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const { getGestureProps, state } = useDismissGesture(ref, { onDismiss, pointerTypes: ANY_POINTER });
    return (
        <div ref={ref} {...getGestureProps()} className="card" data-testid={`card-${label}`}>
            <strong>{label}</strong>
            <span>{state === 'armed' ? 'Suelta para quitar' : 'Desliza para quitar'}</span>
        </div>
    );
}

export function InfoBox({ point, onClose }: { point: Point; onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const [cards, setCards] = useState(CARDS);
    const drag = useDraggable(ref, { margin: 10 });
    const anchored = useAnchoredPosition(ref, { anchor: point, shift: drag.offset, paused: drag.dragging, margin: 10 });
    useEscape(onClose, { priority: ESCAPE_PRIORITY.surface });

    return (
        <Portal>
            <div ref={ref} {...anchored.getFloatingProps()} className="infobox" data-testid="infobox">
                <header {...drag.getHandleProps()} className="infobox-bar" data-testid="infobox-handle">
                    <span>{`Info · ${Math.round(point.x)}, ${Math.round(point.y)}`}</span>
                    <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
                </header>
                <div className="infobox-body">
                    {cards.map((label) => (
                        <SwipeCard key={label} label={label} onDismiss={() => setCards((list) => list.filter((item) => item !== label))} />
                    ))}
                    {cards.length === 0 && <p>Sin tarjetas.</p>}
                </div>
                <span className="infobox-arrow" data-placement={anchored.placement} style={{ left: anchored.arrow }} />
            </div>
        </Portal>
    );
}
