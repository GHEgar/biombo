import { describe, expect, it, vi } from 'vitest';
import { anchorRect, createManager, isAnchoredRect, ZERO_AREA } from '../../src/core/index.js';

const VIEWPORT = { width: 1000, height: 800 };
const LEGEND = { anchor: 'bottom-right', x: 16, y: 24, width: 200, height: 100 } as const;

describe('anchored initial rect', () => {
    it('resolves against a corner once the viewport is known', () => {
        const manager = createManager();
        manager.register('legend', { initial: { open: true, rect: LEGEND } });
        expect(manager.getPanel('legend')?.rect).toBeNull();
        manager.setViewport(VIEWPORT);
        expect(manager.getPanel('legend')?.rect).toEqual({ x: 784, y: 676, width: 200, height: 100 });
    });

    it('measures from the free area left by docked panels', () => {
        const manager = createManager();
        manager.setViewport(VIEWPORT);
        manager.register('side', { initial: { open: true, dock: 'right', dockSize: 300 } });
        manager.register('legend', { initial: { open: true, rect: LEGEND } });
        expect(manager.getPanel('legend')?.rect).toEqual({ x: 484, y: 676, width: 200, height: 100 });
    });

    it('defaults the offsets to zero and still honors containment', () => {
        const manager = createManager();
        manager.setViewport(VIEWPORT);
        manager.register('a', { contain: 'full', initial: { open: true, rect: { anchor: 'top-left', width: 100, height: 50 } } });
        manager.register('b', { initial: { open: true, rect: { anchor: 'bottom-left', width: 100, height: 50 } } });
        expect(manager.getPanel('a')?.rect).toEqual({ x: 8, y: 8, width: 100, height: 50 });
        expect(manager.getPanel('b')?.rect).toEqual({ x: 0, y: 750, width: 100, height: 50 });
    });

    it('waits for a closed panel to open and lets a stored rect win', () => {
        const stored = { a: { rect: { x: 1, y: 2, width: 30, height: 40 } } };
        const storage = { get: vi.fn(() => JSON.stringify({ version: 1, panels: stored })), set: vi.fn() };
        const manager = createManager({ persist: { storage, key: 'k', version: 1 } });
        manager.setViewport(VIEWPORT);
        manager.register('a', { initial: { open: true, rect: LEGEND } });
        manager.register('b', { initial: { rect: { ...LEGEND, anchor: 'top-right' } } });
        expect(manager.getPanel('a')?.rect).toEqual({ x: 1, y: 2, width: 30, height: 40 });
        expect(manager.getPanel('b')?.rect).toBeNull();
        manager.open('b');
        expect(manager.getPanel('b')?.rect).toEqual({ x: 784, y: 24, width: 200, height: 100 });
    });

    it('fits a rect bigger than the free area', () => {
        expect(anchorRect({ anchor: 'bottom-right', width: 2000, height: 50 }, ZERO_AREA, VIEWPORT))
            .toEqual({ x: 0, y: 750, width: 1000, height: 50 });
        expect(isAnchoredRect(LEGEND)).toBe(true);
        expect(isAnchoredRect({ x: 0, y: 0, width: 1, height: 1 })).toBe(false);
        expect(isAnchoredRect(null)).toBe(false);
    });
});

describe('fitHeight', () => {
    const setup = (config = {}) => {
        const onEvent = vi.fn();
        const manager = createManager({ onEvent });
        manager.setViewport(VIEWPORT);
        manager.register('p', { minSize: { width: 50, height: 80 }, initial: { open: true, rect: { x: 10, y: 100, width: 200, height: 300 } }, ...config });
        return { manager, onEvent };
    };

    it('follows the content keeping the top edge, inside min and max', () => {
        const { manager, onEvent } = setup();
        manager.fitHeight('p', 150.4);
        expect(manager.getPanel('p')?.rect).toEqual({ x: 10, y: 100, width: 200, height: 150 });
        expect(onEvent).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'resize', id: 'p', rect: manager.getPanel('p')?.rect }));
        manager.fitHeight('p', 20);
        expect(manager.getPanel('p')?.rect?.height).toBe(80);
        manager.fitHeight('p', 900, { max: 400 });
        expect(manager.getPanel('p')?.rect?.height).toBe(400);
        manager.fitHeight('p', 900, { maxRatio: 0.6, max: 1000 });
        expect(manager.getPanel('p')?.rect?.height).toBe(480);
        const calls = onEvent.mock.calls.length;
        manager.fitHeight('p', 900, { maxRatio: 0.6 });
        expect(onEvent).toHaveBeenCalledTimes(calls);
    });

    it('grows upward from a bottom corner or when asked', () => {
        const { manager } = setup({ initial: { open: true, rect: LEGEND } });
        manager.fitHeight('p', 200);
        expect(manager.getPanel('p')?.rect).toEqual({ x: 784, y: 576, width: 200, height: 200 });
        manager.fitHeight('p', 100, { grow: 'down' });
        expect(manager.getPanel('p')?.rect).toEqual({ x: 784, y: 576, width: 200, height: 100 });
    });

    it('leaves docked, maximized and unplaced panels alone', () => {
        const { manager } = setup();
        manager.maximize('p');
        manager.fitHeight('p', 120);
        expect(manager.getPanel('p')?.rect?.height).toBe(300);
        manager.maximize('p', false);
        manager.fitHeight('p', Number.NaN);
        expect(manager.getPanel('p')?.rect?.height).toBe(300);
        manager.register('q');
        manager.fitHeight('q', 120);
        expect(manager.getPanel('q')?.rect).toBeNull();
        manager.fitHeight('missing', 120);
    });
});
