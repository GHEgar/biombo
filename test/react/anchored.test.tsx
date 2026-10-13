import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnchoredPosition, useDismissGesture, useDraggable, type AnchorTarget, type SwipeDirection } from '../../src/react/index.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect(this: HTMLElement) {
        const x = Number(this.style.left.replace('px', '') || this.dataset.x || 0);
        const y = Number(this.style.top.replace('px', '') || this.dataset.y || 0);
        const width = Number(this.dataset.w ?? 0);
        const height = Number(this.dataset.h ?? 0);
        return { x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) } as DOMRect;
    });
});

function Tip({ anchor, draggable = false }: { anchor: 'ref' | AnchorTarget; draggable?: boolean }) {
    const trigger = useRef<HTMLButtonElement>(null);
    const ref = useRef<HTMLDivElement>(null);
    const drag = useDraggable(ref, { margin: 10 });
    const anchored = useAnchoredPosition(ref, {
        anchor: anchor === 'ref' ? trigger : anchor,
        shift: drag.offset,
        paused: drag.dragging,
    });
    return (
        <>
            <button ref={trigger} type="button" data-x="400" data-y="40" data-w="40" data-h="20">?</button>
            <div ref={ref} {...anchored.getFloatingProps()} data-testid="tip" data-w="200" data-h="100">
                {draggable && <header {...drag.getHandleProps()} data-testid="grip">grip</header>}
                <output data-testid="arrow">{`${anchored.placement}|${anchored.arrow}|${anchored.ready}`}</output>
            </div>
        </>
    );
}

const down = (element: HTMLElement, x: number, y: number, pointerType = 'mouse') => fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: x, clientY: y, pointerType });
const move = (x: number, y: number) => fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
const up = (x: number, y: number) => fireEvent.pointerUp(window, { pointerId: 1, clientX: x, clientY: y });

describe('useAnchoredPosition', () => {
    it('places the surface next to its anchor, flipping when the preferred side is short', () => {
        render(<Tip anchor="ref" />);
        const tip = screen.getByTestId('tip');
        expect(tip.style.position).toBe('fixed');
        expect(tip.style.visibility).toBe('');
        expect(tip.dataset.placement).toBe('bottom');
        expect([tip.style.left, tip.style.top]).toEqual(['320px', '68px']);
        expect(screen.getByTestId('arrow').textContent).toBe('bottom|100|true');
    });

    it('anchors to a point and limits the height when nothing fits', () => {
        render(<Tip anchor={{ x: 500, y: 400 }} />);
        const tip = screen.getByTestId('tip');
        tip.dataset.h = '900';
        act(() => fireEvent(window, new Event('resize')));
        return vi.waitFor(() => {
            expect(tip.style.maxHeight).toBe('384px');
            expect(tip.style.top).toBe('8px');
        });
    });

    it('adds the drag offset and keeps the surface inside the viewport', () => {
        render(<Tip anchor={{ x: 500, y: 400 }} draggable />);
        const tip = screen.getByTestId('tip');
        expect([tip.style.left, tip.style.top]).toEqual(['400px', '292px']);
        down(screen.getByTestId('grip'), 410, 300);
        move(2000, 310);
        up(2000, 310);
        expect([tip.style.left, tip.style.top]).toEqual(['790px', '302px']);
    });
});

function Loose() {
    const ref = useRef<HTMLDivElement>(null);
    const drag = useDraggable(ref, { contain: 'full', margin: 10 });
    return (
        <div ref={ref} {...drag.getDraggableProps()} data-testid="loose" data-x="100" data-y="100" data-w="200" data-h="100">
            <header {...drag.getHandleProps()} data-testid="loose-grip"><button type="button">x</button></header>
            <output data-testid="loose-offset">{`${drag.offset.x},${drag.offset.y}|${drag.dragging}`}</output>
        </div>
    );
}

