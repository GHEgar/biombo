import { useCallback, useEffect, useId, useReducer, useSyncExternalStore, type RefObject } from 'react';
import { clearance, isCovered, type ClearanceOptions } from '../core/clearance.js';
import type { Snapshot } from '../core/types.js';
import type { Rect } from '../core/types.js';
import { useIsomorphicLayoutEffect, useOptionalManager } from './context.js';

export interface UseClearanceOptions extends ClearanceOptions {
    panels?: boolean;
    obstacles?: boolean;
    groups?: readonly string[];
    enabled?: boolean;
}

export interface UseObstacleOptions {
    enabled?: boolean;
    group?: string;
}

const SEPARATOR = '|';

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

export function useObstacle(ref: RefObject<Element | null>, options: UseObstacleOptions = {}): void {
    const { enabled = true, group = 'default' } = options;
    const manager = useOptionalManager();
    const key = `${group}${SEPARATOR}${useId()}`;
    const tick = useResizeTick(ref);

    useIsomorphicLayoutEffect(() => {
        manager?.setObstacle(key, enabled ? rectOf(ref.current) : null);
    });

    useEffect(() => manager?.subscribe(() => {
        if (enabled) {
            manager.setObstacle(key, rectOf(ref.current));
        }
    }), [manager, key, ref, enabled, tick]);

    useEffect(() => () => manager?.setObstacle(key, null), [manager, key]);
}

function collect(snapshot: Snapshot, panels: boolean, obstacles: boolean, groups?: readonly string[]): Rect[] {
    const rects: Rect[] = [];
    if (panels) {
        for (const panel of Object.values(snapshot.panels)) {
            if (panel.visible && panel.layout && panel.presentation !== 'inline') {
                rects.push(panel.layout);
            }
        }
    }
    if (obstacles) {
        for (const [key, rect] of Object.entries(snapshot.obstacles)) {
            if (!groups || groups.includes(key.slice(0, key.indexOf(SEPARATOR)))) {
                rects.push(rect);
            }
        }
    }
    return rects;
}

function useMeasured<T>(ref: RefObject<Element | null>, compute: (target: Rect, snapshot: Snapshot) => T, fallback: T): T {
    const manager = useOptionalManager();
    const getSnapshot = useCallback(() => {
        const target = rectOf(ref.current);
        return target && manager ? compute(target, manager.getSnapshot()) : fallback;
    }, [manager, ref, compute, fallback]);

    const subscribe = useCallback((notify: () => void) => {
        const release = manager ? manager.subscribe(notify) : () => undefined;
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

    return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

export function useClearance(ref: RefObject<Element | null>, options: UseClearanceOptions): number {
    const { side, base = 0, gap = 8, panels = true, obstacles = true, groups, enabled = true } = options;
    const groupKey = groups?.join(SEPARATOR);
    const compute = useCallback((target: Rect, snapshot: Snapshot) => (
        enabled ? clearance(target, collect(snapshot, panels, obstacles, groupKey?.split(SEPARATOR)), snapshot.viewport, { side, base, gap }) : base
    ), [enabled, panels, obstacles, groupKey, side, base, gap]);
    return useMeasured(ref, compute, base);
}

export interface UseCoveredOptions {
    panels?: boolean;
    obstacles?: boolean;
    groups?: readonly string[];
    enabled?: boolean;
}

export function useCovered(ref: RefObject<Element | null>, options: UseCoveredOptions = {}): boolean {
    const { panels = true, obstacles = true, groups, enabled = true } = options;
    const groupKey = groups?.join(SEPARATOR);
    const compute = useCallback((target: Rect, snapshot: Snapshot) => (
        enabled && isCovered(target, collect(snapshot, panels, obstacles, groupKey?.split(SEPARATOR)))
    ), [enabled, panels, obstacles, groupKey]);
    return useMeasured(ref, compute, false);
}
