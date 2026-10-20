import { useCallback, useMemo, useRef, useSyncExternalStore, type CSSProperties, type MouseEvent, type PointerEvent, type RefCallback } from 'react';
import { DEFAULT_GROUP } from '../core/manager.js';
import { isAnchoredRect } from '../core/corner.js';
import type { Edge, FitHeightOptions, Focusable, PanelConfig, PanelState, Rect, ResizeDirection, UpdateOptions } from '../core/types.js';
import { useIsomorphicLayoutEffect, useManager } from './context.js';
import { startDrag, startResize, type InteractionContext } from './interactions.js';

export interface WindowProps {
    ref: RefCallback<HTMLElement>;
    'data-biombo-panel': string;
    'data-state': 'open' | 'closed' | 'minimized';
    'data-topmost'?: '';
    'data-dock'?: Edge;
    'data-maximized'?: '';
    'data-presentation': PanelState['presentation'];
    role: 'dialog';
    tabIndex: -1;
    'aria-modal'?: true;
    hidden?: true;
    style: CSSProperties;
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => void;
}

export interface WindowPropsInput {
    style?: CSSProperties;
    onPointerDownCapture?: (event: PointerEvent<HTMLElement>) => void;
}

export interface HandleProps {
    'data-biombo-handle': '';
    style: CSSProperties;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
}

export interface ResizerProps {
    'data-biombo-resizer': string;
    role: 'separator';
    'aria-orientation'?: 'horizontal' | 'vertical';
    'aria-valuenow'?: number;
    style: CSSProperties;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
}

export interface RestoreProps {
    type: 'button';
    'data-biombo-restore': string;
    hidden?: true;
    onClick: (event: MouseEvent<HTMLElement>) => void;
}

export interface RestorePropsInput {
    onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface PanelActions {
    open: (trigger?: Focusable | null) => void;
    close: () => void;
    toggle: (trigger?: Focusable | null) => void;
    focus: () => void;
    minimize: (value?: boolean) => void;
    maximize: (value?: boolean) => void;
    dock: (edge: Edge | null) => void;
    setDockSize: (size: number | null, options?: UpdateOptions) => void;
    setRect: (rect: Rect | null, options?: UpdateOptions) => void;
    fitHeight: (height: number, options?: FitHeightOptions) => void;
}

export interface UsePanelResult extends PanelActions {
    state: PanelState;
    getWindowProps: (input?: WindowPropsInput) => WindowProps;
    getHandleProps: () => HandleProps;
    getResizerProps: (direction?: ResizeDirection) => ResizerProps;
    getRestoreProps: (input?: RestorePropsInput) => RestoreProps;
}

const TOUCH_NONE: CSSProperties = { touchAction: 'none' };

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
        ...config.initial,
        rect: isAnchoredRect(config.initial?.rect) ? null : config.initial?.rect ?? null,
        visible: false,
        active: false,
        topmost: false,
        zIndex: 0,
        layout: null,
        tabbed: false,
        presentation: 'hidden',
    };
}

function positionStyle(state: PanelState): CSSProperties {
    const { layout, presentation, zIndex } = state;
    if (presentation === 'hidden') {
        return { display: 'none', zIndex };
    }
    if (presentation === 'sheet' && layout) {
        return { position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: layout.height, zIndex };
    }
    if (!layout || presentation === 'inline') {
        return { zIndex };
    }
    return { position: 'fixed', left: layout.x, top: layout.y, width: layout.width, height: layout.height, zIndex };
}

export function usePanel(id: string, config: PanelConfig = {}): UsePanelResult {
    const manager = useManager();
    const key = JSON.stringify(config);
    const elementRef = useRef<HTMLElement | null>(null);

    useIsomorphicLayoutEffect(() => manager.register(id, JSON.parse(key) as PanelConfig), [manager, id, key]);

    const getSnapshot = useCallback(() => manager.getPanel(id), [manager, id]);
    const panel = useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);
    const fallback = useMemo(() => fallbackState(id, JSON.parse(key) as PanelConfig), [id, key]);
    const state = panel ?? fallback;

    const context = useMemo<InteractionContext>(() => ({
        manager,
        id,
        getElement: () => elementRef.current,
    }), [manager, id]);

    const setElement = useCallback<RefCallback<HTMLElement>>((element) => {
        elementRef.current = element;
    }, []);

    const actions = useMemo<PanelActions>(() => ({
        open: (trigger) => manager.open(id, trigger === undefined ? activeElement() : trigger),
        close: () => manager.close(id),
        toggle: (trigger) => manager.toggle(id, trigger === undefined ? activeElement() : trigger),
        focus: () => manager.focus(id),
        minimize: (value) => manager.minimize(id, value),
        maximize: (value) => manager.maximize(id, value),
        dock: (edge) => manager.dock(id, edge),
        setDockSize: (size, options) => manager.setDockSize(id, size, options),
        setRect: (rect, options) => manager.setRect(id, rect, options),
        fitHeight: (height, options) => manager.fitHeight(id, height, options),
    }), [manager, id]);

    const getWindowProps = useCallback((input: WindowPropsInput = {}): WindowProps => {
        const props: WindowProps = {
            ref: setElement,
            'data-biombo-panel': id,
            'data-state': !state.open ? 'closed' : state.minimized ? 'minimized' : 'open',
            'data-presentation': state.presentation,
            role: 'dialog',
            tabIndex: -1,
            style: { ...input.style, ...positionStyle(state) },
            onPointerDownCapture: (event) => {
                input.onPointerDownCapture?.(event);
                manager.focus(id);
            },
        };
        if (state.topmost) {
            props['data-topmost'] = '';
        }
        if (state.dock && !state.maximized) {
            props['data-dock'] = state.dock;
        }
        if (state.maximized) {
            props['data-maximized'] = '';
        }
        if (state.band === 'modal') {
            props['aria-modal'] = true;
        }
        if (!state.visible) {
            props.hidden = true;
        }
        return props;
    }, [manager, id, state, setElement]);

    const getHandleProps = useCallback((): HandleProps => ({
        'data-biombo-handle': '',
        style: TOUCH_NONE,
        onPointerDown: (event) => startDrag(context, event),
    }), [context]);

    const getResizerProps = useCallback((direction?: ResizeDirection): ResizerProps => {
        const props: ResizerProps = {
            'data-biombo-resizer': direction ?? state.dock ?? 'dock',
            role: 'separator',
            style: TOUCH_NONE,
            onPointerDown: (event) => startResize(context, event, direction),
        };
        if (state.dock && state.layout && !direction) {
            const vertical = state.dock === 'top' || state.dock === 'bottom';
            props['aria-orientation'] = vertical ? 'horizontal' : 'vertical';
            props['aria-valuenow'] = Math.round(vertical ? state.layout.height : state.layout.width);
        }
        return props;
    }, [context, state]);

    const minimized = state.open && state.minimized;
    const getRestoreProps = useCallback((input: RestorePropsInput = {}): RestoreProps => {
        const props: RestoreProps = {
            type: 'button',
            'data-biombo-restore': id,
            onClick: (event) => {
                input.onClick?.(event);
                if (!event.defaultPrevented) {
                    manager.minimize(id, false);
                }
            },
        };
        if (!minimized) {
            props.hidden = true;
        }
        return props;
    }, [manager, id, minimized]);

    return { state, getWindowProps, getHandleProps, getResizerProps, getRestoreProps, ...actions };
}