describe('useDraggable', () => {
    it('moves a loose element with left and top and keeps it on screen', () => {
        render(<Loose />);
        const grip = screen.getByTestId('loose-grip');
        down(grip, 110, 110);
        move(112, 111);
        expect(screen.getByTestId('loose-offset').textContent).toBe('0,0|false');
        move(60, 50);
        expect(screen.getByTestId('loose-offset').textContent).toBe('0,0|true');
        move(-500, 50);
        up(-500, 50);
        expect(screen.getByTestId('loose-offset').textContent).toBe('-90,-60|false');
        const loose = screen.getByTestId('loose');
        expect([loose.style.position, loose.style.left, loose.style.top]).toEqual(['fixed', '10px', '40px']);
    });

    it('ignores presses on controls inside the handle', () => {
        render(<Loose />);
        down(screen.getByText('x'), 110, 110);
        move(300, 300);
        up(300, 300);
        expect(screen.getByTestId('loose-offset').textContent).toBe('0,0|false');
    });
});

function Card({ onDismiss, pointerTypes }: { onDismiss: (direction: SwipeDirection) => void; pointerTypes?: readonly string[] }) {
    const ref = useRef<HTMLDivElement>(null);
    const gesture = useDismissGesture(ref, { onDismiss, exitMs: 200, ...(pointerTypes ? { pointerTypes } : {}) });
    return <div ref={ref} {...gesture.getGestureProps()} data-testid="card">{gesture.state}</div>;
}

describe('useDismissGesture', () => {
    it('arms past the threshold, flies out and calls onDismiss after the exit', () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        render(<Card onDismiss={onDismiss} />);
        const card = screen.getByTestId('card');
        expect(card.style.touchAction).toBe('pan-y');
        down(card, 100, 100, 'touch');
        move(150, 102);
        expect(card.dataset.swipe).toBe('moving');
        move(-30, 104);
        expect(card.dataset.swipe).toBe('armed');
        act(() => vi.advanceTimersByTime(20));
        expect(card.style.getPropertyValue('--biombo-swipe')).toBe('-130px');
        expect(card.style.getPropertyValue('--biombo-swipe-progress')).toBe('1');
        up(-30, 104);
        expect(card.dataset.swipe).toBe('dismissed');
        expect(card.style.getPropertyValue('--biombo-swipe')).toBe('-1000px');
        expect(onDismiss).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(200));
        expect(onDismiss).toHaveBeenCalledWith(-1);
    });

    it('springs back under the threshold and lets vertical moves scroll', () => {
        const onDismiss = vi.fn();
        render(<Card onDismiss={onDismiss} />);
        const card = screen.getByTestId('card');
        down(card, 100, 100, 'touch');
        move(160, 100);
        up(160, 100);
        expect(card.dataset.swipe).toBe('idle');
        expect(card.style.getPropertyValue('--biombo-swipe')).toBe('0px');
        down(card, 100, 100, 'touch');
        move(104, 140);
        move(300, 140);
        up(300, 140);
        expect(card.dataset.swipe).toBe('idle');
        expect(onDismiss).not.toHaveBeenCalled();
    });

    it('ignores the mouse by default and clears its timer on unmount', () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        const { unmount } = render(<Card onDismiss={onDismiss} />);
        const card = screen.getByTestId('card');
        down(card, 100, 100, 'mouse');
        move(400, 100);
        expect(card.dataset.swipe).toBe('idle');
        up(400, 100);
        cleanup();
        render(<Card onDismiss={onDismiss} pointerTypes={['mouse']} />);
        const mouseCard = screen.getByTestId('card');
        down(mouseCard, 100, 100, 'mouse');
        move(400, 100);
        up(400, 100);
        expect(mouseCard.dataset.swipe).toBe('dismissed');
        cleanup();
        act(() => vi.advanceTimersByTime(500));
        expect(onDismiss).not.toHaveBeenCalled();
        unmount();
    });
});
