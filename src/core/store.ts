import { createEscapeStack, type EscapeStack } from './escape.js';
import { DOCK_DEFAULTS } from './layout.js';
import { DEFAULT_PERSIST_FIELDS, pickPersisted, readPersisted, writePersisted } from './persistence.js';
import { buildSnapshot, isPanelVisible, type PanelRecord } from './snapshot.js';
import type {
    DockPolicy,
    Edge,
    GroupMode,
    Interaction,
    ManagerOptions,
    PanelEvent,
    PersistedPanel,
    Rect,
    Size,
    Snapshot,
    SnapPreview,
    UpdateOptions,
} from './types.js';

export const DEFAULT_BANDS: Readonly<Record<string, number>> = {
    overlay: 5,
    docked: 20,
    floating: 30,
    menu: 50,
    modal: 60,
};

export const DEFAULT_GROUP = 'default';

export const DEFAULT_KEEP_VISIBLE: Size = { width: 120, height: 48 };

export interface Store {
    options: ManagerOptions;
    records: Map<string, PanelRecord>;
    listeners: Set<() => void>;
    escape: EscapeStack;
    stored: Record<string, Partial<PersistedPanel>>;
    order: string[];
    active: Record<string, string | null>;
    viewport: Size;
    snap: SnapPreview | null;
    obstacles: Record<string, Rect>;
    groupOrder: Record<string, readonly string[]>;
    interaction: Interaction | null;
    snapshot: Snapshot;
    seq: number;
    keepVisible: Size;
    groupMode: (group: string) => GroupMode;
    edgePolicy: (edge: Edge) => DockPolicy;
    isVisible: (id: string) => boolean;
    commit: (events?: PanelEvent[], options?: UpdateOptions) => void;
    refresh: () => void;
    event: (record: PanelRecord, id: string, type: PanelEvent['type'], extra?: Partial<PanelEvent>) => PanelEvent;
    update: (id: string, patch: Partial<PersistedPanel>) => PanelRecord | null;
    bringToFront: (id: string, record: PanelRecord) => boolean;
    lastOpenInGroup: (group: string, except: string) => string | null;
}

export function createStore(options: ManagerOptions): Store {
    const persist = options.persist;
    const fields = persist?.fields ?? DEFAULT_PERSIST_FIELDS;

    const store: Store = {
        options,
        records: new Map(),
        listeners: new Set(),
        escape: createEscapeStack(),
        stored: persist ? { ...readPersisted(persist) } : {},
        order: [],
        active: {},
        viewport: { width: 0, height: 0 },
        snap: null,
        obstacles: {},
        groupOrder: {},
        interaction: null,
        snapshot: null as unknown as Snapshot,
        seq: 0,
        keepVisible: options.keepVisible ?? DEFAULT_KEEP_VISIBLE,
        groupMode: (group) => options.groups?.[group]?.mode ?? 'free',
        edgePolicy: (edge) => options.edges?.[edge]?.policy ?? 'replace',
        isVisible: (id) => isPanelVisible(store, id),
        commit: (events = [], commitOptions = {}) => {
            store.snapshot = build(store);
            if (commitOptions.transient) {
                notify(store);
                return;
            }
            save(store);
            notify(store);
            for (const event of events) {
                options.onEvent?.(event);
            }
            if (store.snapshot.area !== notifiedArea) {
                notifiedArea = store.snapshot.area;
                options.onAreaChange?.(notifiedArea);
            }
        },
        refresh: () => {
            store.snapshot = build(store);
        },
        event: (record, id, type, extra = {}) => ({ type, id, group: record.group, ...extra }),
        update: (id, patch) => {
            const record = store.records.get(id);
            if (!record) {
                return null;
            }
            record.state = { ...record.state, ...patch };
            return record;
        },
        bringToFront: (id, record) => {
            const changed = store.order[store.order.length - 1] !== id || store.active[record.group] !== id;
            store.order = [...store.order.filter((other) => other !== id), id];
            if (store.groupMode(record.group) === 'single' || record.state.open) {
                store.active = { ...store.active, [record.group]: id };
            }
            store.escape.raise(id);
            return changed;
        },
        lastOpenInGroup: (group, except) => {
            for (let i = store.order.length - 1; i >= 0; i -= 1) {
                const id = store.order[i];
                const record = id ? store.records.get(id) : undefined;
                if (id && id !== except && record?.group === group && record.state.open) {
                    return id;
                }
            }
            return null;
        },
    };

    const save = (target: Store): void => {
        if (!persist) {
            return;
        }
        for (const [id, record] of target.records) {
            if (record.config.persist !== false) {
                target.stored[id] = pickPersisted(record.state, fields);
            }
        }
        writePersisted(persist, target.stored);
    };

    store.snapshot = build(store, true);
    let notifiedArea = store.snapshot.area;
    return store;
}

function build(store: Store, initial = false): Snapshot {
    return buildSnapshot({
        records: store.records,
        order: store.order,
        active: store.active,
        bands: store.options.bands ?? DEFAULT_BANDS,
        groupMode: store.groupMode,
        edgePolicy: store.edgePolicy,
        dockedBand: store.options.dockedBand ?? 'docked',
        defaultDockRatio: store.options.defaultDockRatio ?? DOCK_DEFAULTS.ratio,
        viewport: store.viewport,
        snap: store.snap,
        obstacles: store.obstacles,
        compactBreakpoint: store.options.compactBreakpoint ?? 768,
        sheetRatio: store.options.sheetRatio ?? 0.85,
        groupOrder: store.groupOrder,
        interaction: store.interaction,
        previous: initial ? null : store.snapshot,
    });
}

function notify(store: Store): void {
    for (const listener of store.listeners) {
        listener();
    }
}
