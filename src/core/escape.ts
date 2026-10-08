export const ESCAPE_PRIORITY = {
    mode: 0,
    surface: 100,
    menu: 200,
    modal: 300,
} as const;

export interface EscapeLayer {
    id: string;
    priority: number;
    onEscape: (event: KeyboardEvent) => unknown;
    enabled?: () => boolean;
}

interface Entry extends EscapeLayer {
    stamp: number;
}

export interface EscapeStack {
    push: (layer: EscapeLayer) => () => void;
    raise: (id: string) => void;
    top: () => string | null;
    handle: (event: KeyboardEvent) => boolean;
    attach: (target: Pick<Window, 'addEventListener' | 'removeEventListener'>) => () => void;
}

export function createEscapeStack(): EscapeStack {
    const layers = new Map<string, Entry>();
    let counter = 0;

    const ordered = (): Entry[] => [...layers.values()]
        .filter((layer) => layer.enabled?.() ?? true)
        .sort((a, b) => b.priority - a.priority || b.stamp - a.stamp);

    const push = (layer: EscapeLayer): (() => void) => {
        counter += 1;
        const entry: Entry = { ...layer, stamp: counter };
        layers.set(layer.id, entry);
        return () => {
            if (layers.get(layer.id) === entry) {
                layers.delete(layer.id);
            }
        };
    };

    const raise = (id: string): void => {
        const entry = layers.get(id);
        if (entry) {
            counter += 1;
            entry.stamp = counter;
        }
    };

    const top = (): string | null => ordered()[0]?.id ?? null;

    const handle = (event: KeyboardEvent): boolean => {
        if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
            return false;
        }
        for (const layer of ordered()) {
            if (layer.onEscape(event) !== false) {
                event.preventDefault();
                event.stopPropagation();
                return true;
            }
        }
        return false;
    };

    const attach = (target: Pick<Window, 'addEventListener' | 'removeEventListener'>): (() => void) => {
        const listener = (event: Event): void => {
            handle(event as KeyboardEvent);
        };
        target.addEventListener('keydown', listener, true);
        return () => target.removeEventListener('keydown', listener, true);
    };

    return { push, raise, top, handle, attach };
}
