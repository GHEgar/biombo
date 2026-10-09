import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { BiomboProvider, createManager, useClearance, useCompact, useObstacle, usePanel, type Rect } from '../../src/react/index.js';

afterEach(cleanup);

function setViewport(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    fireEvent(window, new Event('resize'));
}

function fakeRect(element: HTMLElement, rect: Rect) {
    element.getBoundingClientRect = () => ({
        x: rect.x, y: rect.y, left: rect.x, top: rect.y, width: rect.width, height: rect.height,
        right: rect.x + rect.width, bottom: rect.y + rect.height, toJSON: () => rect,
    });
}

function Panel({ id }: { id: string }) {
    const panel = usePanel(id, { dockable: ['bottom'], defaultSize: { width: 300, height: 200 } });
    const compact = useCompact();
    return <section {...panel.getWindowProps()} data-testid={id} data-compact={String(compact)}>{id}</section>;
}

describe('compact presentation', () => {
    it('renders a bottom sheet with functional styles below the breakpoint', async () => {
        setViewport(400, 800);
        const manager = createManager();
        render(<BiomboProvider manager={manager}><Panel id="a" /></BiomboProvider>);
        act(() => manager.open('a'));
        const element = screen.getByTestId('a');
        expect(element.getAttribute('data-presentation')).toBe('sheet');
        expect(element.getAttribute('data-compact')).toBe('true');
        expect(element.style.bottom).toBe('0px');
        expect(element.style.left).toBe('0px');
        expect(element.style.right).toBe('0px');
        expect(element.style.maxHeight).toBe('680px');
        setViewport(1000, 800);
        await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
        expect(element.getAttribute('data-presentation')).toBe('floating');
        expect(element.style.width).toBe('300px');
    });
});

describe('F6', () => {
    it('cycles focus across visible panels', () => {
        setViewport(1000, 800);
        const manager = createManager();
        render(<BiomboProvider manager={manager}><Panel id="a" /><Panel id="b" /></BiomboProvider>);
        act(() => {
            manager.open('a');
            manager.open('b');
        });
        fireEvent.keyDown(window, { key: 'F6' });
        expect(document.activeElement).toBe(screen.getByTestId('a'));
        expect(manager.getPanel('a')?.topmost).toBe(true);
        fireEvent.keyDown(window, { key: 'F6' });
        expect(document.activeElement).toBe(screen.getByTestId('b'));
        fireEvent.keyDown(window, { key: 'F6', shiftKey: true });
        expect(document.activeElement).toBe(screen.getByTestId('a'));
    });
});

function Pill({ obstacle, groups }: { obstacle: Rect; groups?: string[] }) {
    const pillRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef<HTMLDivElement>(null);
    useObstacle(scaleRef, { group: 'controls' });
    const bottom = useClearance(pillRef, { side: 'bottom', base: 12, panels: false, ...(groups ? { groups } : {}) });
    return (
        <>
            <div ref={(node) => { if (node) fakeRect(node, obstacle); scaleRef.current = node; }} />
            <div ref={(node) => { if (node) fakeRect(node, { x: 100, y: 760, width: 200, height: 30 }); pillRef.current = node; }} data-testid="pill" style={{ bottom }} />
        </>
    );
}

describe('useClearance', () => {
    it('lifts an element over registered obstacles', () => {
        setViewport(1000, 800);
        const manager = createManager();
        render(<BiomboProvider manager={manager}><Pill obstacle={{ x: 50, y: 770, width: 150, height: 20 }} /></BiomboProvider>);
        expect(screen.getByTestId('pill').style.bottom).toBe('38px');
    });

    it('only counts the requested obstacle groups', () => {
        setViewport(1000, 800);
        const manager = createManager();
        render(<BiomboProvider manager={manager}><Pill obstacle={{ x: 50, y: 770, width: 150, height: 20 }} groups={['panels']} /></BiomboProvider>);
        expect(screen.getByTestId('pill').style.bottom).toBe('12px');
    });
});

describe('helpers without provider', () => {
    it('do not throw: clearance returns the base and obstacles are ignored', () => {
        render(<Pill obstacle={{ x: 50, y: 770, width: 150, height: 20 }} />);
        expect(screen.getByTestId('pill').style.bottom).toBe('12px');
    });
});
