import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { DEFAULT_CONTAIN_MARGIN } from '../core/geometry.js';
import type { ContainMode, Rect } from '../core/types.js';
import { boundaryRect, fitInto, type Boundary } from './bounds.js';
import { useOptionalManager } from './context.js';
import { DRAG_THRESHOLD, isBlocked } from './interactions.js';
import { applyRect, createFrame, measure, trackDrag, type Point } from './pointer.js';

export interface UseDraggableOptions {
    contain?: ContainMode | false;
    margin?: number;
    boundary?: Boundary;
    disabled?: boolean;
    onDragEnd?: (offset: Point) => void;
}

export interface DraggableHandleProps {
    'data-biombo-handle': '';
    style: CSSProperties;
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface DraggableProps {
    style: CSSProperties;
    'data-dragging'?: '';
}

export interface UseDraggableResult {
    getHandleProps: () => DraggableHandleProps;
    getDraggableProps: (input?: { style?: CSSProperties }) => DraggableProps;
    offset: Point;
    position: Point | null;
    dragging: boolean;
    reset: () => void;
}

const ORIGIN: Point = { x: 0, y: 0 };

export function useDraggable(ref: RefObject<HTMLElement | null>, options: UseDraggableOptions = {}): UseDraggableResult {
    const manager = useOptionalManager();
    const [offset, setOffset] = useState<Point>(ORIGIN);
    const [position, setPosition] = useState<Point | null>(null);
    const [dragging, setDragging] = useState(false);
    const offsetRef = useRef<Point>(ORIGIN);
    const latest = useRef(options);

    useEffect(() => {
        latest.current = options;
    });

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const element = ref.current;
        const base = measure(element);
        if (event.button !== 0 || latest.current.disabled || !element || !base || isBlocked(event)) {
            return;
        }
        const { contain = 'full', margin = DEFAULT_CONTAIN_MARGIN, boundary = 'viewport' } = latest.current;
        const start = { x: event.clientX, y: event.clientY };
        const startOffset = offsetRef.current;
        const frame = createFrame();
        let current: Rect = base;

        trackDrag(event.currentTarget, event, {
            threshold: DRAG_THRESHOLD,
            onStart: () => {
                if (element.ownerDocument.defaultView?.getComputedStyle(element).position !== 'fixed') {
                    element.style.position = 'fixed';
                }
                setDragging(true);
                return true;
            },
            onMove: (point, moveEvent) => {
                moveEvent.preventDefault();
                const moved = { ...base, x: base.x + point.x - start.x, y: base.y + point.y - start.y };
                current = fitInto(moved, boundaryRect(manager, boundary), contain, margin);
                const next = current;
                frame.run(() => applyRect(element, next));
            },
            onEnd: (started) => {
                frame.flush();
                if (!started) {
                    return;
                }
                const next = { x: startOffset.x + current.x - base.x, y: startOffset.y + current.y - base.y };
                offsetRef.current = next;
                setOffset(next);
                setPosition({ x: current.x, y: current.y });
                setDragging(false);
                latest.current.onDragEnd?.(next);
            },
        });
    }, [ref, manager]);

    const reset = useCallback(() => {
        offsetRef.current = ORIGIN;
        setOffset(ORIGIN);
        setPosition(null);
    }, []);

    const getHandleProps = useCallback((): DraggableHandleProps => ({
        'data-biombo-handle': '',
        style: { touchAction: 'none' },
        onPointerDown,
    }), [onPointerDown]);

    const getDraggableProps = useCallback((input: { style?: CSSProperties } = {}): DraggableProps => {
        const style: CSSProperties = position ? { ...input.style, position: 'fixed', left: position.x, top: position.y } : { ...input.style };
        return dragging ? { style, 'data-dragging': '' } : { style };
    }, [position, dragging]);

    return { getHandleProps, getDraggableProps, offset, position, dragging, reset };
}
