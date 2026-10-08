import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BiomboProvider, createManager, moveId, usePanel, useTabs, type Manager } from '../../src/react/index.js';

afterEach(cleanup);

function Table({ id }: { id: string }) {
    usePanel(id, { group: 'tables' });
    return null;
}

function Strip({ onReorder }: { onReorder?: (ids: string[]) => void }) {
    const tabs = useTabs({ group: 'tables' }, onReorder ? { onReorder } : {});
    return (
        <div {...tabs.getTabListProps()}>
            {tabs.ids.map((id, index) => (
                <button
                    key={id}
                    type="button"
                    {...tabs.getTabProps(id)}
                    ref={(node) => {
                        if (node) {
                            node.getBoundingClientRect = () => ({ left: index * 100, width: 100, top: 0, height: 30 }) as DOMRect;
                        }
                    }}
                >
                    {id}
                </button>
            ))}
        </div>
    );
}

function setup(onReorder?: (ids: string[]) => void): Manager {
    const manager = createManager({ groups: { tables: { mode: 'single' } } });
    render(
        <BiomboProvider manager={manager}>
            <Table id="a" />
            <Table id="b" />
            <Table id="c" />
            <Strip {...(onReorder ? { onReorder } : {})} />
        </BiomboProvider>,
    );
    act(() => {
        manager.open('a');
        manager.open('b');
        manager.open('c');
    });
    return manager;
}

const order = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

describe('useTabs', () => {
    it('moveId inserts at the target index', () => {
        expect(moveId(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
        expect(moveId(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    });

    it('marks the active tab and activates on click', () => {
        const manager = setup();
        expect(screen.getByText('c').getAttribute('aria-selected')).toBe('true');
        expect(screen.getByText('c').tabIndex).toBe(0);
        fireEvent.click(screen.getByText('a'));
        expect(manager.getSnapshot().groups.tables?.active).toBe('a');
        expect(manager.getPanel('a')?.visible).toBe(true);
        expect(manager.getPanel('c')?.visible).toBe(false);
    });

    it('moves with arrow keys, Home and End, wrapping', () => {
        const manager = setup();
        fireEvent.keyDown(screen.getByText('c'), { key: 'ArrowRight' });
        expect(manager.getSnapshot().groups.tables?.active).toBe('a');
        expect(document.activeElement).toBe(screen.getByText('a'));
        fireEvent.keyDown(screen.getByText('a'), { key: 'End' });
        expect(manager.getSnapshot().groups.tables?.active).toBe('c');
        fireEvent.keyDown(screen.getByText('c'), { key: 'ArrowLeft' });
        expect(manager.getSnapshot().groups.tables?.active).toBe('b');
    });

    it('reorders by dragging and does not activate on the release click', () => {
        const manager = setup();
        fireEvent.pointerDown(screen.getByText('a'), { pointerId: 1, button: 0, clientX: 50 });
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 120 });
        expect(screen.getByText('a').hasAttribute('data-dragging')).toBe(true);
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 260 });
        fireEvent.pointerUp(window, { pointerId: 1, clientX: 260 });
        fireEvent.click(screen.getByText('a'));
        expect(order()).toEqual(['b', 'c', 'a']);
        expect(manager.getSnapshot().groups.tables?.active).toBe('c');
    });

    it('hands the new order to onReorder when controlled', () => {
        const onReorder = vi.fn();
        const manager = setup(onReorder);
        fireEvent.pointerDown(screen.getByText('c'), { pointerId: 1, button: 0, clientX: 250 });
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 20 });
        fireEvent.pointerUp(window, { pointerId: 1, clientX: 20 });
        expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);
        expect(order()).toEqual(['a', 'b', 'c']);
        act(() => manager.setGroupOrder('tables', ['c', 'a', 'b']));
        expect(order()).toEqual(['c', 'a', 'b']);
    });
});
