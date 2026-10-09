import { describe, expect, it, vi } from 'vitest';
import { createManager, memoryAdapter, type ManagerOptions } from '../../src/core/index.js';

const viewport = { width: 1000, height: 800 };

function setup(options: ManagerOptions = {}) {
    const manager = createManager(options);
    manager.setViewport(viewport);
    return manager;
}

describe('docking', () => {
    it('reserves area and gives the docked panel its rect and band', () => {
        const onAreaChange = vi.fn();
        const manager = setup({ onAreaChange });
        manager.register('t', { dockable: ['bottom'] });
        manager.open('t');
        manager.dock('t', 'bottom');
        expect(manager.getSnapshot().area).toEqual({ top: 0, right: 0, bottom: 320, left: 0 });
        expect(manager.getPanel('t')).toMatchObject({ band: 'docked', zIndex: 20, layout: { x: 0, y: 480, width: 1000, height: 320 } });
        expect(onAreaChange).toHaveBeenLastCalledWith({ top: 0, right: 0, bottom: 320, left: 0 });
        manager.minimize('t');
        expect(manager.getSnapshot().area.bottom).toBe(0);
        expect(manager.getPanel('t')?.dock).toBe('bottom');
    });

    it('replace policy undocks the previous occupant', () => {
        const manager = setup();
        manager.register('a');
        manager.register('b');
        manager.open('a');
        manager.open('b');
        manager.dock('a', 'left');
        manager.dock('b', 'left');
        expect(manager.getPanel('a')?.dock).toBeNull();
        expect(manager.getSnapshot().edges.left.ids).toEqual(['b']);
    });

    it('stack policy keeps every panel and sums the area', () => {
        const manager = setup({ edges: { bottom: { policy: 'stack' } } });
        manager.register('a', { initial: { dockSize: 200 } });
        manager.register('b', { initial: { dockSize: 150 } });
        manager.open('a');
        manager.open('b');
        manager.dock('a', 'bottom');
        manager.dock('b', 'bottom');
        expect(manager.getSnapshot().area.bottom).toBe(350);
        expect(manager.getPanel('b')?.layout).toEqual({ x: 0, y: 450, width: 1000, height: 150 });
    });

    it('tabs policy shows only the last focused panel of the edge', () => {
        const manager = setup({ edges: { right: { policy: 'tabs' } } });
        manager.register('a', { initial: { dockSize: 300 } });
        manager.register('b', { initial: { dockSize: 200 } });
        manager.open('a');
        manager.open('b');
        manager.dock('a', 'right');
        manager.dock('b', 'right');
        expect(manager.getPanel('a')).toMatchObject({ tabbed: true, visible: false });
        expect(manager.getSnapshot().area.right).toBe(200);
        manager.focus('a');
        expect(manager.getPanel('a')).toMatchObject({ tabbed: false, visible: true });
        expect(manager.getSnapshot().edges.right).toMatchObject({ ids: ['a', 'b'], active: 'a' });
        expect(manager.getSnapshot().area.right).toBe(300);
    });

    it('clamps dock sizes and floating rects when the viewport shrinks', () => {
        const manager = setup();
        manager.register('d', { dockable: ['bottom'] });
        manager.register('f');
        manager.open('d');
        manager.dock('d', 'bottom');
        manager.setDockSize('d', 700);
        expect(manager.getPanel('d')?.dockSize).toBe(640);
        manager.open('f');
        manager.setRect('f', { x: 800, y: 600, width: 300, height: 200 });
        manager.setViewport({ width: 500, height: 400 });
        expect(manager.getPanel('d')?.dockSize).toBe(320);
        expect(manager.getPanel('f')?.rect).toEqual({ x: 380, y: 352, width: 300, height: 200 });
    });

    it('places panels with a default size centered and cascaded', () => {
        const manager = setup();
        manager.register('a', { defaultSize: { width: 400, height: 200 } });
        manager.register('b', { defaultSize: { width: 400, height: 200 } });
        manager.open('a');
        manager.open('b');
        expect(manager.getPanel('a')?.layout).toEqual({ x: 300, y: 300, width: 400, height: 200 });
        expect(manager.getPanel('b')?.layout).toEqual({ x: 326, y: 326, width: 400, height: 200 });
    });

    it('maximized panels fill the free area', () => {
        const manager = setup();
        manager.register('d');
        manager.register('f');
        manager.open('d');
        manager.dock('d', 'bottom');
        manager.setDockSize('d', 200);
        manager.open('f');
        manager.maximize('f');
        expect(manager.getPanel('f')?.layout).toEqual({ x: 0, y: 0, width: 1000, height: 600 });
    });

    it('transient updates neither persist nor emit', () => {
        const storage = memoryAdapter();
        const onEvent = vi.fn();
        const manager = setup({ onEvent, persist: { storage, key: 'k', version: 1 } });
        manager.register('d');
        manager.open('d');
        manager.dock('d', 'bottom');
        onEvent.mockClear();
        manager.setDockSize('d', 250, { transient: true });
        expect(manager.getPanel('d')?.dockSize).toBe(250);
        expect(onEvent).not.toHaveBeenCalled();
        expect(JSON.parse(storage.get('k') ?? '{}').panels.d.dockSize).toBeNull();
        manager.setDockSize('d', 250);
        expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'resize', size: 250 }));
        expect(JSON.parse(storage.get('k') ?? '{}').panels.d.dockSize).toBe(250);
    });

    it('snaps only to allowed edges and undocks under the pointer', () => {
        const manager = setup();
        manager.register('a', { dockable: ['bottom'], defaultSize: { width: 400, height: 200 } });
        manager.open('a');
        expect(manager.snapAt('a', { x: 500, y: 790 })).toMatchObject({ edge: 'bottom', rect: { y: 480, height: 320 } });
        expect(manager.snapAt('a', { x: 5, y: 400 })).toBeNull();
        manager.dock('a', 'bottom');
        const rect = manager.undockAt('a', { x: 500, y: 450 }, { x: 0.5, y: 10 });
        expect(rect).toEqual({ x: 300, y: 440, width: 400, height: 200 });
        expect(manager.getPanel('a')).toMatchObject({ dock: null, layout: rect });
    });

    it('keeps untouched panel objects between commits', () => {
        const manager = setup();
        manager.register('a');
        manager.register('b');
        manager.open('a');
        manager.open('b');
        const a = manager.getPanel('a');
        manager.setRect('b', { x: 10, y: 10, width: 200, height: 100 });
        expect(manager.getPanel('a')).toBe(a);
    });
});

describe('placement of panels that start open', () => {
    it('places a persisted open panel on register and when the viewport arrives', () => {
        const early = createManager();
        early.register('a', { defaultSize: { width: 400, height: 200 }, initial: { open: true } });
        expect(early.getPanel('a')?.layout).toBeNull();
        early.setViewport(viewport);
        expect(early.getPanel('a')?.layout).toEqual({ x: 300, y: 300, width: 400, height: 200 });

        const late = setup();
        late.register('b', { defaultSize: { width: 400, height: 200 }, initial: { open: true } });
        expect(late.getPanel('b')?.layout).toEqual({ x: 300, y: 300, width: 400, height: 200 });
    });
});
