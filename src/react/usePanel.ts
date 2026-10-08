import { useCallback, useMemo, useSyncExternalStore, type CSSProperties, type PointerEvent } from 'react';
import { DEFAULT_GROUP } from '../core/manager.js';
import type { Edge, Focusable, PanelConfig, PanelState, Rect } from '../core/types.js';
import { useIsomorphicLayoutEffect, useManager } from './context.js';

export interface WindowProps {
    'data-biombo-panel': string;
    'data-state': 'open' | 'closed' | 'minimized';
    'data-topmost'?: '';
    'data-dock'?: Edge;
    role: 'dialog';
    'aria-modal'?: true;
    hidden?: true;
    style: CSSProperties;
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => void;
}

export interface WindowPropsInput {
    style?: CSSProperties;
    onPointerDownCapture?: (event: PointerEvent<HTMLElement>) => void;
}

export interface PanelActions {
    open: (trigger?: Focusable | null) => void;
    close: () => void;
    toggle: (trigger?: Focusable | null) => void;
    focus: () => void;
    minimize: (value?: boolean) => void;
    maximize: (value?: boolean) => void;
    dock: (edge: Edge | null) => void;
    setDockSize: (size: number | null) => void;
    setRect: (rect: Rect | null) => void;
}

export interface UsePanelResult extends PanelActions {
    state: PanelState;
    getWindowProps: (input?: WindowPropsInput) => WindowProps;
}

function activeElement(): Focusable | null {
    if (typeof document === 'undefined') {
        return null;
    }
    const element = document.activeElement;
    return element instanceof HTMLElement && element !== document.body ? element : null;
}

function fallbackState(id: string, config: PanelConfig): PanelState {
    return {
        id,
        group: config.group ?? DEFAULT_GROUP,
        band: config.band ?? 'floating',
        open: false,
        minimized: false,
        maximized: false,
        dock: null,
        dockSize: null,
        rect: null,
        ...config.initial,
        visible: false,
        active: false,
        topmost: false,
        zIndex: 0,
    };
}

export function usePanel(id: string, config: PanelConfig = {}): UsePanelResult {
    const manager = useManager();
    const key = JSON.stringify(config);

    useIsomorphicLayoutEffect(() => manager.register(id, JSON.parse(key) as PanelConfig), [manager, id, key]);

    const getSnapshot = useCallback(() => manager.getPanel(id), [manager, id]);
    const panel = useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);
    const fallback = useMemo(() => fallbackState(id, JSON.parse(key) as PanelConfig), [id, key]);
    const state = panel ?? fallback;

    const actions = useMemo<PanelActions>(() => ({
        open: (trigger) => manager.open(id, trigger === undefined ? activeElement() : trigger),
        close: () => manager.close(id),
        toggle: (trigger) => manager.toggle(id, trigger === undefined ? activeElement() : trigger),
        focus: () => manager.focus(id),
        minimize: (value) => manager.minimize(id, value),
        maximize: (value) => manager.maximize(id, value),
        dock: (edge) => manager.dock(id, edge),
        setDockSize: (size) => manager.setDockSize(id, size),
        setRect: (rect) => manager.setRect(id, rect),
    }), [manager, id]);

    const getWindowProps = useCallback((input: WindowPropsInput = {}): WindowProps => {
        const props: WindowProps = {
            'data-biombo-panel': id,
            'data-state': !state.open ? 'closed' : state.minimized ? 'minimized' : 'open',
            role: 'dialog',
            style: { ...input.style, zIndex: state.zIndex },
            onPointerDownCapture: (event) => {
                input.onPointerDownCapture?.(event);
                manager.focus(id);
            },
        };
        if (state.topmost) {
            props['data-topmost'] = '';
        }
        if (state.dock) {
            props['data-dock'] = state.dock;
        }
        if (state.band === 'modal') {
            props['aria-modal'] = true;
        }
        if (!state.visible) {
            props.hidden = true;
        }
        return props;
    }, [manager, id, state]);

    return { state, getWindowProps, ...actions };
}
