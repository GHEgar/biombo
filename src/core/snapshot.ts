import type { Focusable, GroupMode, PanelConfig, PanelState, PersistedPanel, Snapshot } from './types.js';

export interface PanelRecord {
    config: PanelConfig;
    group: string;
    band: string;
    state: PersistedPanel;
    trigger: Focusable | null;
    releaseEscape: (() => void) | null;
}

export interface SnapshotInput {
    records: ReadonlyMap<string, PanelRecord>;
    order: readonly string[];
    active: Readonly<Record<string, string | null>>;
    bands: Readonly<Record<string, number>>;
    groupMode: (group: string) => GroupMode;
}

export function isPanelVisible(input: SnapshotInput, id: string): boolean {
    const record = input.records.get(id);
    if (!record || !record.state.open || record.state.minimized) {
        return false;
    }
    return input.groupMode(record.group) === 'free' || input.active[record.group] === id;
}

export function buildSnapshot(input: SnapshotInput): Snapshot {
    const panels: Record<string, PanelState> = {};
    const rankByBand = new Map<string, number>();
    let topmost: string | null = null;
    let topZ = -Infinity;
    for (const id of input.order) {
        const record = input.records.get(id);
        if (!record) {
            continue;
        }
        const visible = isPanelVisible(input, id);
        const rank = rankByBand.get(record.band) ?? 0;
        if (visible) {
            rankByBand.set(record.band, rank + 1);
        }
        const zIndex = (input.bands[record.band] ?? 0) + rank;
        if (visible && zIndex >= topZ) {
            topZ = zIndex;
            topmost = id;
        }
        panels[id] = {
            ...record.state,
            id,
            group: record.group,
            band: record.band,
            visible,
            active: input.active[record.group] === id,
            topmost: false,
            zIndex,
        };
    }
    const top = topmost ? panels[topmost] : undefined;
    if (top) {
        panels[top.id] = { ...top, topmost: true };
    }
    return { panels, order: [...input.order], active: { ...input.active } };
}
