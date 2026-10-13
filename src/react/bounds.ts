import { areaRect, clampRect, containRect } from '../core/layout.js';
import type { Manager } from '../core/manager.js';
import { DEFAULT_KEEP_VISIBLE } from '../core/store.js';
import type { ContainMode, Rect } from '../core/types.js';

export type Boundary = 'viewport' | 'area';

export function boundaryRect(manager: Manager | null, boundary: Boundary): Rect {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if (boundary === 'area' && manager) {
        return areaRect(manager.getSnapshot().area, viewport);
    }
    return { x: 0, y: 0, ...viewport };
}

export function fitInto(rect: Rect, bounds: Rect, mode: ContainMode | false, margin: number): Rect {
    if (mode === false) {
        return rect;
    }
    if (mode === 'partial') {
        const moved = clampRect({ ...rect, x: rect.x - bounds.x, y: rect.y - bounds.y }, bounds, DEFAULT_KEEP_VISIBLE);
        return { ...moved, x: moved.x + bounds.x, y: moved.y + bounds.y };
    }
    const { x, y, width, height } = containRect(rect, bounds, margin);
    return { x, y, width, height };
}
