import { describe, expect, it } from 'vitest';
import { createManager, memoryAdapter } from '../../src/core/index.js';

const KEY = 'test.paneles';

describe('persistence', () => {
    it('saves default fields and restores them on register', () => {
        const storage = memoryAdapter();
        const first = createManager({ persist: { storage, key: KEY, version: 1 } });
        first.register('a');
        first.open('a');
        first.dock('a', 'bottom');
        first.setDockSize('a', 300);
        const saved = JSON.parse(storage.get(KEY) ?? '{}');
        expect(saved).toEqual({ version: 1, panels: { a: { minimized: false, dock: 'bottom', dockSize: 300, rect: null } } });

        const second = createManager({ persist: { storage, key: KEY, version: 1 } });
        second.register('a');
        expect(second.getPanel('a')).toMatchObject({ open: false, dock: 'bottom', dockSize: 300 });
    });

    it('persists open when asked', () => {
        const storage = memoryAdapter();
        const first = createManager({ persist: { storage, key: KEY, version: 1, fields: ['open'] } });
        first.register('a');
        first.open('a');
        const second = createManager({ persist: { storage, key: KEY, version: 1, fields: ['open'] } });
        second.register('a');
        expect(second.getPanel('a')?.visible).toBe(true);
    });

    it('drops data from another version unless migrated', () => {
        const seed = { [KEY]: JSON.stringify({ version: 1, panels: { a: { dock: 'bottom' } } }) };
        const plain = createManager({ persist: { storage: memoryAdapter(seed), key: KEY, version: 2 } });
        plain.register('a');
        expect(plain.getPanel('a')?.dock).toBeNull();

        const migrated = createManager({
            persist: {
                storage: memoryAdapter(seed),
                key: KEY,
                version: 2,
                migrate: (data) => data as Record<string, { dock: 'bottom' }>,
            },
        });
        migrated.register('a');
        expect(migrated.getPanel('a')?.dock).toBe('bottom');
    });

    it('survives corrupt data and keeps panels not mounted', () => {
        const corrupt = createManager({ persist: { storage: memoryAdapter({ [KEY]: '{nope' }), key: KEY, version: 1 } });
        corrupt.register('a');
        expect(corrupt.getPanel('a')?.dock).toBeNull();

        const storage = memoryAdapter({ [KEY]: JSON.stringify({ version: 1, panels: { ghost: { dock: 'left' } } }) });
        const manager = createManager({ persist: { storage, key: KEY, version: 1 } });
        manager.register('a');
        manager.open('a');
        expect(JSON.parse(storage.get(KEY) ?? '{}').panels.ghost).toEqual({ dock: 'left' });
    });

    it('skips panels with persist disabled', () => {
        const storage = memoryAdapter();
        const manager = createManager({ persist: { storage, key: KEY, version: 1 } });
        manager.register('a', { persist: false });
        manager.open('a');
        expect(JSON.parse(storage.get(KEY) ?? '{}').panels).toEqual({});
    });
});
