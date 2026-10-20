import { areaRect, axisLength, DOCK_DEFAULTS, EDGES, layoutDocks, resolveDockSize, sameArea, sameRect, ZERO_AREA, type DockItem } from './layout.js';
import type {
    AnchoredRect,
    Area,
    Corner,
    DockPolicy,
    Edge,
    EdgeState,
    Focusable,
    GroupMode,
    GroupState,
    Interaction,
    PanelConfig,
    PanelState,
    PersistedPanel,
    Presentation,
    Rect,
    Size,
    Snapshot,
    SnapPreview,
} from './types.js';

export interface PanelRecord {
    config: PanelConfig;
    group: string;
    band: string;
    state: PersistedPanel;
    trigger: Focusable | null;
    releaseEscape: (() => void) | null;
    dockSeq: number;
    anchor: AnchoredRect | null;
    corner: Corner | null;
}

export interface SnapshotInput {
    records: ReadonlyMap<string, PanelRecord>;
    order: readonly string[];
    active: Readonly<Record<string, string | null>>;
    bands: Readonly<Record<string, number>>;
    groupMode: (group: string) => GroupMode;
    edgePolicy: (edge: Edge) => DockPolicy;
    dockedBand: string;
    defaultDockRatio: number;
    viewport: Size;
    snap: SnapPreview | null;
    obstacles: Readonly<Record<string, Rect>>;
    compactBreakpoint: number;
    sheetRatio: number;
    groupOrder: Readonly<Record<string, readonly string[]>>;
    interaction: Interaction | null;
    previous: Snapshot | null;
}

interface Placement {
    layout: Rect | null;
    presentation: Presentation;
    tabbed: boolean;
    band: string;
}

interface PlacementContext {
    input: SnapshotInput;
    edges: Record<Edge, EdgeState>;
    visible: Set<string>;
    dockRects: Map<string, Rect>;
    areaRect: Rect | null;
    compact: boolean;
}

export const EMPTY_EDGES: Readonly<Record<Edge, EdgeState>> = {
    top: { policy: 'replace', ids: [], active: null },
    right: { policy: 'replace', ids: [], active: null },
    bottom: { policy: 'replace', ids: [], active: null },
    left: { policy: 'replace', ids: [], active: null },
};

export function isPanelVisible(input: Pick<SnapshotInput, 'records' | 'active' | 'groupMode'>, id: string): boolean {
    const record = input.records.get(id);
    if (!record || !record.state.open || record.state.minimized) {
        return false;
    }
    return input.groupMode(record.group) === 'free' || input.active[record.group] === id;
}

function samePanel(a: PanelState, b: PanelState): boolean {
    return a.open === b.open && a.minimized === b.minimized && a.maximized === b.maximized
        && a.dock === b.dock && a.dockSize === b.dockSize && sameRect(a.rect, b.rect)
        && a.group === b.group && a.band === b.band && a.visible === b.visible && a.active === b.active
        && a.topmost === b.topmost && a.zIndex === b.zIndex && sameRect(a.layout, b.layout) && a.tabbed === b.tabbed
        && a.presentation === b.presentation;
}

function buildEdges(input: SnapshotInput, visible: Set<string>): Record<Edge, EdgeState> {
    const edges = {} as Record<Edge, EdgeState>;
    const focusRank = new Map(input.order.map((id, index) => [id, index]));
    for (const edge of EDGES) {
        const ids = [...input.records.entries()]
            .filter(([, record]) => record.state.dock === edge && record.state.open)
            .sort(([, a], [, b]) => a.dockSeq - b.dockSeq)
            .map(([id]) => id);
        const shown = ids.filter((id) => visible.has(id));
        const latest = shown.reduce<string | null>((best, id) => (
            best === null || (focusRank.get(id) ?? 0) > (focusRank.get(best) ?? 0) ? id : best
        ), null);
        const policy = input.edgePolicy(edge);
        const previous = input.previous?.edges[edge];
        const same = previous && previous.policy === policy && previous.active === latest
            && previous.ids.length === ids.length && previous.ids.every((id, i) => id === ids[i]);
        edges[edge] = same ? previous : { policy, ids, active: latest };
    }
    return edges;
}

function dockItems(input: SnapshotInput, edges: Record<Edge, EdgeState>, visible: Set<string>): DockItem[] {
    const items: DockItem[] = [];
    for (const edge of EDGES) {
        const state = edges[edge];
        const occupants = state.policy === 'stack' ? state.ids.filter((id) => visible.has(id)) : state.active ? [state.active] : [];
        for (const id of occupants) {
            const record = input.records.get(id);
            if (!record || record.state.maximized) {
                continue;
            }
            const length = axisLength(edge, input.viewport);
            const size = resolveDockSize(
                record.state.dockSize,
                length,
                input.defaultDockRatio,
                record.config.minDockSize ?? DOCK_DEFAULTS.min,
                record.config.maxDockRatio ?? DOCK_DEFAULTS.maxRatio,
            );
            items.push({ id, edge, size });
        }
    }
    return items;
}

