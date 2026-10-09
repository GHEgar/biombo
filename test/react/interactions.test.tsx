import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BiomboProvider, createManager, useArea, usePanel, useSnapPreview, type Manager, type PanelConfig } from '../../src/react/index.js';

afterEach(cleanup);

beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
});

const CONFIG: PanelConfig = { dockable: ['bottom', 'right'], defaultSize: { width: 400, height: 200 } };

function Window({ id = 'w', config = CONFIG }: { id?: string; config?: PanelConfig }) {
    const panel = usePanel(id, config);
    return (
        <section {...panel.getWindowProps()} data-testid={id}>
            <header {...panel.getHandleProps()} data-testid={`${id}-handle`}>
                <button type="button" onClick={() => panel.close()}>close</button>
            </header>
            <div {...panel.getResizerProps()} data-testid={`${id}-dock-resizer`} />
            <div {...panel.getResizerProps('se')} data-testid={`${id}-corner`} />
        </section>
    );
}

function Probe() {
    const area = useArea();
    const snap = useSnapPreview();
    return <output data-testid="probe">{`${area.bottom}|${snap?.edge ?? '-'}`}</output>;
}

function setup(manager: Manager = createManager()) {
    render(<BiomboProvider manager={manager}><Window /><Probe /></BiomboProvider>);
    act(() => manager.open('w'));
    return manager;
}

const down = (element: HTMLElement, x: number, y: number) => fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: x, clientY: y });
const move = (x: number, y: number) => fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
const up = (x: number, y: number) => fireEvent.pointerUp(window, { pointerId: 1, clientX: x, clientY: y });

describe('interactions', () => {
    it('drags a floating window and saves the rect on release', () => {
        const manager = setup();
        expect(manager.getPanel('w')?.layout).toEqual({ x: 300, y: 300, width: 400, height: 200 });
        down(screen.getByTestId('w-handle'), 310, 310);
        move(360, 330);
        expect(manager.getSnapshot().interaction).toEqual({ id: 'w', kind: 'drag' });
        up(360, 330);
        expect(manager.getSnapshot().interaction).toBeNull();
        expect(manager.getPanel('w')?.rect).toEqual({ x: 350, y: 320, width: 400, height: 200 });
        expect(screen.getByTestId('w').style.left).toBe('350px');
    });

    it('ignores moves under the threshold and presses on buttons', () => {
        const manager = setup();
        down(screen.getByTestId('w-handle'), 310, 310);
        move(312, 311);
        up(312, 311);
        down(screen.getByText('close'), 310, 310);
        move(400, 400);
        up(400, 400);
        expect(manager.getPanel('w')?.rect).toEqual({ x: 300, y: 300, width: 400, height: 200 });
    });

    it('previews the snap and docks on release near an allowed edge', () => {
        const manager = setup();
        down(screen.getByTestId('w-handle'), 310, 310);
        move(500, 790);
        expect(screen.getByTestId('probe').textContent).toBe('0|bottom');
        up(500, 790);
        expect(manager.getPanel('w')?.dock).toBe('bottom');
        expect(screen.getByTestId('probe').textContent).toBe('320|-');
        expect(screen.getByTestId('w').getAttribute('data-dock')).toBe('bottom');
    });

    it('does not dock when the pointer is cancelled', () => {
        const manager = setup();
        down(screen.getByTestId('w-handle'), 310, 310);
        move(500, 790);
        fireEvent.pointerCancel(window, { pointerId: 1, clientX: 500, clientY: 790 });
        expect(manager.getPanel('w')?.dock).toBeNull();
        expect(screen.getByTestId('probe').textContent).toBe('0|-');
    });

    it('undocks a docked window after dragging past the undock threshold', () => {
        const manager = setup();
        manager.dock('w', 'bottom');
        down(screen.getByTestId('w-handle'), 500, 490);
        move(500, 480);
        expect(manager.getPanel('w')?.dock).toBe('bottom');
        move(500, 400);
        move(520, 380);
        up(520, 380);
        expect(manager.getPanel('w')?.dock).toBeNull();
        expect(manager.getPanel('w')?.rect).toEqual({ x: 320, y: 370, width: 400, height: 200 });
    });

    it('resizes the docked size live and commits on release', () => {
        const manager = setup();
        act(() => manager.dock('w', 'bottom'));
        const resizer = screen.getByTestId('w-dock-resizer');
        expect(resizer.getAttribute('aria-valuenow')).toBe('320');
        down(resizer, 500, 480);
        expect(manager.getSnapshot().interaction).toEqual({ id: 'w', kind: 'resize' });
        move(500, 380);
        up(500, 380);
        expect(manager.getSnapshot().interaction).toBeNull();
        expect(manager.getPanel('w')?.dockSize).toBe(420);
        expect(manager.getSnapshot().area.bottom).toBe(420);
    });

    it('resizes a floating window from a corner', () => {
        const manager = setup();
        down(screen.getByTestId('w-corner'), 700, 500);
        move(750, 520);
        up(750, 520);
        expect(manager.getPanel('w')?.rect).toEqual({ x: 300, y: 300, width: 450, height: 220 });
    });

    it('docked windows without undockOnDrag stay put', () => {
        const manager = createManager();
        render(<BiomboProvider manager={manager}><Window config={{ ...CONFIG, undockOnDrag: false }} /></BiomboProvider>);
        manager.open('w');
        manager.dock('w', 'bottom');
        down(screen.getByTestId('w-handle'), 500, 490);
        move(500, 200);
        up(500, 200);
        expect(manager.getPanel('w')?.dock).toBe('bottom');
    });
});
