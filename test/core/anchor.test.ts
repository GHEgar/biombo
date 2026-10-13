import { describe, expect, it } from 'vitest';
import { containRect, createManager, placeAnchored } from '../../src/core/index.js';

const bounds = { x: 0, y: 0, width: 1000, height: 800 };
const size = { width: 200, height: 100 };

describe('placeAnchored', () => {
    it('centers above the anchor when it fits', () => {
        const result = placeAnchored({ x: 400, y: 400, width: 40, height: 20 }, size, bounds);
        expect(result).toMatchObject({ x: 320, y: 292, placement: 'top', maxHeight: null, maxWidth: null, arrow: 100, outside: false });
    });

    it('flips to the opposite side when the preferred one is short', () => {
        const result = placeAnchored({ x: 400, y: 30, width: 40, height: 20 }, size, bounds);
        expect(result).toMatchObject({ y: 58, placement: 'bottom', maxHeight: null });
        expect(placeAnchored({ x: 400, y: 750, width: 40, height: 20 }, size, bounds, { placement: 'bottom' }).placement).toBe('top');
    });

    it('takes the roomier side and limits the height when neither fits', () => {
        const result = placeAnchored({ x: 400, y: 300, width: 40, height: 20 }, { width: 200, height: 600 }, bounds);
        expect(result).toMatchObject({ placement: 'bottom', y: 328, maxHeight: 464 });
        const top = placeAnchored({ x: 400, y: 500, width: 40, height: 20 }, { width: 200, height: 600 }, bounds);
        expect(top).toMatchObject({ placement: 'top', y: 8, maxHeight: 484 });
    });

    it('keeps the cross axis inside the margin and moves the arrow with the anchor', () => {
        const left = placeAnchored({ x: 10, y: 400, width: 20, height: 20 }, size, bounds);
        expect(left).toMatchObject({ x: 8, arrow: 12 });
        const right = placeAnchored({ x: 980, y: 400, width: 10, height: 20 }, size, bounds);
        expect(right).toMatchObject({ x: 792, arrow: 188 });
    });

    it('supports start and end alignment and the side placements', () => {
        const anchor = { x: 400, y: 400, width: 100, height: 40 };
        expect(placeAnchored(anchor, size, bounds, { align: 'start', placement: 'bottom' }).x).toBe(400);
        expect(placeAnchored(anchor, size, bounds, { align: 'end', placement: 'bottom' }).x).toBe(300);
        expect(placeAnchored(anchor, size, bounds, { placement: 'right' })).toMatchObject({ x: 508, y: 370, placement: 'right' });
        expect(placeAnchored({ ...anchor, x: 100 }, size, bounds, { placement: 'left' }).placement).toBe('right');
    });

    it('anchors to a point and limits the width of a surface wider than the bounds', () => {
        const point = placeAnchored({ x: 500, y: 500, width: 0, height: 0 }, size, bounds, { offset: 0 });
        expect(point).toMatchObject({ x: 400, y: 400, arrow: 100 });
        const wide = placeAnchored({ x: 500, y: 500, width: 0, height: 0 }, { width: 1200, height: 100 }, bounds);
        expect(wide).toMatchObject({ x: 8, maxWidth: 984 });
    });

    it('flags an anchor that scrolled out of the bounds', () => {
        expect(placeAnchored({ x: 400, y: -60, width: 40, height: 20 }, size, bounds).outside).toBe(true);
    });
});

describe('containRect', () => {
    it('keeps the whole rect inside the bounds minus the margin', () => {
        expect(containRect({ x: -50, y: 900, width: 200, height: 100 }, bounds, 10))
            .toEqual({ x: 10, y: 690, width: 200, height: 100, maxHeight: null });
        expect(containRect({ x: 950, y: -5, width: 200, height: 100 }, bounds, 10))
            .toEqual({ x: 790, y: 10, width: 200, height: 100, maxHeight: null });
    });

    it('pins to the top and limits the height when the rect is taller than the bounds', () => {
        expect(containRect({ x: 100, y: 300, width: 200, height: 900 }, bounds, 10))
            .toEqual({ x: 100, y: 10, width: 200, height: 780, maxHeight: 780 });
    });
});

describe('contain: full', () => {
    it('keeps a floating panel fully on screen instead of partially', () => {
        const manager = createManager();
        manager.setViewport({ width: 1000, height: 800 });
        manager.register('partial', {});
        manager.register('full', { contain: 'full', containMargin: 10 });
        manager.open('partial');
        manager.open('full');
        manager.setRect('partial', { x: 950, y: 100, width: 300, height: 200 });
        manager.setRect('full', { x: 950, y: 100, width: 300, height: 200 });
        expect(manager.getPanel('partial')?.rect?.x).toBe(880);
        expect(manager.getPanel('full')?.rect).toEqual({ x: 690, y: 100, width: 300, height: 200 });
        manager.setViewport({ width: 600, height: 800 });
        expect(manager.getPanel('full')?.rect?.x).toBe(290);
        expect(manager.clampRect({ x: -40, y: 0, width: 300, height: 200 }, 'full')).toEqual({ x: 10, y: 10, width: 300, height: 200 });
    });
});

describe('placement: over', () => {
    it('centers on the anchor in both axes and stays inside the bounds', () => {
        expect(placeAnchored({ x: 500, y: 400, width: 0, height: 0 }, size, bounds, { placement: 'over' }))
            .toMatchObject({ x: 400, y: 350, placement: 'over', maxWidth: null, maxHeight: null, arrow: 0 });
        expect(placeAnchored({ x: 990, y: 5, width: 0, height: 0 }, size, bounds, { placement: 'over' }))
            .toMatchObject({ x: 792, y: 8 });
        expect(placeAnchored({ x: 500, y: 400, width: 0, height: 0 }, { width: 200, height: 900 }, bounds, { placement: 'over' }))
            .toMatchObject({ y: 8, maxHeight: 784 });
    });
});
