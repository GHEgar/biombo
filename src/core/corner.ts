import { areaRect } from './layout.js';
import type { AnchoredRect, Area, GrowDirection, Rect, Size } from './types.js';

export const isAnchoredRect = (rect: Rect | AnchoredRect | null | undefined): rect is AnchoredRect =>
    typeof rect === 'object' && rect !== null && 'anchor' in rect;

export function anchorRect(rect: AnchoredRect, area: Area, viewport: Size): Rect {
    const free = areaRect(area, viewport);
    const width = Math.min(rect.width, free.width || rect.width);
    const height = Math.min(rect.height, free.height || rect.height);
    const offsetX = rect.x ?? 0;
    const offsetY = rect.y ?? 0;
    const right = rect.anchor.endsWith('right');
    const bottom = rect.anchor.startsWith('bottom');
    return {
        x: Math.round(right ? free.x + free.width - width - offsetX : free.x + offsetX),
        y: Math.round(bottom ? free.y + free.height - height - offsetY : free.y + offsetY),
        width,
        height,
    };
}

export function growRect(rect: Rect, height: number, grow: GrowDirection): Rect {
    return { ...rect, y: grow === 'up' ? rect.y + rect.height - height : rect.y, height };
}

export function fitHeightTarget(height: number, min: number, max: number): number {
    return Math.round(Math.max(min, Math.min(max, height)));
}
