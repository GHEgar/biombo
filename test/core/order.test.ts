import { describe, expect, it, vi } from 'vitest';
import { createManager, memoryAdapter } from '../../src/core/index.js';

describe('group order', () => {
    it('lists open panels in registration order until told otherwise', () => {
        const onEvent = vi.fn();
        const manager = createManager({ groups: { tables: { mode: 'single' } }, onEvent });
        for (const id of ['a', 'b', 'c']) {
            manager.register(id, { group: 'tables' });
            manager.open(id);
        }
        expect(manager.getSnapshot().groups.tables).toEqual({ mode: 'single', ids: ['a', 'b', 'c'], active: 'c' });
        manager.setGroupOrder('tables', ['c', 'a']);
        expect(manager.getSnapshot().groups.tables?.ids).toEqual(['c', 'a', 'b']);
        expect(onEvent).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'reorder', group: 'tables', ids: ['c', 'a'] }));
        manager.close('a');
        expect(manager.getSnapshot().groups.tables?.ids).toEqual(['c', 'b']);
    });

    it('keeps the group object when nothing changed', () => {
        const manager = createManager();
        manager.register('a');
        manager.open('a');
        const before = manager.getSnapshot().groups.default;
        manager.setRect('a', { x: 1, y: 1, width: 10, height: 10 });
        expect(manager.getSnapshot().groups.default).toBe(before);
    });
});

describe('edge order', () => {
    it('reorders the panels docked on an edge', () => {
        const manager = createManager({ edges: { bottom: { policy: 'stack' } } });
        manager.setViewport({ width: 1000, height: 800 });
        for (const id of ['a', 'b']) {
            manager.register(id, { initial: { dockSize: 150 } });
            manager.open(id);
            manager.dock(id, 'bottom');
        }
        expect(manager.getSnapshot().edges.bottom.ids).toEqual(['a', 'b']);
        expect(manager.getPanel('a')?.layout?.y).toBe(650);
        manager.setEdgeOrder('bottom', ['b', 'a']);
        expect(manager.getSnapshot().edges.bottom.ids).toEqual(['b', 'a']);
        expect(manager.getPanel('b')?.layout?.y).toBe(650);
    });
});

describe('serialize and hydrate', () => {
    it('round-trips the full state, including panels not mounted yet', () => {
        const source = createManager();
        source.register('a');
        source.open('a');
        source.dock('a', 'left');
        const state = source.serialize();
        expect(state.a).toMatchObject({ open: true, dock: 'left' });

        const target = createManager({ persist: { storage: memoryAdapter(), key: 'k', version: 1 } });
        target.hydrate({ ...state, later: { dock: 'right' } });
        target.register('a');
        target.register('later');
        target.hydrate({ a: state.a ?? {} });
        expect(target.getPanel('a')).toMatchObject({ open: true, dock: 'left', visible: true });
        expect(target.getPanel('later')?.dock).toBe('right');
    });
});
