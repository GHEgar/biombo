import { describe, expect, it, vi } from 'vitest';
import { createManager } from '../../src/core/index.js';

describe('manager', () => {
    it('stacks visible panels inside their band by focus order', () => {
        const manager = createManager();
        manager.register('a');
        manager.register('b');
        manager.open('a');
        manager.open('b');
        expect(manager.getPanel('a')?.zIndex).toBe(30);
        expect(manager.getPanel('b')?.zIndex).toBe(31);
        expect(manager.getPanel('b')?.topmost).toBe(true);
        manager.focus('a');
        expect(manager.getPanel('a')?.zIndex).toBe(31);
        expect(manager.getPanel('a')?.topmost).toBe(true);
        expect(manager.getPanel('b')?.topmost).toBe(false);
    });

    it('keeps bands apart regardless of focus', () => {
        const manager = createManager();
        manager.register('docked', { band: 'docked' });
        manager.register('floating');
        manager.open('floating');
        manager.open('docked');
        expect(manager.getPanel('docked')?.zIndex).toBe(20);
        expect(manager.getPanel('floating')?.zIndex).toBe(30);
        expect(manager.getPanel('floating')?.topmost).toBe(true);
    });

    it('shows only the active panel of a single group', () => {
        const manager = createManager({ groups: { tables: { mode: 'single' } } });
        manager.register('t1', { group: 'tables' });
        manager.register('t2', { group: 'tables' });
        manager.open('t1');
        manager.open('t2');
        expect(manager.getPanel('t1')?.visible).toBe(false);
        expect(manager.getPanel('t2')?.visible).toBe(true);
        manager.focus('t1');
        expect(manager.getPanel('t1')?.visible).toBe(true);
        expect(manager.getPanel('t2')?.visible).toBe(false);
        manager.close('t1');
        expect(manager.getPanel('t2')?.visible).toBe(true);
    });

    it('minimizes, restores and hides minimized panels', () => {
        const manager = createManager();
        manager.register('a');
        manager.open('a');
        manager.minimize('a');
        expect(manager.getPanel('a')).toMatchObject({ open: true, minimized: true, visible: false });
        manager.open('a');
        expect(manager.getPanel('a')).toMatchObject({ minimized: false, visible: true });
    });

    it('respects minimizable and dockable restrictions', () => {
        const manager = createManager();
        manager.register('a', { minimizable: false, dockable: ['bottom'] });
        manager.open('a');
        manager.minimize('a');
        manager.dock('a', 'left');
        expect(manager.getPanel('a')).toMatchObject({ minimized: false, dock: null });
        manager.dock('a', 'bottom');
        expect(manager.getPanel('a')?.dock).toBe('bottom');
    });

    it('emits events in order', () => {
        const onEvent = vi.fn();
        const manager = createManager({ onEvent });
        manager.register('a');
        manager.open('a');
        manager.dock('a', 'bottom');
        manager.setDockSize('a', 240);
        manager.minimize('a');
        manager.close('a');
        expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual(['open', 'dock', 'resize', 'minimize', 'close']);
    });

    it('returns focus to the trigger on close', () => {
        const manager = createManager();
        const trigger = { focus: vi.fn() };
        manager.register('a');
        manager.open('a', trigger);
        manager.close('a');
        expect(trigger.focus).toHaveBeenCalledOnce();
    });

    it('keeps the snapshot reference stable without changes', () => {
        const manager = createManager();
        manager.register('a');
        const first = manager.getSnapshot();
        expect(manager.getSnapshot()).toBe(first);
        manager.open('a');
        expect(manager.getSnapshot()).not.toBe(first);
    });

    it('ignores the unregister of a replaced registration', () => {
        const manager = createManager();
        const release = manager.register('a');
        manager.open('a');
        manager.register('a', { band: 'menu' });
        release();
        expect(manager.getPanel('a')).toMatchObject({ open: true, band: 'menu' });
    });

    it('closes the topmost visible panel on Escape', () => {
        const manager = createManager();
        manager.register('a');
        manager.register('b');
        manager.open('a');
        manager.open('b');
        manager.escape.handle(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        expect(manager.getPanel('b')?.open).toBe(false);
        expect(manager.getPanel('a')?.open).toBe(true);
        manager.focus('a');
        manager.escape.handle(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        expect(manager.getPanel('a')?.open).toBe(false);
    });
});
