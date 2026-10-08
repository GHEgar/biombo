import type { Area, Edge, Rect, Size } from './types.js';

export const EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

export const ZERO_AREA: Area = { top: 0, right: 0, bottom: 0, left: 0 };

export const DOCK_DEFAULTS = {
    ratio: 0.4,
    min: 120,
    maxRatio: 0.8,
};

export interface DockItem {
    id: string;
    edge: Edge;
    size: number;
}

export interface DockLayout {
    area: Area;
    rects: Map<string, Rect>;
}

export const isVertical = (edge: Edge): boolean => edge === 'top' || edge === 'bottom';

export const axisLength = (edge: Edge, viewport: Size): number => (isVertical(edge) ? viewport.height : viewport.width);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

export function clampDockSize(size: number, length: number, min: number, maxRatio: number): number {
    return Math.round(clamp(size, Math.min(min, length), length * maxRatio));
}

export function resolveDockSize(size: number | null, length: number, ratio: number, min: number, maxRatio: number): number {
    return clampDockSize(size ?? length * ratio, length, min, maxRatio);
}

export function clampRect(rect: Rect, viewport: Size, keepVisible: Size): Rect {
    if (viewport.width <= 0 || viewport.height <= 0) {
        return rect;
    }
    const width = Math.min(rect.width, viewport.width);
    const height = Math.min(rect.height, viewport.height);
    const keepX = Math.min(keepVisible.width, width);
    const keepY = Math.min(keepVisible.height, height);
    return {
        x: Math.round(clamp(rect.x, keepX - width, viewport.width - keepX)),
        y: Math.round(clamp(rect.y, 0, viewport.height - keepY)),
        width,
        height,
    };
}

export function areaRect(area: Area, viewport: Size): Rect {
    return {
        x: area.left,
        y: area.top,
        width: Math.max(0, viewport.width - area.left - area.right),
        height: Math.max(0, viewport.height - area.top - area.bottom),
    };
}

export function centerRect(size: Size, area: Area, viewport: Size, index: number, cascade: number): Rect {
    const free = areaRect(area, viewport);
    const width = Math.min(size.width, free.width || size.width);
    const height = Math.min(size.height, free.height || size.height);
    const offset = index * cascade;
    return {
        x: Math.round(free.x + (free.width - width) / 2 + offset),
        y: Math.round(free.y + (free.height - height) / 2 + offset),
        width,
        height,
    };
}

export function layoutDocks(items: readonly DockItem[], viewport: Size): DockLayout {
    const rects = new Map<string, Rect>();
    const area: Area = { ...ZERO_AREA };
    const { width: w, height: h } = viewport;
    for (const item of items) {
        if (item.edge === 'top') {
            rects.set(item.id, { x: 0, y: area.top, width: w, height: item.size });
            area.top += item.size;
        } else if (item.edge === 'bottom') {
            rects.set(item.id, { x: 0, y: h - area.bottom - item.size, width: w, height: item.size });
            area.bottom += item.size;
        }
    }
    const span = Math.max(0, h - area.top - area.bottom);
    for (const item of items) {
        if (item.edge === 'left') {
            rects.set(item.id, { x: area.left, y: area.top, width: item.size, height: span });
            area.left += item.size;
        } else if (item.edge === 'right') {
            rects.set(item.id, { x: w - area.right - item.size, y: area.top, width: item.size, height: span });
            area.right += item.size;
        }
    }
    return { area, rects };
}

export function dockPreviewRect(edge: Edge, size: number, area: Area, viewport: Size): Rect {
    const free = areaRect(area, viewport);
    if (edge === 'top') {
        return { x: free.x, y: free.y, width: free.width, height: size };
    }
    if (edge === 'bottom') {
        return { x: free.x, y: free.y + free.height - size, width: free.width, height: size };
    }
    if (edge === 'left') {
        return { x: free.x, y: free.y, width: size, height: free.height };
    }
    return { x: free.x + free.width - size, y: free.y, width: size, height: free.height };
}

export function snapEdge(
    point: { x: number; y: number },
    viewport: Size,
    threshold: number,
    allowed: readonly Edge[],
): Edge | null {
    const distances: [Edge, number][] = [
        ['top', point.y],
        ['right', viewport.width - point.x],
        ['bottom', viewport.height - point.y],
        ['left', point.x],
    ];
    let best: Edge | null = null;
    let bestDistance = threshold + 1;
    for (const [edge, distance] of distances) {
        if (allowed.includes(edge) && distance < bestDistance) {
            best = edge;
            bestDistance = distance;
        }
    }
    return best;
}

export function resizeRect(start: Rect, direction: string, dx: number, dy: number, min: Size): Rect {
    let { x, y, width, height } = start;
    if (direction.includes('e')) {
        width = Math.max(min.width, start.width + dx);
    }
    if (direction.includes('s')) {
        height = Math.max(min.height, start.height + dy);
    }
    if (direction.includes('w')) {
        width = Math.max(min.width, start.width - dx);
        x = start.x + start.width - width;
    }
    if (direction.includes('n')) {
        height = Math.max(min.height, start.height - dy);
        y = start.y + start.height - height;
    }
    return { x, y, width, height };
}

export const sameRect = (a: Rect | null, b: Rect | null): boolean => a === b
    || (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

export const sameArea = (a: Area, b: Area): boolean => a.top === b.top
    && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
