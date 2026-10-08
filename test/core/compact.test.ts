import { describe, expect, it } from 'vitest';
import { clearance, createManager } from '../../src/core/index.js';

describe('compact mode', () => {
    it('switches below the breakpoint, frees the area and presents panels as declared', () => {
        const manager = createManager({ compactBreakpoint: 768 });
        manager.setViewport({ width: 1000, height: 800 });
        manager.register('sheet', { dockable: ['bottom'] });
        manager.register('full', { compact: 'fullscreen' });
        manager.register('inline', { compact: 'inline' });
        for (const id of ['sheet', 'full', 'inline']) {
            manager.open(id);
        }
        manager.dock('sheet', 'bottom');
        expect(manager.getSnapshot().compact).toBe(false);
        expect(manager.getPanel('sheet')?.presentation).toBe('docked');

        manager.setViewport({ width: 400, height: 800 });
        expect(manager.getSnapshot().compact).toBe(true);
        expect(manager.getSnapshot().area).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
        expect(manager.getPanel('sheet')).toMatchObject({ presentation: 'sheet', dock: 'bottom', layout: { x: 0, y: 120, width: 400, height: 680 } });
        expect(manager.getPanel('full')).toMatchObject({ presentation: 'fullscreen', layout: { x: 0, y: 0, width: 400, height: 800 } });
        expect(manager.getPanel('inline')).toMatchObject({ presentation: 'inline', layout: null });

        manager.setViewport({ width: 1000, height: 800 });
        expect(manager.getPanel('sheet')?.presentation).toBe('docked');
    });

    it('disables snapping and undocking while compact', () => {
        const manager = createManager();
        manager.setViewport({ width: 400, height: 800 });
        manager.register('a', { dockable: ['bottom'] });
        manager.open('a');
        expect(manager.snapAt('a', { x: 200, y: 795 })).toBeNull();
        manager.dock('a', 'bottom');
        expect(manager.undockAt('a', { x: 200, y: 400 }, { x: 0.5, y: 10 })).toBeNull();
    });
});

describe('cycle', () => {
    it('moves focus through visible panels in registration order and wraps', () => {
        const manager = createManager();
        manager.register('a');
        manager.register('b');
        manager.register('c');
        manager.open('a');
        manager.open('c');
        expect(manager.cycle()).toBe('a');
        expect(manager.getPanel('a')?.topmost).toBe(true);
        expect(manager.cycle()).toBe('c');
        expect(manager.cycle(-1)).toBe('a');
        manager.close('a');
        manager.close('c');
        expect(manager.cycle()).toBeNull();
    });
});

describe('clearance', () => {
    const viewport = { width: 1000, height: 800 };
    const pill = { x: 100, y: 760, width: 200, height: 30 };

    it('pushes above overlapping obstacles near the side, chaining them', () => {
        const scale = { x: 50, y: 770, width: 150, height: 20 };
        const legend = { x: 250, y: 720, width: 100, height: 30 };
        expect(clearance(pill, [scale], viewport, { side: 'bottom', base: 12 })).toBe(38);
        expect(clearance(pill, [scale, legend], viewport, { side: 'bottom', base: 12 })).toBe(88);
    });

    it('ignores obstacles that do not overlap or sit far from the side', () => {
        const aside = { x: 600, y: 760, width: 100, height: 30 };
        const middle = { x: 100, y: 300, width: 300, height: 200 };
        expect(clearance(pill, [aside, middle], viewport, { side: 'bottom', base: 12 })).toBe(12);
    });

    it('works on vertical sides', () => {
        const target = { x: 10, y: 100, width: 40, height: 200 };
        const sider = { x: 0, y: 0, width: 88, height: 800 };
        expect(clearance(target, [sider], viewport, { side: 'left', base: 16, gap: 12 })).toBe(100);
    });
});

describe('obstacles', () => {
    it('are stored without persisting and removed with null', () => {
        const manager = createManager();
        manager.setObstacle('scale', { x: 0, y: 780, width: 100, height: 20 });
        expect(manager.getSnapshot().obstacles).toEqual({ scale: { x: 0, y: 780, width: 100, height: 20 } });
        const before = manager.getSnapshot();
        manager.setObstacle('scale', { x: 0, y: 780, width: 100, height: 20 });
        expect(manager.getSnapshot()).toBe(before);
        manager.setObstacle('scale', null);
        expect(manager.getSnapshot().obstacles).toEqual({});
    });
});
