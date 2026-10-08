import { createEscapeStack, ESCAPE_PRIORITY, type EscapeStack } from './escape.js';
import { DEFAULT_PERSIST_FIELDS, pickPersisted, readPersisted, writePersisted } from './persistence.js';
import { buildSnapshot, isPanelVisible, type PanelRecord, type SnapshotInput } from './snapshot.js';
import type {
    Edge,
    Focusable,
    GroupMode,
    ManagerOptions,
    PanelConfig,
    PanelEvent,
    PanelState,
    PersistedPanel,
    Rect,
    Snapshot,
} from './types.js';

export const DEFAULT_BANDS: Readonly<Record<string, number>> = {
    overlay: 5,
    docked: 20,
    floating: 30,
    menu: 50,
    modal: 60,
};

export const DEFAULT_GROUP = 'default';

const CLOSED: PersistedPanel = {
    open: false,
    minimized: false,
    maximized: false,
    dock: null,
    dockSize: null,
    rect: null,
};

export interface Manager {
    register: (id: string, config?: PanelConfig) => () => void;
    getSnapshot: () => Snapshot;
    getPanel: (id: string) => PanelState | null;
    subscribe: (listener: () => void) => () => void;
    open: (id: string, trigger?: Focusable | null) => void;
    close: (id: string) => void;
    toggle: (id: string, trigger?: Focusable | null) => void;
    focus: (id: string) => void;
    minimize: (id: string, value?: boolean) => void;
    maximize: (id: string, value?: boolean) => void;
    dock: (id: string, edge: Edge | null) => void;
    setDockSize: (id: string, size: number | null) => void;
    setRect: (id: string, rect: Rect | null) => void;
    escape: EscapeStack;
}

const EMPTY: Snapshot = { panels: {}, order: [], active: {} };

