import { axisLength, centerRect, clampDockSize, clampRect, DOCK_DEFAULTS, dockPreviewRect, resolveDockSize, sameRect, snapEdge } from './layout.js';
import type { PanelRecord } from './snapshot.js';
import type { Store } from './store.js';
import type { Edge, Interaction, PanelEvent, Rect, Size, SnapPreview, UpdateOptions } from './types.js';

export interface GeometryActions {
    dock: (id: string, edge: Edge | null) => void;
    setDockSize: (id: string, size: number | null, options?: UpdateOptions) => void;
    setRect: (id: string, rect: Rect | null, options?: UpdateOptions) => void;
    setViewport: (size: Size) => void;
    setSnap: (preview: SnapPreview | null) => void;
    clampRect: (rect: Rect) => Rect;
    snapAt: (id: string, point: Point) => SnapPreview | null;
    undockAt: (id: string, point: Point, grab: Point) => Rect | null;
    setObstacle: (key: string, rect: Rect | null) => void;
    setInteraction: (interaction: Interaction | null) => void;
}

export interface Point {
    x: number;
    y: number;
}

const hasSize = (size: Size): boolean => size.width > 0 && size.height > 0;

function clampSize(store: Store, record: PanelRecord, size: number): number {
    const edge = record.state.dock;
    if (!edge || !hasSize(store.viewport)) {
        return Math.round(size);
    }
    return clampDockSize(
        size,
        axisLength(edge, store.viewport),
        record.config.minDockSize ?? DOCK_DEFAULTS.min,
        record.config.maxDockRatio ?? DOCK_DEFAULTS.maxRatio,
    );
}

export function placeOnOpen(store: Store, record: PanelRecord): void {
    const size = record.config.defaultSize;
    if (record.state.dock || record.state.rect || !size || !hasSize(store.viewport)) {
        return;
    }
    const floating = [...store.records.values()]
        .filter((other) => other !== record && other.state.open && !other.state.dock && !other.state.minimized).length;
    record.state = {
        ...record.state,
        rect: clampRect(
            centerRect(size, store.snapshot.area, store.viewport, floating, store.options.cascade ?? 26),
            store.viewport,
            store.keepVisible,
        ),
    };
}

