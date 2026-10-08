import { describe, expect, it } from 'vitest';
import { centerRect, clampRect, dockPreviewRect, layoutDocks, resizeRect, snapEdge } from '../../src/core/index.js';

const viewport = { width: 1000, height: 800 };

describe('layout', () => {
    it('lays top and bottom across, sides between them, stacking inward', () => {
        const { area, rects } = layoutDocks([
            { id: 'b1', edge: 'bottom', size: 200 },
            { id: 'l', edge: 'left', size: 300 },
            { id: 'b2', edge: 'bottom', size: 100 },
            { id: 't', edge: 'top', size: 50 },
        ], viewport);
        expect(area).toEqual({ top: 50, right: 0, bottom: 300, left: 300 });
        expect(rects.get('b1')).toEqual({ x: 0, y: 600, width: 1000, height: 200 });
        expect(rects.get('b2')).toEqual({ x: 0, y: 500, width: 1000, height: 100 });
        expect(rects.get('l')).toEqual({ x: 0, y: 50, width: 300, height: 450 });
    });

    it('keeps part of a rect on screen', () => {
        expect(clampRect({ x: -900, y: -50, width: 400, height: 300 }, viewport, { width: 120, height: 48 }))
            .toEqual({ x: -280, y: 0, width: 400, height: 300 });
        expect(clampRect({ x: 2000, y: 2000, width: 400, height: 300 }, viewport, { width: 120, height: 48 }))
            .toEqual({ x: 880, y: 752, width: 400, height: 300 });
    });

    it('centers inside the free area with cascade', () => {
        const area = { top: 0, right: 0, bottom: 200, left: 0 };
        expect(centerRect({ width: 400, height: 200 }, area, viewport, 1, 26)).toEqual({ x: 326, y: 226, width: 400, height: 200 });
    });

    it('picks the nearest allowed edge within the threshold', () => {
        expect(snapEdge({ x: 500, y: 790 }, viewport, 48, ['bottom', 'left'])).toBe('bottom');
        expect(snapEdge({ x: 10, y: 790 }, viewport, 48, ['bottom', 'left'])).toBe('bottom');
        expect(snapEdge({ x: 5, y: 790 }, viewport, 48, ['bottom', 'left'])).toBe('left');
        expect(snapEdge({ x: 500, y: 790 }, viewport, 48, ['top'])).toBeNull();
        expect(snapEdge({ x: 500, y: 400 }, viewport, 48, ['bottom'])).toBeNull();
    });

    it('previews a dock inside the remaining area', () => {
        const area = { top: 0, right: 0, bottom: 100, left: 0 };
        expect(dockPreviewRect('bottom', 200, area, viewport)).toEqual({ x: 0, y: 500, width: 1000, height: 200 });
        expect(dockPreviewRect('right', 300, area, viewport)).toEqual({ x: 700, y: 0, width: 300, height: 700 });
    });

    it('resizes from any corner and respects the minimum', () => {
        const start = { x: 100, y: 100, width: 400, height: 300 };
        expect(resizeRect(start, 'se', 50, 20, { width: 160, height: 80 })).toEqual({ x: 100, y: 100, width: 450, height: 320 });
        expect(resizeRect(start, 'nw', 50, 20, { width: 160, height: 80 })).toEqual({ x: 150, y: 120, width: 350, height: 280 });
        expect(resizeRect(start, 'w', 1000, 0, { width: 160, height: 80 })).toEqual({ x: 340, y: 100, width: 160, height: 300 });
    });
});
