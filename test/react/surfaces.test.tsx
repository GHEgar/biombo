import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusableIn, lockScroll, Portal, useDismissOutside, useFocusTrap, useScrollLock } from '../../src/react/index.js';

afterEach(cleanup);

function Modal({ open, label, children, empty = false, inert = true }: { open: boolean; label: string; children?: ReactNode; empty?: boolean; inert?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const { getTrapProps } = useFocusTrap(ref, { active: open, inertOthers: inert });
    useScrollLock(open);
    if (!open) {
        return null;
    }
    return (
        <div ref={ref} {...getTrapProps()} data-testid={label}>
            {!empty && <button type="button">{`${label}-first`}</button>}
            {!empty && <button type="button">{`${label}-last`}</button>}
            {children}
        </div>
    );
}

function Page({ inner = false, empty = false, inert = true }: { inner?: boolean; empty?: boolean; inert?: boolean }) {
    const [open, setOpen] = useState(false);
    const [nested, setNested] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>trigger</button>
            <button type="button" onClick={() => setOpen(false)} data-testid="outside-close">outside</button>
            <div id="sibling"><button type="button">behind</button></div>
            <Modal open={open} label="outer" empty={empty} inert={inert}>
                {inner && <button type="button" onClick={() => setNested((value) => !value)}>nest</button>}
                <button type="button" data-testid="close" onClick={() => setOpen(false)}>close</button>
            </Modal>
            {nested && <Modal open label="inner" />}
        </>
    );
}

const tab = (shift = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey: shift });

describe('useFocusTrap', () => {
    it('focuses the first element and wraps Tab at both ends', () => {
        render(<Page />);
        screen.getByText('trigger').focus();
        fireEvent.click(screen.getByText('trigger'));
        expect(document.activeElement).toBe(screen.getByText('outer-first'));
        tab(true);
        expect(document.activeElement).toBe(screen.getByTestId('close'));
        tab();
        expect(document.activeElement).toBe(screen.getByText('outer-first'));
    });

    it('marks the rest of the page inert and returns focus to the trigger', () => {
        render(<Page />);
        const trigger = screen.getByText('trigger');
        trigger.focus();
        fireEvent.click(trigger);
        expect(document.getElementById('sibling')?.hasAttribute('inert')).toBe(true);
        expect(trigger.hasAttribute('inert')).toBe(true);
        fireEvent.click(screen.getByTestId('close'));
        expect(document.getElementById('sibling')?.hasAttribute('inert')).toBe(false);
        expect(document.activeElement).toBe(trigger);
    });

    it('pulls focus back when something outside takes it', () => {
        render(<Page inert={false} />);
        fireEvent.click(screen.getByText('trigger'));
        screen.getByText('outer-last').focus();
        expect(document.getElementById('sibling')?.hasAttribute('inert')).toBe(false);
        act(() => screen.getByText('behind').focus());
        expect(document.activeElement).toBe(screen.getByText('outer-last'));
    });

    it('focuses the container when it has nothing focusable', () => {
        render(<Page empty />);
        fireEvent.click(screen.getByText('trigger'));
        const close = screen.getByTestId('close');
        close.setAttribute('hidden', '');
        tab();
        expect(document.activeElement).toBe(screen.getByTestId('outer'));
    });

    it('only the topmost trap answers and the previous one resumes', () => {
        render(<Page inner />);
        fireEvent.click(screen.getByText('trigger'));
        const nest = screen.getByText('nest');
        nest.focus();
        fireEvent.click(nest);
        expect(document.activeElement).toBe(screen.getByText('inner-first'));
        expect(screen.getByTestId('outer').hasAttribute('inert')).toBe(true);
        screen.getByText('inner-last').focus();
        tab();
        expect(document.activeElement).toBe(screen.getByText('inner-first'));
        act(() => screen.getByText('outer-first').focus());
        expect(document.activeElement).toBe(screen.getByText('inner-first'));
        fireEvent.click(nest);
        expect(screen.queryByTestId('inner')).toBeNull();
        expect(screen.getByTestId('outer').hasAttribute('inert')).toBe(false);
        expect(document.activeElement).toBe(nest);
        screen.getByTestId('close').focus();
        tab();
        expect(document.activeElement).toBe(screen.getByText('outer-first'));
    });
});

describe('useScrollLock', () => {
    it('counts nested locks and restores the original style', () => {
        document.body.style.overflow = 'scroll';
        const first = lockScroll();
        const second = lockScroll();
        expect(document.body.style.overflow).toBe('hidden');
        first();
        first();
        expect(document.body.style.overflow).toBe('hidden');
        second();
        expect(document.body.style.overflow).toBe('scroll');
        document.body.style.overflow = '';
    });
});

function Surface({ label, onDismiss, portal = false }: { label: string; onDismiss: () => void; portal?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const { getDismissProps } = useDismissOutside(ref, onDismiss);
    return (
        <div ref={ref} {...getDismissProps()} data-testid={label}>
            {label}
            {portal && <Portal><button type="button">{`${label}-portaled`}</button></Portal>}
        </div>
    );
}

const press = (element: Element, upOn: Element = element) => {
    fireEvent.pointerDown(element, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(upOn, { pointerId: 1, button: 0 });
};

describe('useDismissOutside', () => {
    it('dismisses only on a press that starts and ends outside', () => {
        const onDismiss = vi.fn();
        render(<><button type="button">elsewhere</button><Surface label="menu" onDismiss={onDismiss} /></>);
        press(screen.getByTestId('menu'));
        press(screen.getByTestId('menu'), screen.getByText('elsewhere'));
        expect(onDismiss).not.toHaveBeenCalled();
        press(screen.getByText('elsewhere'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('lets the topmost surface answer and treats portaled children as inside', () => {
        const outer = vi.fn();
        const inner = vi.fn();
        render(
            <>
                <button type="button">elsewhere</button>
                <Surface label="outer" onDismiss={outer} />
                <Surface label="inner" onDismiss={inner} portal />
            </>,
        );
        press(screen.getByText('inner-portaled'));
        expect(inner).not.toHaveBeenCalled();
        press(screen.getByTestId('outer'));
        expect(inner).toHaveBeenCalledTimes(1);
        expect(outer).not.toHaveBeenCalled();
    });
});

describe('Portal', () => {
    it('renders into body or into the given container', () => {
        const target = document.createElement('section');
        document.body.append(target);
        render(<div data-testid="host"><Portal><span>in body</span></Portal><Portal container={target}><span>in target</span></Portal></div>);
        expect(screen.getByTestId('host').textContent).toBe('');
        expect(screen.getByText('in body').parentElement).toBe(document.body);
        expect(screen.getByText('in target').parentElement).toBe(target);
        target.remove();
    });
});

describe('focusableIn without checkVisibility', () => {
    it('falls back to computed display and visibility', () => {
        const original = HTMLElement.prototype.checkVisibility;
        Object.defineProperty(HTMLElement.prototype, 'checkVisibility', { configurable: true, value: undefined });
        document.body.innerHTML = '<div id="c"><button>a</button><div style="display:none"><button>b</button></div><button style="visibility:hidden">c</button><button disabled>d</button><a href="#">e</a></div>';
        const names = focusableIn(document.getElementById('c') as HTMLElement).map((element) => element.textContent);
        Object.defineProperty(HTMLElement.prototype, 'checkVisibility', { configurable: true, value: original });
        document.body.innerHTML = '';
        expect(names).toEqual(['a', 'e']);
    });
});