export function createManager(options: ManagerOptions = {}): Manager {
    const bands = options.bands ?? DEFAULT_BANDS;
    const defaultBand = options.defaultBand ?? 'floating';
    const records = new Map<string, PanelRecord>();
    const listeners = new Set<() => void>();
    const escape = createEscapeStack();
    const persist = options.persist;
    const fields = persist?.fields ?? DEFAULT_PERSIST_FIELDS;
    const stored = persist ? { ...readPersisted(persist) } : {};
    let order: string[] = [];
    let active: Record<string, string | null> = {};
    let snapshot: Snapshot = EMPTY;

    const groupMode = (group: string): GroupMode => options.groups?.[group]?.mode ?? 'free';

    const input = (): SnapshotInput => ({ records, order, active, bands, groupMode });

    const isVisible = (id: string): boolean => isPanelVisible(input(), id);

    const save = (): void => {
        if (!persist) {
            return;
        }
        for (const [id, record] of records) {
            if (record.config.persist !== false) {
                stored[id] = pickPersisted(record.state, fields);
            }
        }
        writePersisted(persist, stored);
    };

    const commit = (events: PanelEvent[] = []): void => {
        snapshot = buildSnapshot(input());
        save();
        for (const listener of listeners) {
            listener();
        }
        for (const event of events) {
            options.onEvent?.(event);
        }
    };

    const event = (record: PanelRecord, id: string, type: PanelEvent['type'], extra: Partial<PanelEvent> = {}): PanelEvent => ({
        type,
        id,
        group: record.group,
        ...extra,
    });

    const lastOpenInGroup = (group: string, except: string): string | null => {
        for (let i = order.length - 1; i >= 0; i -= 1) {
            const id = order[i];
            const record = id ? records.get(id) : undefined;
            if (id && id !== except && record?.group === group && record.state.open) {
                return id;
            }
        }
        return null;
    };

    const bringToFront = (id: string, record: PanelRecord): boolean => {
        const changed = order[order.length - 1] !== id || active[record.group] !== id;
        order = [...order.filter((other) => other !== id), id];
        if (groupMode(record.group) === 'single' || record.state.open) {
            active = { ...active, [record.group]: id };
        }
        escape.raise(id);
        return changed;
    };

    const update = (id: string, patch: Partial<PersistedPanel>): PanelRecord | null => {
        const record = records.get(id);
        if (!record) {
            return null;
        }
        record.state = { ...record.state, ...patch };
        return record;
    };

    const register = (id: string, config: PanelConfig = {}): (() => void) => {
        const previous = records.get(id);
        previous?.releaseEscape?.();
        const persisted = config.persist === false ? {} : stored[id] ?? {};
        const record: PanelRecord = {
            config,
            group: config.group ?? DEFAULT_GROUP,
            band: config.band ?? defaultBand,
            state: previous?.state ?? { ...CLOSED, ...config.initial, ...persisted },
            trigger: previous?.trigger ?? null,
            releaseEscape: null,
        };
        if (config.closeOnEscape !== false) {
            record.releaseEscape = escape.push({
                id,
                priority: config.escapePriority ?? ESCAPE_PRIORITY.surface,
                enabled: () => isVisible(id),
                onEscape: () => close(id),
            });
        }
        records.set(id, record);
        if (!order.includes(id)) {
            order = [...order, id];
        }
        if (record.state.open && !active[record.group]) {
            active = { ...active, [record.group]: id };
        }
        commit();
        return () => {
            if (records.get(id) !== record) {
                return;
            }
            record.releaseEscape?.();
            records.delete(id);
            order = order.filter((other) => other !== id);
            if (active[record.group] === id) {
                active = { ...active, [record.group]: lastOpenInGroup(record.group, id) };
            }
            commit();
        };
    };

    const open = (id: string, trigger: Focusable | null = null): void => {
        const record = records.get(id);
        if (!record) {
            return;
        }
        const wasOpen = record.state.open;
        const wasMinimized = record.state.minimized;
        if (trigger) {
            record.trigger = trigger;
        }
        update(id, { open: true, minimized: false });
        bringToFront(id, record);
        const events: PanelEvent[] = [];
        if (!wasOpen) {
            events.push(event(record, id, 'open'));
        } else if (wasMinimized) {
            events.push(event(record, id, 'restore'));
        }
        commit(events);
    };

    const close = (id: string): void => {
        const record = records.get(id);
        if (!record || !record.state.open) {
            return;
        }
        update(id, { open: false, minimized: false, maximized: false });
        if (active[record.group] === id) {
            active = { ...active, [record.group]: lastOpenInGroup(record.group, id) };
        }
        const trigger = record.trigger;
        record.trigger = null;
        commit([event(record, id, 'close')]);
        trigger?.focus();
    };

    const toggle = (id: string, trigger: Focusable | null = null): void => {
        if (isVisible(id)) {
            close(id);
        } else {
            open(id, trigger);
        }
    };

    const focus = (id: string): void => {
        const record = records.get(id);
        if (!record || !record.state.open) {
            return;
        }
        const wasVisible = isVisible(id);
        if (bringToFront(id, record) || !wasVisible) {
            commit([event(record, id, 'focus')]);
        }
    };

    const minimize = (id: string, value = true): void => {
        const record = records.get(id);
        if (!record || !record.state.open || record.state.minimized === value || record.config.minimizable === false) {
            return;
        }
        update(id, { minimized: value });
        if (!value) {
            bringToFront(id, record);
        }
        commit([event(record, id, value ? 'minimize' : 'restore')]);
    };

    const maximize = (id: string, value = true): void => {
        const record = records.get(id);
        if (!record || !record.state.open || record.state.maximized === value) {
            return;
        }
        update(id, { maximized: value });
        commit([event(record, id, value ? 'maximize' : 'unmaximize')]);
    };

    const dock = (id: string, edge: Edge | null): void => {
        const record = records.get(id);
        if (!record || record.state.dock === edge) {
            return;
        }
        const allowed = record.config.dockable;
        if (edge && allowed && !allowed.includes(edge)) {
            return;
        }
        update(id, { dock: edge });
        commit([event(record, id, edge ? 'dock' : 'undock', { dock: edge })]);
    };

    const setDockSize = (id: string, size: number | null): void => {
        const record = records.get(id);
        if (!record || record.state.dockSize === size) {
            return;
        }
        update(id, { dockSize: size });
        commit([event(record, id, 'resize', { size })]);
    };

    const setRect = (id: string, rect: Rect | null): void => {
        const record = records.get(id);
        if (!record) {
            return;
        }
        update(id, { rect });
        commit([event(record, id, 'move', { rect })]);
    };

    return {
        register,
        getSnapshot: () => snapshot,
        getPanel: (id) => snapshot.panels[id] ?? null,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        open,
        close,
        toggle,
        focus,
        minimize,
        maximize,
        dock,
        setDockSize,
        setRect,
        escape,
    };
}
