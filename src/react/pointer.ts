import type { Rect } from '../core/types.js';

export interface PointerHandlers {
    move: (event: PointerEvent) => void;
    end: (event: PointerEvent, cancelled: boolean) => void;
}

export function trackPointer(element: HTMLElement, pointerId: number, handlers: PointerHandlers): () => void {
    const doc = element.ownerDocument;
    const win = doc.defaultView;
    if (!win) {
        return () => undefined;
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
    return cleanup;
}

export interface Point {
    x: number;
    y: number;
}

export interface DragCallbacks {
    threshold: number;
    onStart?: (point: Point, event: PointerEvent) => boolean;
    onMove: (point: Point, event: PointerEvent) => void;
    onEnd: (started: boolean, cancelled: boolean, point: Point) => void;
}

const pointOf = (event: { clientX: number; clientY: number }): Point => ({ x: event.clientX, y: event.clientY });

export function trackDrag(handle: HTMLElement, event: { pointerId: number; clientX: number; clientY: number }, callbacks: DragCallbacks): () => void {
    const start = pointOf(event);
    let started = false;
    const stop = trackPointer(handle, event.pointerId, {
        move: (moveEvent) => {
            const point = pointOf(moveEvent);
            if (!started) {
                if (Math.hypot(point.x - start.x, point.y - start.y) < callbacks.threshold) {
                    return;
                }
                if (callbacks.onStart?.(point, moveEvent) === false) {
                    stop();
                    return;
                }
                started = true;
                capture(handle, moveEvent.pointerId);
            }
            callbacks.onMove(point, moveEvent);
        },
        end: (endEvent, cancelled) => callbacks.onEnd(started, cancelled, pointOf(endEvent)),
    });
    return stop;
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
