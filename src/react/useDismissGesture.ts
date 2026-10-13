import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { useOptionalManager } from './context.js';
import { createFrame, trackDrag } from './pointer.js';

export type SwipeState = 'idle' | 'moving' | 'armed' | 'dismissed';

export type SwipeDirection = 1 | -1;

export interface UseDismissGestureOptions {
    onDismiss?: (direction: SwipeDirection) => void;
    axis?: 'x' | 'y';
    threshold?: number;
    lock?: number;
    pointerTypes?: readonly string[];
    exitMs?: number;
    id?: string;
    disabled?: boolean;
}

export interface GestureProps {
    'data-swipe': SwipeState;
    style: CSSProperties;
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface UseDismissGestureResult {
    getGestureProps: () => GestureProps;
    state: SwipeState;
    direction: SwipeDirection | 0;
    reset: () => void;
}

export const SWIPE_DEFAULTS = { threshold: 100, lock: 10, exitMs: 300 };

const TOUCH_ONLY: readonly string[] = ['touch'];

function write(element: HTMLElement | null, distance: number, progress: number): void {
    element?.style.setProperty('--biombo-swipe', `${Math.round(distance)}px`);
    element?.style.setProperty('--biombo-swipe-progress', String(Math.round(progress * 1000) / 1000));
}

export function useDismissGesture(ref: RefObject<HTMLElement | null>, options: UseDismissGestureOptions = {}): UseDismissGestureResult {
    const manager = useOptionalManager();
    const [state, setState] = useState<SwipeState>('idle');
    const [direction, setDirection] = useState<SwipeDirection | 0>(0);
    const latest = useRef(options);
    const stateRef = useRef<SwipeState>('idle');
    const directionRef = useRef<SwipeDirection | 0>(0);
    const exitRef = useRef<(() => void) | null>(null);
    const axis = options.axis ?? 'x';

    useEffect(() => {
        latest.current = options;
    });

    useEffect(() => () => exitRef.current?.(), []);

    const turn = useCallback((next: SwipeDirection | 0) => {
        if (directionRef.current !== next) {
            directionRef.current = next;
            setDirection(next);
        }
    }, []);

    const change = useCallback((next: SwipeState) => {
        if (stateRef.current !== next) {
            stateRef.current = next;
            setState(next);
        }
    }, []);

    const finish = useCallback((element: HTMLElement, sign: SwipeDirection) => {
        change('dismissed');
        turn(sign);
        const win = element.ownerDocument.defaultView;
        write(element, sign * (axis === 'x' ? win?.innerWidth ?? 0 : win?.innerHeight ?? 0), 1);
        const done = (): void => {
            exitRef.current?.();
            latest.current.onDismiss?.(sign);
            const id = latest.current.id;
            if (id && manager) {
                manager.close(id);
            }
        };
        const onTransitionEnd = (event: TransitionEvent): void => {
            if (event.target === element) {
                done();
            }
        };
        element.addEventListener('transitionend', onTransitionEnd);
        const timer = setTimeout(done, latest.current.exitMs ?? SWIPE_DEFAULTS.exitMs);
        exitRef.current = () => {
            clearTimeout(timer);
            element.removeEventListener('transitionend', onTransitionEnd);
            exitRef.current = null;
        };
    }, [axis, change, manager, turn]);

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const { disabled, pointerTypes = TOUCH_ONLY, threshold = SWIPE_DEFAULTS.threshold, lock = SWIPE_DEFAULTS.lock } = latest.current;
        if (disabled || event.button > 0 || !pointerTypes.includes(event.pointerType) || stateRef.current === 'dismissed') {
            return;
        }
        const element = ref.current ?? event.currentTarget;
        const start = { x: event.clientX, y: event.clientY };
        const frame = createFrame();
        let delta = 0;
        const along = (point: { x: number; y: number }): number => (axis === 'x' ? point.x - start.x : point.y - start.y);
        const across = (point: { x: number; y: number }): number => (axis === 'x' ? point.y - start.y : point.x - start.x);

        trackDrag(event.currentTarget, event, {
            threshold: lock,
            onStart: (point) => {
                if (Math.abs(across(point)) > Math.abs(along(point))) {
                    return false;
                }
                change('moving');
                return true;
            },
            onMove: (point) => {
                delta = along(point);
                turn(delta > 0 ? 1 : delta < 0 ? -1 : 0);
                const progress = Math.min(Math.abs(delta) / threshold, 1);
                change(Math.abs(delta) > threshold ? 'armed' : 'moving');
                frame.run(() => write(element, delta, progress));
            },
            onEnd: (started, cancelled) => {
                frame.flush();
                if (!started) {
                    return;
                }
                if (!cancelled && Math.abs(delta) > threshold) {
                    finish(element, delta > 0 ? 1 : -1);
                    return;
                }
                change('idle');
                turn(0);
                write(element, 0, 0);
            },
        });
    }, [ref, axis, change, finish, turn]);

    const reset = useCallback(() => {
        exitRef.current?.();
        change('idle');
        turn(0);
        write(ref.current, 0, 0);
    }, [ref, change, turn]);

    const getGestureProps = useCallback((): GestureProps => ({
        'data-swipe': state,
        style: { touchAction: axis === 'x' ? 'pan-y' : 'pan-x' },
        onPointerDown,
    }), [state, axis, onPointerDown]);

    return { getGestureProps, state, direction, reset };
}
