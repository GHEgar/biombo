import type { Store } from './store.js';
import type { Edge, PersistedPanel } from './types.js';

export interface OrderActions {
    setGroupOrder: (group: string, ids: readonly string[]) => void;
    setEdgeOrder: (edge: Edge, ids: readonly string[]) => void;
    serialize: () => Record<string, PersistedPanel>;
    hydrate: (panels: Readonly<Record<string, Partial<PersistedPanel>>>) => void;
}

const sameIds = (a: readonly string[] | undefined, b: readonly string[]): boolean => !!a
    && a.length === b.length && a.every((id, i) => id === b[i]);

export function createOrderActions(store: Store): OrderActions {
    const setGroupOrder = (group: string, ids: readonly string[]): void => {
        if (sameIds(store.groupOrder[group], ids)) {
            return;
        }
        store.groupOrder = { ...store.groupOrder, [group]: [...ids] };
        const first = ids.map((id) => store.records.get(id)).find((record) => record?.group === group);
        const events = first ? [{ type: 'reorder' as const, id: ids[0] ?? '', group, ids: [...ids] }] : [];
        store.commit(events);
    };

    const setEdgeOrder = (edge: Edge, ids: readonly string[]): void => {
        const docked = ids.filter((id) => store.records.get(id)?.state.dock === edge);
        if (docked.length === 0) {
            return;
        }
        for (const id of docked) {
            const record = store.records.get(id);
            if (record) {
                store.seq += 1;
                record.dockSeq = store.seq;
            }
        }
        const first = store.records.get(docked[0] ?? '');
        store.commit(first ? [store.event(first, docked[0] ?? '', 'reorder', { dock: edge, ids: docked })] : []);
    };

    const serialize = (): Record<string, PersistedPanel> => {
        const out: Record<string, PersistedPanel> = {};
        for (const [id, record] of store.records) {
            out[id] = { ...record.state };
        }
        return out;
    };

    const hydrate = (panels: Readonly<Record<string, Partial<PersistedPanel>>>): void => {
        for (const [id, patch] of Object.entries(panels)) {
            const record = store.records.get(id);
            if (record) {
                record.state = { ...record.state, ...patch };
                if (record.state.open && !store.order.includes(id)) {
                    store.order = [...store.order, id];
                }
                if (record.state.open && !store.active[record.group]) {
                    store.active = { ...store.active, [record.group]: id };
                }
            } else {
                store.stored[id] = { ...store.stored[id], ...patch };
            }
        }
        store.commit();
    };

    return { setGroupOrder, setEdgeOrder, serialize, hydrate };
}
