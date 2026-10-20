import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BiomboProvider, createManager, neededHeight, useAutoHeight, usePanel, type Manager } from '../../src/react/index.js';

const HEADER = 30;

function Legend({ items, enabled = true }: { items: string[]; enabled?: boolean }) {
    const panel = usePanel('legend', { minimizable: true, initial: { open: true, rect: { x: 0, y: 0, width: 200, height: 300 } } });
    const content = useAutoHeight('legend', { max: 500, enabled });
    const height = panel.state.rect?.height ?? 0;
    return (
        <>
            <section {...panel.getWindowProps()} data-testid="window" data-h={height}>
                <header data-h={HEADER} />
                <div ref={content} data-testid="body" data-client={height - HEADER}>
                    {items.map((item) => <p key={item} data-h="20">{item}</p>)}
                    <i style={{ position: 'absolute' }} data-h="999" />
                </div>
            </section>
            <button {...panel.getRestoreProps()}>restore</button>
        </>
    );
}

const mount = (manager: Manager, items: string[], enabled?: boolean) => render(
    <BiomboProvider manager={manager} trackViewport={false}><Legend items={items} enabled={enabled ?? true} /></BiomboProvider>,
);

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        return { height: Number(this.dataset.h ?? 0) } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return Number(this.dataset.client ?? 0);
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('useAutoHeight', () => {
    it('fits the window to its content and follows new content', async () => {
        const manager = createManager();
        manager.setViewport({ width: 1000, height: 800 });
        const view = mount(manager, ['a', 'b', 'c']);
        await waitFor(() => expect(manager.getPanel('legend')?.rect?.height).toBe(90));
        expect(neededHeight(screen.getByTestId('body'))).toBe(90);
        view.rerender(<BiomboProvider manager={manager} trackViewport={false}><Legend items={['a', 'b', 'c', 'd', 'e']} /></BiomboProvider>);
        await waitFor(() => expect(manager.getPanel('legend')?.rect?.height).toBe(130));
    });

    it('does nothing when disabled or outside a panel', () => {
        const manager = createManager();
        manager.setViewport({ width: 1000, height: 800 });
        mount(manager, ['a'], false);
        expect(manager.getPanel('legend')?.rect?.height).toBe(300);
        expect(neededHeight(document.createElement('div'))).toBeNull();
    });

    it('waits for a resize by hand to end', async () => {
        const manager = createManager();
        manager.setViewport({ width: 1000, height: 800 });
        mount(manager, ['a', 'b', 'c']);
        await waitFor(() => expect(manager.getPanel('legend')?.rect?.height).toBe(90));
        act(() => manager.setInteraction({ id: 'legend', kind: 'resize' }));
        act(() => manager.setRect('legend', { x: 0, y: 0, width: 200, height: 400 }));
        expect(manager.getPanel('legend')?.rect?.height).toBe(400);
        act(() => manager.setInteraction(null));
        await waitFor(() => expect(manager.getPanel('legend')?.rect?.height).toBe(90));
    });
});

describe('getRestoreProps', () => {
    it('shows a restore button only while minimized', () => {
        const manager = createManager();
        mount(manager, ['a'], false);
        const button = screen.getByText('restore');
        expect(button.hidden).toBe(true);
        expect(button.getAttribute('type')).toBe('button');
        expect(button.getAttribute('data-biombo-restore')).toBe('legend');
        act(() => manager.minimize('legend'));
        expect(button.hidden).toBe(false);
        fireEvent.click(button);
        expect(manager.getPanel('legend')?.minimized).toBe(false);
        expect(button.hidden).toBe(true);
    });
});
