import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

export interface UseDismissOutsideOptions {
    active?: boolean;
    ignore?: ReadonlyArray<RefObject<Element | null>>;
}

export interface DismissProps {
    onPointerDownCapture: (event: ReactPointerEvent<Element>) => void;
}

interface Layer {
    contains: (target: EventTarget | null) => boolean;
    dismiss: (event: PointerEvent) => void;
    reactInside: boolean;
}

const layers: Layer[] = [];
let pending: { layer: Layer; outside: boolean; pointerId: number } | null = null;
let detach: (() => void) | null = null;

function onDown(event: PointerEvent): void {
    const layer = layers[layers.length - 1];
    if (!layer || event.button > 0) {
        pending = null;
        return;
    }
    layer.reactInside = false;
    pending = { layer, outside: !layer.contains(event.target), pointerId: event.pointerId };
}

function onUp(event: PointerEvent): void {
    const current = pending;
    pending = null;
    if (!current || current.pointerId !== event.pointerId || layers[layers.length - 1] !== current.layer) {
        return;
    }
    const { layer } = current;
    if (current.outside && !layer.reactInside && !layer.contains(event.target)) {
        layer.dismiss(event);
    }
}

function onCancel(): void {
    pending = null;
}

function attach(win: Window): () => void {
    win.addEventListener('pointerdown', onDown, true);
    win.addEventListener('pointerup', onUp, true);
    win.addEventListener('pointercancel', onCancel, true);
    return () => {
        win.removeEventListener('pointerdown', onDown, true);
        win.removeEventListener('pointerup', onUp, true);
        win.removeEventListener('pointercancel', onCancel, true);
    };
}

export function useDismissOutside(
    ref: RefObject<Element | null>,
    onDismiss: (event: PointerEvent) => void,
    options: UseDismissOutsideOptions = {},
): { getDismissProps: () => DismissProps } {
    const { active = true } = options;
    const latest = useRef({ onDismiss, ignore: options.ignore });
    const layerRef = useRef<Layer | null>(null);

    useEffect(() => {
        latest.current = { onDismiss, ignore: options.ignore };
    });

    useEffect(() => {
        if (!active || typeof window === 'undefined') {
            return undefined;
        }
        const layer: Layer = {
            reactInside: false,
            contains: (target) => {
                if (!(target instanceof Node)) {
                    return false;
                }
                const refs = [ref, ...(latest.current.ignore ?? [])];
                return refs.some((item) => !!item.current?.contains(target));
            },
            dismiss: (event) => latest.current.onDismiss(event),
        };
        layers.push(layer);
        layerRef.current = layer;
        detach ??= attach(window);
        return () => {
            layers.splice(layers.indexOf(layer), 1);
            layerRef.current = null;
            if (pending?.layer === layer) {
                pending = null;
            }
            if (layers.length === 0) {
                detach?.();
                detach = null;
            }
        };
    }, [ref, active]);

    const getDismissProps = useCallback((): DismissProps => ({
        onPointerDownCapture: () => {
            if (layerRef.current) {
                layerRef.current.reactInside = true;
            }
        },
    }), []);

    return { getDismissProps };
}
