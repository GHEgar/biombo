import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { BiomboProvider, createManager, useEscape, useGlobalMode, usePanel, type Manager } from '../../src/react/index.js';

afterEach(cleanup);

function Panel({ id }: { id: string }) {
    const panel = usePanel(id);
    return (
        <>
            <button type="button" onClick={() => panel.toggle()}>{`toggle ${id}`}</button>
            <section {...panel.getWindowProps()} data-testid={id}>{id}</section>
        </>
    );
}

function Mode({ onExit }: { onExit: () => void }) {
    useGlobalMode(onExit);
    return null;
}

function setup(manager: Manager, children: React.ReactNode) {
    return render(
        <StrictMode>
            <BiomboProvider manager={manager}>{children}</BiomboProvider>
        </StrictMode>,
    );
}

const pressEscape = () => fireEvent.keyDown(document.body, { key: 'Escape' });

describe('usePanel', () => {
    it('opens, stacks and exposes window props', () => {
        const manager = createManager();
        setup(manager, <><Panel id="a" /><Panel id="b" /></>);
        expect(screen.getByTestId('a').hidden).toBe(true);
        expect(screen.getByTestId('a').style.display).toBe('none');
        fireEvent.click(screen.getByText('toggle a'));
        fireEvent.click(screen.getByText('toggle b'));
        const a = screen.getByTestId('a');
        const b = screen.getByTestId('b');
        expect(a.hidden).toBe(false);
        expect(b.style.zIndex).toBe('31');
        expect(b.hasAttribute('data-topmost')).toBe(true);
        fireEvent.pointerDown(a);
        expect(a.style.zIndex).toBe('31');
        expect(a.getAttribute('role')).toBe('dialog');
    });

    it('Escape closes the topmost panel, then the global mode', () => {
        const manager = createManager();
        const onExit = vi.fn();
        setup(manager, <><Panel id="a" /><Panel id="b" /><Mode onExit={onExit} /></>);
        fireEvent.click(screen.getByText('toggle a'));
        fireEvent.click(screen.getByText('toggle b'));
        pressEscape();
        expect(manager.getPanel('b')?.open).toBe(false);
        expect(manager.getPanel('a')?.open).toBe(true);
        expect(onExit).not.toHaveBeenCalled();
        pressEscape();
        pressEscape();
        expect(manager.getPanel('a')?.open).toBe(false);
        expect(onExit).toHaveBeenCalledOnce();
    });

    it('returns focus to the button that opened it', () => {
        const manager = createManager();
        setup(manager, <Panel id="a" />);
        const button = screen.getByText('toggle a');
        button.focus();
        fireEvent.click(button);
        act(() => {
            screen.getByTestId('a').focus();
        });
        pressEscape();
        expect(document.activeElement).toBe(button);
    });

    it('unregisters on unmount', () => {
        const manager = createManager();
        const view = setup(manager, <Panel id="a" />);
        expect(manager.getPanel('a')).not.toBeNull();
        view.unmount();
        expect(manager.getPanel('a')).toBeNull();
    });
});

describe('useEscape without provider', () => {
    it('falls back to a shared stack so only the latest layer closes', () => {
        const first = vi.fn();
        const second = vi.fn();
        function Layer({ onEscape }: { onEscape: () => void }) {
            useEscape(() => {
                onEscape();
            });
            return null;
        }
        render(<><Layer onEscape={first} /><Layer onEscape={second} /></>);
        pressEscape();
        expect(second).toHaveBeenCalledOnce();
        expect(first).not.toHaveBeenCalled();
    });
});
