import type { Rect, Size } from './types.js';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export type Align = 'start' | 'center' | 'end';

export interface AnchorOptions {
    placement?: Side;
    align?: Align;
    offset?: number;
    margin?: number;
    arrowPadding?: number;
}

export interface AnchoredPlacement {
    x: number;
    y: number;
    placement: Side;
    maxWidth: number | null;
    maxHeight: number | null;
    arrow: number;
    outside: boolean;
}

export const ANCHOR_DEFAULTS: Required<AnchorOptions> = {
    placement: 'top',
    align: 'center',
    offset: 8,
    margin: 8,
    arrowPadding: 12,
};

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

const isVerticalSide = (side: Side): boolean => side === 'top' || side === 'bottom';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

function space(side: Side, anchor: Rect, bounds: Rect, offset: number, margin: number): number {
    if (side === 'top') {
        return anchor.y - offset - bounds.y - margin;
    }
    if (side === 'bottom') {
        return bounds.y + bounds.height - margin - anchor.y - anchor.height - offset;
    }
    if (side === 'left') {
        return anchor.x - offset - bounds.x - margin;
    }
    return bounds.x + bounds.width - margin - anchor.x - anchor.width - offset;
}

function cross(start: number, length: number, size: number, boundStart: number, boundLength: number, margin: number, align: Align): number {
    const ideal = align === 'start' ? start : align === 'end' ? start + length - size : start + length / 2 - size / 2;
    return clamp(ideal, boundStart + margin, boundStart + boundLength - margin - size);
}

function chooseSide(preferred: Side, need: number, room: (side: Side) => number): { side: Side; limit: number | null } {
    if (room(preferred) >= need) {
        return { side: preferred, limit: null };
    }
    const opposite = OPPOSITE[preferred];
    if (room(opposite) >= need) {
        return { side: opposite, limit: null };
    }
    const side = room(opposite) > room(preferred) ? opposite : preferred;
    return { side, limit: Math.max(0, Math.floor(room(side))) };
}

export function isOutside(anchor: Rect, bounds: Rect): boolean {
    return anchor.x + anchor.width < bounds.x
        || anchor.y + anchor.height < bounds.y
        || anchor.x > bounds.x + bounds.width
        || anchor.y > bounds.y + bounds.height;
}

export function placeAnchored(anchor: Rect, floating: Size, bounds: Rect, options: AnchorOptions = {}): AnchoredPlacement {
    const { placement, align, offset, margin, arrowPadding } = { ...ANCHOR_DEFAULTS, ...options };
    const vertical = isVerticalSide(placement);
    const need = vertical ? floating.height : floating.width;
    const { side, limit } = chooseSide(placement, need, (candidate) => space(candidate, anchor, bounds, offset, margin));
    const main = limit ?? need;
    const crossRoom = Math.max(0, (vertical ? bounds.width : bounds.height) - margin * 2);
    const crossSize = Math.min(vertical ? floating.width : floating.height, crossRoom);
    const crossLimit = (vertical ? floating.width : floating.height) > crossRoom ? crossRoom : null;

    let x: number;
    let y: number;
    if (vertical) {
        y = side === 'top' ? anchor.y - offset - main : anchor.y + anchor.height + offset;
        x = cross(anchor.x, anchor.width, crossSize, bounds.x, bounds.width, margin, align);
    } else {
        x = side === 'left' ? anchor.x - offset - main : anchor.x + anchor.width + offset;
        y = cross(anchor.y, anchor.height, crossSize, bounds.y, bounds.height, margin, align);
    }

    const center = vertical ? anchor.x + anchor.width / 2 - x : anchor.y + anchor.height / 2 - y;
    const padding = Math.min(arrowPadding, crossSize / 2);

    return {
        x: Math.round(x),
        y: Math.round(y),
        placement: side,
        maxWidth: vertical ? crossLimit : limit,
        maxHeight: vertical ? limit : crossLimit,
        arrow: Math.round(clamp(center, padding, crossSize - padding)),
        outside: isOutside(anchor, bounds),
    };
}
