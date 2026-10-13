import { useCallback, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ANCHOR_DEFAULTS, placeAnchored, type AnchoredPlacement, type AnchorOptions, type Side } from '../core/anchor.js';
import { containRect } from '../core/layout.js';
import type { Rect } from '../core/types.js';
import { boundaryRect, type Boundary } from './bounds.js';
import { useIsomorphicLayoutEffect, useOptionalManager } from './context.js';
import { createFrame, type Point } from './pointer.js';

export type AnchorTarget = RefObject<Element | null> | Rect | Point | null;

export interface UseAnchoredPositionOptions extends AnchorOptions {
    anchor: AnchorTarget;
    open?: boolean;
    boundary?: Boundary;
    shift?: Point;
    paused?: boolean;
}

export interface FloatingPropsInput {
    style?: CSSProperties;
}

export interface FloatingProps {
    style: CSSProperties;
    'data-placement': Side;
    'data-outside'?: '';
}

export interface UseAnchoredPositionResult {
    getFloatingProps: (input?: FloatingPropsInput) => FloatingProps;
    placement: Side;
    arrow: number;
    ready: boolean;
    outside: boolean;
    update: () => void;
}

const isRef = (anchor: AnchorTarget): anchor is RefObject<Element | null> => !!anchor && 'current' in anchor;

function anchorRect(anchor: AnchorTarget): Rect | null {
    if (!anchor) {
        return null;
    }
    if (isRef(anchor)) {
        const box = anchor.current?.getBoundingClientRect();
        return box ? { x: box.left, y: box.top, width: box.width, height: box.height } : null;
    }
    return 'width' in anchor ? anchor : { x: anchor.x, y: anchor.y, width: 0, height: 0 };
}

const samePlacement = (a: AnchoredPlacement | null, b: AnchoredPlacement): boolean => !!a
    && a.x === b.x && a.y === b.y && a.placement === b.placement && a.arrow === b.arrow
    && a.maxHeight === b.maxHeight && a.maxWidth === b.maxWidth && a.outside === b.outside;

function setLimit(element: HTMLElement, property: 'maxHeight' | 'maxWidth', value: number | null): void {
    element.style[property] = value === null ? '' : `${value}px`;
}

export function useAnchoredPosition(ref: RefObject<HTMLElement | null>, options: UseAnchoredPositionOptions): UseAnchoredPositionResult {
    const manager = useOptionalManager();
    const { anchor, open = true, boundary = 'viewport', paused = false, shift, ...anchorOptions } = options;
    const { placement, align, offset, margin, arrowPadding } = anchorOptions;
    const shiftX = shift?.x ?? 0;
    const shiftY = shift?.y ?? 0;
    const [result, setResult] = useState<AnchoredPlacement | null>(null);
    const computeRef = useRef<() => void>(() => undefined);
    const anchorKey = isRef(anchor) ? anchor : JSON.stringify(anchor);

    useIsomorphicLayoutEffect(() => {
        computeRef.current = () => {
            const element = ref.current;
            const target = anchorRect(anchor);
            if (!element || !target || !open || paused) {
                return;
            }
            setLimit(element, 'maxHeight', null);
            setLimit(element, 'maxWidth', null);
            const box = element.getBoundingClientRect();
            const bounds = boundaryRect(manager, boundary);
            const placed = placeAnchored(target, { width: box.width, height: box.height }, bounds, anchorOptions);
            let next = placed;
            if (shiftX !== 0 || shiftY !== 0) {
                const height = placed.maxHeight ?? box.height;
                const moved = containRect({ x: placed.x + shiftX, y: placed.y + shiftY, width: box.width, height }, bounds, margin ?? ANCHOR_DEFAULTS.margin);
                next = { ...placed, x: moved.x, y: moved.y, maxHeight: moved.maxHeight ?? placed.maxHeight };
            }
            setLimit(element, 'maxHeight', next.maxHeight);
            setLimit(element, 'maxWidth', next.maxWidth);
            setResult((previous) => (samePlacement(previous, next) ? previous : next));
        };
    });

    useIsomorphicLayoutEffect(() => {
        if (!open || paused || typeof window === 'undefined') {
            return undefined;
        }
        computeRef.current();
        const frame = createFrame();
        const schedule = (): void => frame.run(() => computeRef.current());
        window.addEventListener('resize', schedule);
        document.addEventListener('scroll', schedule, { capture: true, passive: true });
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
        if (ref.current) {
            observer?.observe(ref.current);
        }
        if (isRef(anchor) && anchor.current) {
            observer?.observe(anchor.current);
        }
        const unsubscribe = boundary === 'area' && manager ? manager.subscribe(schedule) : null;
        return () => {
            window.removeEventListener('resize', schedule);
            document.removeEventListener('scroll', schedule, { capture: true });
            observer?.disconnect();
            unsubscribe?.();
        };
    }, [ref, anchorKey, open, paused, boundary, manager, placement, align, offset, margin, arrowPadding, shiftX, shiftY]);

    const update = useCallback(() => computeRef.current(), []);
    const ready = open && result !== null;
    const side = result?.placement ?? placement ?? 'top';

    const getFloatingProps = useCallback((input: FloatingPropsInput = {}): FloatingProps => {
        const style: CSSProperties = { ...input.style, position: 'fixed', left: result?.x ?? 0, top: result?.y ?? 0 };
        if (!ready) {
            style.visibility = 'hidden';
        }
        const props: FloatingProps = { style, 'data-placement': side };
        if (result?.outside) {
            props['data-outside'] = '';
        }
        return props;
    }, [result, ready, side]);

    return { getFloatingProps, placement: side, arrow: result?.arrow ?? 0, ready, outside: result?.outside ?? false, update };
}
