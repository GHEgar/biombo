import { useCallback, useEffect, useId, useReducer, useSyncExternalStore, type RefObject } from 'react';
import { clearance, type ClearanceOptions } from '../core/clearance.js';
import type { Rect } from '../core/types.js';
import { useManager } from './context.js';

export interface UseClearanceOptions extends ClearanceOptions {
    panels?: boolean;
    obstacles?: boolean;
    enabled?: boolean;
}

function rectOf(element: Element | null): Rect | null {
    if (!element) {
        return null;
    }
    const box = element.getBoundingClientRect();
    return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function useResizeTick(ref: RefObject<Element | null>): number {
    const [tick, bump] = useReducer((value: number) => value + 1, 0);
    useEffect(() => {
        const element = ref.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(() => bump());
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);
    return tick;
}

export function useObstacle(ref: RefObject<Element | null>, enabled = true): void {
    const manager = useManager();
    const key = useId();
    const tick = useResizeTick(ref);
    const viewport = useSyncExternalStore(manager.subscribe, () => manager.getSnapshot().viewport, () => manager.getSnapshot().viewport);

    useEffect(() => {
        manager.setObstacle(key, enabled ? rectOf(ref.current) : null);
    }, [manager, key, ref, enabled, tick, viewport]);

    useEffect(() => () => manager.setObstacle(key, null), [manager, key]);
}

export function useClearance(ref: RefObject<Element | null>, options: UseClearanceOptions): number {
    const manager = useManager();
    const { side, base = 0, gap = 8, panels = true, obstacles = true, enabled = true } = options;

    const getSnapshot = useCallback(() => {
        const snapshot = manager.getSnapshot();
        const target = rectOf(ref.current);
        if (!enabled || !target) {
            return base;
        }
        const rects: Rect[] = [];
        if (panels) {
            for (const panel of Object.values(snapshot.panels)) {
                if (panel.visible && panel.layout && panel.presentation !== 'inline') {
                    rects.push(panel.layout);
                }
            }
        }
        if (obstacles) {
            rects.push(...Object.values(snapshot.obstacles));
        }
        return clearance(target, rects, snapshot.viewport, { side, base, gap });
    }, [manager, ref, enabled, panels, obstacles, side, base, gap]);

    const subscribe = useCallback((notify: () => void) => {
        const release = manager.subscribe(notify);
        const element = ref.current;
        const observer = element && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(notify) : null;
        if (element) {
            observer?.observe(element);
        }
        return () => {
            release();
            observer?.disconnect();
        };
    }, [manager, ref]);

    return useSyncExternalStore(subscribe, getSnapshot, () => base);
}
