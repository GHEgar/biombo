import type { Rect } from '../core/types.js';

export interface PointerHandlers {
    move: (event: PointerEvent) => void;
    end: (event: PointerEvent, cancelled: boolean) => void;
}

export function trackPointer(element: HTMLElement, pointerId: number, handlers: PointerHandlers): void {
    const doc = element.ownerDocument;
    const win = doc.defaultView;
    if (!win) {
        return;
    }
    const previousSelect = doc.body.style.userSelect;
    doc.body.style.userSelect = 'none';

    const move = (event: PointerEvent): void => {
        if (event.pointerId === pointerId) {
            handlers.move(event);
        }
    };
    const cleanup = (): void => {
        win.removeEventListener('pointermove', move);
        win.removeEventListener('pointerup', up);
        win.removeEventListener('pointercancel', cancel);
        doc.body.style.userSelect = previousSelect;
        release(element, pointerId);
    };
    const finish = (cancelled: boolean) => (event: PointerEvent): void => {
        if (event.pointerId !== pointerId) {
            return;
        }
        cleanup();
        handlers.end(event, cancelled);
    };
    const up = finish(false);
    const cancel = finish(true);

    win.addEventListener('pointermove', move);
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', cancel);
}

export function capture(element: HTMLElement, pointerId: number): void {
    try {
        element.setPointerCapture(pointerId);
    } catch {
        return;
    }
}

function release(element: HTMLElement, pointerId: number): void {
    try {
        if (element.hasPointerCapture?.(pointerId)) {
            element.releasePointerCapture(pointerId);
        }
    } catch {
        return;
    }
}

export function createFrame(): { run: (task: () => void) => void; flush: () => void } {
    let pending: (() => void) | null = null;
    let handle = 0;
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16) as unknown as number;
    const caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id: number) => clearTimeout(id);
    const flush = (): void => {
        caf(handle);
        const task = pending;
        pending = null;
        task?.();
    };
    return {
        run: (task) => {
            const scheduled = pending !== null;
            pending = task;
            if (!scheduled) {
                handle = raf(() => {
                    const next = pending;
                    pending = null;
                    next?.();
                });
            }
        },
        flush,
    };
}

export function applyRect(element: HTMLElement | null, rect: Rect, withSize = false): void {
    if (!element) {
        return;
    }
    element.style.left = `${rect.x}px`;
    element.style.top = `${rect.y}px`;
    if (withSize) {
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;
    }
}

export function measure(element: HTMLElement | null): Rect | null {
    if (!element) {
        return null;
    }
    const box = element.getBoundingClientRect();
    return { x: box.left, y: box.top, width: box.width, height: box.height };
}
