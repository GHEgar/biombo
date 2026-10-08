import type { PersistField, PersistOptions, PersistedPanel, StorageAdapter } from './types.js';

export const DEFAULT_PERSIST_FIELDS: readonly PersistField[] = ['minimized', 'dock', 'dockSize', 'rect'];

type Stored = Record<string, Partial<PersistedPanel>>;

interface Envelope {
    version: number;
    panels: Stored;
}

export function localStorageAdapter(): StorageAdapter | null {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return null;
        }
        const storage = window.localStorage;
        return {
            get: (key) => {
                try {
                    return storage.getItem(key);
                } catch {
                    return null;
                }
            },
            set: (key, value) => {
                try {
                    storage.setItem(key, value);
                } catch {
                    return;
                }
            },
        };
    } catch {
        return null;
    }
}

export function memoryAdapter(seed: Record<string, string> = {}): StorageAdapter {
    const data = new Map(Object.entries(seed));
    return {
        get: (key) => data.get(key) ?? null,
        set: (key, value) => {
            data.set(key, value);
        },
    };
}

function isEnvelope(value: unknown): value is Envelope {
    return typeof value === 'object'
        && value !== null
        && typeof (value as Envelope).version === 'number'
        && typeof (value as Envelope).panels === 'object'
        && (value as Envelope).panels !== null;
}

export function readPersisted(options: PersistOptions): Stored {
    const raw = options.storage?.get(options.key);
    if (!raw) {
        return {};
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }
    if (!isEnvelope(parsed)) {
        return {};
    }
    if (parsed.version === options.version) {
        return parsed.panels;
    }
    return options.migrate?.(parsed.panels, parsed.version) ?? {};
}

export function pickPersisted(panel: PersistedPanel, fields: readonly PersistField[]): Partial<PersistedPanel> {
    const out: Partial<PersistedPanel> = {};
    for (const field of fields) {
        Object.assign(out, { [field]: panel[field] });
    }
    return out;
}

export function writePersisted(options: PersistOptions, panels: Stored): void {
    if (!options.storage) {
        return;
    }
    const envelope: Envelope = { version: options.version, panels };
    options.storage.set(options.key, JSON.stringify(envelope));
}