export function createGeometryActions(store: Store): GeometryActions {
    const dock = (id: string, edge: Edge | null): void => {
        const record = store.records.get(id);
        if (!record || record.state.dock === edge) {
            return;
        }
        const allowed = record.config.dockable;
        if (edge && allowed && !allowed.includes(edge)) {
            return;
        }
        const events: PanelEvent[] = [];
        if (edge && store.edgePolicy(edge) === 'replace') {
            for (const [otherId, other] of store.records) {
                if (otherId !== id && other.state.dock === edge) {
                    other.state = { ...other.state, dock: null };
                    events.push(store.event(other, otherId, 'undock', { dock: null }));
                }
            }
        }
        store.seq += 1;
        record.dockSeq = store.seq;
        store.update(id, { dock: edge, maximized: false });
        if (record.state.open) {
            store.bringToFront(id, record);
        }
        events.unshift(store.event(record, id, edge ? 'dock' : 'undock', { dock: edge }));
        store.commit(events);
    };

    const setDockSize = (id: string, size: number | null, options: UpdateOptions = {}): void => {
        const record = store.records.get(id);
        if (!record) {
            return;
        }
        const next = size === null ? null : clampSize(store, record, size);
        if (record.state.dockSize === next && !options.transient) {
            store.commit([store.event(record, id, 'resize', { size: next })]);
            return;
        }
        store.update(id, { dockSize: next });
        store.commit([store.event(record, id, 'resize', { size: next })], options);
    };

    const setRect = (id: string, rect: Rect | null, options: UpdateOptions = {}): void => {
        const record = store.records.get(id);
        if (!record) {
            return;
        }
        const next = rect && hasSize(store.viewport) ? clampRect(rect, store.viewport, store.keepVisible) : rect;
        store.update(id, { rect: next });
        store.commit([store.event(record, id, 'move', { rect: next })], options);
    };

    const setViewport = (size: Size): void => {
        if (size.width === store.viewport.width && size.height === store.viewport.height) {
            return;
        }
        store.viewport = { width: size.width, height: size.height };
        for (const record of store.records.values()) {
            if (record.state.open) {
                placeOnOpen(store, record);
            }
            const rect = record.state.rect;
            const clamped = rect ? clampRect(rect, store.viewport, store.keepVisible) : null;
            const dockSize = record.state.dockSize === null ? null : clampSize(store, record, record.state.dockSize);
            if (!sameRect(rect, clamped) || dockSize !== record.state.dockSize) {
                record.state = { ...record.state, rect: clamped, dockSize };
            }
        }
        store.commit();
    };

    const setSnap = (preview: SnapPreview | null): void => {
        const current = store.snap;
        if (current === preview || (current && preview && current.id === preview.id && current.edge === preview.edge && sameRect(current.rect, preview.rect))) {
            return;
        }
        store.snap = preview;
        store.commit([], { transient: true });
    };

    const snapAt = (id: string, point: Point): SnapPreview | null => {
        const record = store.records.get(id);
        if (!record || record.config.snap === 'button' || !hasSize(store.viewport) || store.snapshot.compact) {
            return null;
        }
        const edge = snapEdge(point, store.viewport, store.options.snapThreshold ?? 48, record.config.dockable ?? []);
        if (!edge) {
            return null;
        }
        const size = resolveDockSize(
            record.state.dockSize,
            axisLength(edge, store.viewport),
            store.options.defaultDockRatio ?? DOCK_DEFAULTS.ratio,
            record.config.minDockSize ?? DOCK_DEFAULTS.min,
            record.config.maxDockRatio ?? DOCK_DEFAULTS.maxRatio,
        );
        return { id, edge, rect: dockPreviewRect(edge, size, store.snapshot.area, store.viewport) };
    };

    const undockAt = (id: string, point: Point, grab: Point): Rect | null => {
        const record = store.records.get(id);
        const layout = store.snapshot.panels[id]?.layout;
        if (!record || !record.state.dock || !layout || store.snapshot.compact) {
            return null;
        }
        const previous = record.state.rect;
        const size = previous
            ? { width: previous.width, height: previous.height }
            : record.config.defaultSize ?? {
                width: Math.min(layout.width, store.viewport.width / 2),
                height: Math.min(layout.height, store.viewport.height / 2),
            };
        const rect = clampRect({
            x: point.x - size.width * grab.x,
            y: point.y - Math.min(grab.y, size.height),
            width: size.width,
            height: size.height,
        }, store.viewport, store.keepVisible);
        store.update(id, { dock: null, rect });
        store.commit([store.event(record, id, 'undock', { dock: null })]);
        return rect;
    };

    const setObstacle = (key: string, rect: Rect | null): void => {
        const current = store.obstacles[key] ?? null;
        if (sameRect(current, rect)) {
            return;
        }
        const next = Object.fromEntries(Object.entries(store.obstacles).filter(([other]) => other !== key));
        if (rect) {
            next[key] = rect;
        }
        store.obstacles = next;
        store.commit([], { transient: true });
    };

    const setInteraction = (interaction: Interaction | null): void => {
        const current = store.interaction;
        if (current === interaction || (current && interaction && current.id === interaction.id && current.kind === interaction.kind)) {
            return;
        }
        store.interaction = interaction;
        store.commit([], { transient: true });
    };

    return {
        setInteraction,
        setObstacle,
        dock,
        setDockSize,
        setRect,
        setViewport,
        setSnap,
        clampRect: (rect) => (hasSize(store.viewport) ? clampRect(rect, store.viewport, store.keepVisible) : rect),
        snapAt,
        undockAt,
    };
}
