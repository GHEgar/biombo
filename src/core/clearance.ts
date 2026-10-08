import type { Edge, Rect, Size } from './types.js';

export interface ClearanceOptions {
    side: Edge;
    base?: number;
    gap?: number;
}

const horizontal = (side: Edge): boolean => side === 'top' || side === 'bottom';

function span(rect: Rect, side: Edge): [number, number] {
    return horizontal(side) ? [rect.x, rect.x + rect.width] : [rect.y, rect.y + rect.height];
}

function depth(rect: Rect, side: Edge, viewport: Size): [number, number] {
    if (side === 'bottom') {
        return [viewport.height - rect.y - rect.height, viewport.height - rect.y];
    }
    if (side === 'top') {
        return [rect.y, rect.y + rect.height];
    }
    if (side === 'right') {
        return [viewport.width - rect.x - rect.width, viewport.width - rect.x];
    }
    return [rect.x, rect.x + rect.width];
}

export function clearance(target: Rect, obstacles: readonly Rect[], viewport: Size, options: ClearanceOptions): number {
    const { side, base = 0, gap = 8 } = options;
    const [start, end] = span(target, side);
    const size = horizontal(side) ? target.height : target.width;
    const candidates = obstacles
        .filter((rect) => {
            const [from, to] = span(rect, side);
            return from < end && to > start && rect.width > 0 && rect.height > 0;
        })
        .map((rect) => depth(rect, side, viewport))
        .sort((a, b) => a[0] - b[0]);
    let offset = base;
    for (const [near, far] of candidates) {
        if (near < offset + size + gap && far + gap > offset) {
            offset = Math.max(offset, far + gap);
        }
    }
    return Math.round(offset);
}