function compactPlacement(record: PanelRecord, viewport: Size, sheetRatio: number): Pick<Placement, 'layout' | 'presentation'> {
    const mode = record.config.compact ?? 'sheet';
    if (mode === 'inline') {
        return { layout: null, presentation: 'inline' };
    }
    if (mode === 'fullscreen' || record.state.maximized) {
        return { layout: { x: 0, y: 0, width: viewport.width, height: viewport.height }, presentation: 'fullscreen' };
    }
    const height = Math.round(viewport.height * sheetRatio);
    return { layout: { x: 0, y: viewport.height - height, width: viewport.width, height }, presentation: 'sheet' };
}

function place(id: string, record: PanelRecord, context: PlacementContext): Placement {
    const { input, edges, visible, dockRects } = context;
    if (!visible.has(id)) {
        return { layout: null, presentation: 'hidden', tabbed: false, band: record.band };
    }
    if (context.compact) {
        return { ...compactPlacement(record, input.viewport, input.sheetRatio), tabbed: false, band: record.band };
    }
    const edge = record.state.dock ? edges[record.state.dock] : null;
    const tabbed = !!edge && edge.policy !== 'stack' && edge.active !== id && !record.state.maximized;
    if (tabbed) {
        return { layout: null, presentation: 'hidden', tabbed, band: input.dockedBand };
    }
    if (record.state.maximized) {
        return { layout: context.areaRect, presentation: 'maximized', tabbed, band: record.band };
    }
    const dockRect = dockRects.get(id);
    if (dockRect) {
        return { layout: dockRect, presentation: 'docked', tabbed, band: input.dockedBand };
    }
    return { layout: record.state.dock ? null : record.state.rect, presentation: 'floating', tabbed, band: record.band };
}

export function tabOrder(registered: readonly string[], preferred: readonly string[] = []): string[] {
    const known = new Set(registered);
    const head = preferred.filter((id) => known.has(id));
    const placed = new Set(head);
    return [...head, ...registered.filter((id) => !placed.has(id))];
}

function buildGroups(input: SnapshotInput): Record<string, GroupState> {
    const members = new Map<string, string[]>();
    for (const [id, record] of input.records) {
        members.set(record.group, [...members.get(record.group) ?? [], id]);
    }
    const groups: Record<string, GroupState> = {};
    for (const [group, registered] of members) {
        const ids = tabOrder(registered, input.groupOrder[group]).filter((id) => input.records.get(id)?.state.open);
        const active = input.active[group] ?? null;
        const next: GroupState = { mode: input.groupMode(group), ids, active: active && ids.includes(active) ? active : null };
        const previous = input.previous?.groups[group];
        const same = previous && previous.mode === next.mode && previous.active === next.active
            && previous.ids.length === ids.length && previous.ids.every((id, i) => id === ids[i]);
        groups[group] = same ? previous : next;
    }
    return groups;
}

export function buildSnapshot(input: SnapshotInput): Snapshot {
    const visible = new Set(input.order.filter((id) => isPanelVisible(input, id)));
    const edges = buildEdges(input, visible);
    const hasViewport = input.viewport.width > 0 && input.viewport.height > 0;
    const compact = hasViewport && input.viewport.width < input.compactBreakpoint;
    const docked = hasViewport && !compact
        ? layoutDocks(dockItems(input, edges, visible), input.viewport)
        : { area: ZERO_AREA, rects: new Map<string, Rect>() };
    const previousArea = input.previous?.area;
    const area: Area = previousArea && sameArea(previousArea, docked.area) ? previousArea : docked.area;
    const context: PlacementContext = {
        input,
        edges,
        visible,
        dockRects: docked.rects,
        areaRect: hasViewport ? areaRect(area, input.viewport) : null,
        compact,
    };

    const panels: Record<string, PanelState> = {};
    const rankByBand = new Map<string, number>();
    let topmost: string | null = null;
    let topZ = -Infinity;
    for (const id of input.order) {
        const record = input.records.get(id);
        if (!record) {
            continue;
        }
        const { layout, presentation, tabbed, band } = place(id, record, context);
        const shown = presentation !== 'hidden';
        const rank = rankByBand.get(band) ?? 0;
        if (shown) {
            rankByBand.set(band, rank + 1);
        }
        const zIndex = (input.bands[band] ?? 0) + rank;
        if (shown && zIndex >= topZ) {
            topZ = zIndex;
            topmost = id;
        }
        panels[id] = {
            ...record.state,
            id,
            group: record.group,
            band,
            visible: shown,
            active: input.active[record.group] === id,
            topmost: false,
            zIndex,
            layout,
            tabbed,
            presentation,
        };
    }
    for (const [id, panel] of Object.entries(panels)) {
        const next = id === topmost ? { ...panel, topmost: true } : panel;
        const previous = input.previous?.panels[id];
        panels[id] = previous && samePanel(previous, next) ? previous : next;
    }
    return {
        panels,
        order: [...input.order],
        active: { ...input.active },
        viewport: input.viewport,
        area,
        edges,
        snap: input.snap,
        compact,
        obstacles: input.obstacles,
        groups: buildGroups(input),
        interaction: input.interaction,
    };
}
