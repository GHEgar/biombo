import type { PointerEvent as ReactPointerEvent } from 'react';
import { isVertical, resizeRect } from '../core/layout.js';
import type { Manager } from '../core/manager.js';
import type { Edge, Rect, ResizeDirection, Size } from '../core/types.js';
import { applyRect, capture, createFrame, measure, trackPointer } from './pointer.js';

export const DRAG_THRESHOLD = 4;
export const UNDOCK_THRESHOLD = 24;
export const DEFAULT_MIN_SIZE: Size = { width: 160, height: 80 };

const NO_DRAG = 'a, button, input, select, textarea, [contenteditable], [data-biombo-nodrag]';

export interface InteractionContext {
    manager: Manager;
    id: string;
    getElement: () => HTMLElement | null;
}

const isBlocked = (event: ReactPointerEvent<HTMLElement>): boolean => {
    const handle = event.currentTarget;
    const target = event.target instanceof Element ? event.target.closest(NO_DRAG) : null;
    return !!target && target !== handle && handle.contains(target);
};

export function startDrag(context: InteractionContext, event: ReactPointerEvent<HTMLElement>): void {
    const { manager, id, getElement } = context;
    const panel = manager.getPanel(id);
    const config = manager.getConfig(id) ?? {};
    if (event.button !== 0 || !panel?.visible || panel.maximized || manager.getSnapshot().compact || isBlocked(event)) {
        return;
    }
    const undock = config.undockOnDrag ?? true;
    if (panel.dock && undock === false) {
        return;
    }
    manager.focus(id);
    const handle = event.currentTarget;
    const start = { x: event.clientX, y: event.clientY };
    const threshold = panel.dock ? (typeof undock === 'number' ? undock : UNDOCK_THRESHOLD) : DRAG_THRESHOLD;
    const frame = createFrame();
    let base: Rect | null = panel.dock ? null : panel.layout ?? measure(getElement());
    let origin = start;
    let current = base;
    let started = false;

    trackPointer(handle, event.pointerId, {
        move: (moveEvent) => {
            const point = { x: moveEvent.clientX, y: moveEvent.clientY };
            if (!started) {
                if (Math.hypot(point.x - start.x, point.y - start.y) < threshold) {
                    return;
                }
                started = true;
                capture(handle, moveEvent.pointerId);
                manager.setInteraction({ id, kind: 'drag' });
                if (panel.dock && panel.layout) {
                    const grab = {
                        x: (start.x - panel.layout.x) / Math.max(1, panel.layout.width),
                        y: start.y - panel.layout.y,
                    };
                    base = manager.undockAt(id, point, grab);
                    current = base;
                    origin = point;
                    return;
                }
            }
            if (!base) {
                return;
            }
            moveEvent.preventDefault();
            const next = manager.clampRect({ ...base, x: base.x + point.x - origin.x, y: base.y + point.y - origin.y });
            current = next;
            frame.run(() => applyRect(getElement(), next));
            manager.setSnap(manager.snapAt(id, point));
        },
        end: (_endEvent, cancelled) => {
            frame.flush();
            const preview = manager.getSnapshot().snap;
            manager.setSnap(null);
            manager.setInteraction(null);
            if (!started || !current) {
                return;
            }
            manager.setRect(id, current);
            if (!cancelled && preview?.id === id) {
                manager.dock(id, preview.edge);
            }
        },
    });
}

const dockDelta = (edge: Edge, dx: number, dy: number): number => {
    if (edge === 'bottom') {
        return -dy;
    }
    if (edge === 'top') {
        return dy;
    }
    return edge === 'left' ? dx : -dx;
};

export function startResize(context: InteractionContext, event: ReactPointerEvent<HTMLElement>, direction?: ResizeDirection): void {
    const { manager, id, getElement } = context;
    const panel = manager.getPanel(id);
    if (event.button !== 0 || !panel?.visible || manager.getSnapshot().compact) {
        return;
    }
    const element = event.currentTarget;
    const start = { x: event.clientX, y: event.clientY };
    const frame = createFrame();
    const edge = panel.dock && panel.layout ? panel.dock : null;
    manager.focus(id);
    capture(element, event.pointerId);
    event.preventDefault();
    manager.setInteraction({ id, kind: 'resize' });

    if (edge && panel.layout) {
        const initial = isVertical(edge) ? panel.layout.height : panel.layout.width;
        let size = initial;
        trackPointer(element, event.pointerId, {
            move: (moveEvent) => {
                size = initial + dockDelta(edge, moveEvent.clientX - start.x, moveEvent.clientY - start.y);
                frame.run(() => manager.setDockSize(id, size, { transient: true }));
            },
            end: () => {
                frame.flush();
                manager.setInteraction(null);
                manager.setDockSize(id, size);
            },
        });
        return;
    }

    const base = panel.layout ?? measure(getElement());
    if (!base || !direction) {
        manager.setInteraction(null);
        return;
    }
    const min = manager.getConfig(id)?.minSize ?? DEFAULT_MIN_SIZE;
    let current = base;
    trackPointer(element, event.pointerId, {
        move: (moveEvent) => {
            const next = resizeRect(base, direction, moveEvent.clientX - start.x, moveEvent.clientY - start.y, min);
            current = next;
            frame.run(() => applyRect(getElement(), next, true));
        },
        end: () => {
            frame.flush();
            manager.setInteraction(null);
            manager.setRect(id, current);
        },
    });
}
