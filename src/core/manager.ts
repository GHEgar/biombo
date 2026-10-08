import { ESCAPE_PRIORITY, type EscapeStack } from './escape.js';
import { createGeometryActions, placeOnOpen, type GeometryActions } from './geometry.js';
import { createOrderActions, type OrderActions } from './order.js';
import type { PanelRecord } from './snapshot.js';
import { createStore, DEFAULT_BANDS, DEFAULT_GROUP } from './store.js';
import type { Focusable, ManagerOptions, PanelConfig, PanelEvent, PanelState, PersistedPanel, Snapshot } from './types.js';

export { DEFAULT_BANDS, DEFAULT_GROUP };

const CLOSED: PersistedPanel = {
    open: false,
    minimized: false,
    maximized: false,
    dock: null,
    dockSize: null,
    rect: null,
};

export interface Manager extends GeometryActions, OrderActions {
    register: (id: string, config?: PanelConfig) => () => void;
    getSnapshot: () => Snapshot;
    getPanel: (id: string) => PanelState | null;
    getConfig: (id: string) => PanelConfig | null;
    subscribe: (listener: () => void) => () => void;
    open: (id: string, trigger?: Focusable | null) => void;
    close: (id: string) => void;
    toggle: (id: string, trigger?: Focusable | null) => void;
    focus: (id: string) => void;
    minimize: (id: string, value?: boolean) => void;
    maximize: (id: string, value?: boolean) => void;
    cycle: (direction?: 1 | -1) => string | null;
    escape: EscapeStack;
}

export function createManager(options: ManagerOptions = {}): Manager {
    const store = createStore(options);
    const geometry = createGeometryActions(store);
    const ordering = createOrderActions(store);
    const { records } = store;

    const register = (id: string, config: PanelConfig = {}): (() => void) => {
        const previous = records.get(id);
        previous?.releaseEscape?.();
        const persisted = config.persist === false ? {} : store.stored[id] ?? {};
        const record: PanelRecord = {
            config,
            group: config.group ?? DEFAULT_GROUP,
            band: config.band ?? options.defaultBand ?? 'floating',
            state: previous?.state ?? { ...CLOSED, ...config.initial, ...persisted },
            trigger: previous?.trigger ?? null,
            releaseEscape: null,
            dockSeq: previous?.dockSeq ?? (store.seq += 1),
        };
        if (config.closeOnEscape !== false) {
            record.releaseEscape = store.escape.push({
                id,
                priority: config.escapePriority ?? ESCAPE_PRIORITY.surface,
                enabled: () => store.snapshot.panels[id]?.visible ?? false,
                onEscape: () => close(id),
            });
        }
        records.set(id, record);
        if (!store.order.includes(id)) {
            store.order = [...store.order, id];
        }
        if (record.state.open && !store.active[record.group]) {
            store.active = { ...store.active, [record.group]: id };
        }
        store.commit();
        return () => {
            if (records.get(id) !== record) {
                return;
            }
            record.releaseEscape?.();
            records.delete(id);
            store.order = store.order.filter((other) => other !== id);
            if (store.active[record.group] === id) {
                store.active = { ...store.active, [record.group]: store.lastOpenInGroup(record.group, id) };
            }
            store.commit();
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
        if (!wasOpen) {
            placeOnOpen(store, record);
        }
        store.update(id, { open: true, minimized: false });
        store.bringToFront(id, record);
        const events: PanelEvent[] = [];
        if (!wasOpen) {
            events.push(store.event(record, id, 'open'));
        } else if (wasMinimized) {
            events.push(store.event(record, id, 'restore'));
        }
        store.commit(events);
    };

    const close = (id: string): void => {
        const record = records.get(id);
        if (!record || !record.state.open) {
            return;
        }
        store.update(id, { open: false, minimized: false, maximized: false });
        if (store.active[record.group] === id) {
            store.active = { ...store.active, [record.group]: store.lastOpenInGroup(record.group, id) };
        }
        const trigger = record.trigger;
        record.trigger = null;
        store.commit([store.event(record, id, 'close')]);
        trigger?.focus();
    };

    const toggle = (id: string, trigger: Focusable | null = null): void => {
        if (store.snapshot.panels[id]?.visible) {
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
        const wasVisible = store.snapshot.panels[id]?.visible ?? false;
        if (store.bringToFront(id, record) || !wasVisible) {
            store.commit([store.event(record, id, 'focus')]);
        }
    };

    const minimize = (id: string, value = true): void => {
        const record = records.get(id);
        if (!record || !record.state.open || record.state.minimized === value || record.config.minimizable === false) {
            return;
        }
        store.update(id, { minimized: value });
        if (!value) {
            store.bringToFront(id, record);
        }
        store.commit([store.event(record, id, value ? 'minimize' : 'restore')]);
    };

    const maximize = (id: string, value = true): void => {
        const record = records.get(id);
        if (!record || !record.state.open || record.state.maximized === value) {
            return;
        }
        store.update(id, { maximized: value });
        store.commit([store.event(record, id, value ? 'maximize' : 'unmaximize')]);
    };

    const cycle = (direction: 1 | -1 = 1): string | null => {
        const visible = [...records.keys()].filter((id) => store.snapshot.panels[id]?.visible);
        if (visible.length === 0) {
            return null;
        }
        const current = visible.findIndex((id) => store.snapshot.panels[id]?.topmost);
        const next = visible[(current + direction + visible.length) % visible.length] ?? null;
        if (next) {
            focus(next);
        }
        return next;
    };

    return {
        ...geometry,
        ...ordering,
        cycle,
        register,
        getSnapshot: () => store.snapshot,
        getPanel: (id) => store.snapshot.panels[id] ?? null,
        getConfig: (id) => records.get(id)?.config ?? null,
        subscribe: (listener) => {
            store.listeners.add(listener);
            return () => store.listeners.delete(listener);
        },
        open,
        close,
        toggle,
        focus,
        minimize,
        maximize,
        escape: store.escape,
    };
}
