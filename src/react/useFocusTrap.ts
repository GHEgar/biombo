import { useCallback, useRef, type RefObject } from 'react';
import { useIsomorphicLayoutEffect } from './context.js';
import { focusableIn, inertOthers, pushTrap, type TrapContain } from './focus.js';

export type InitialFocus = 'first' | 'container' | RefObject<HTMLElement | null> | false;

export interface UseFocusTrapOptions {
    active?: boolean;
    initialFocus?: InitialFocus;
    returnFocus?: boolean;
    contain?: TrapContain;
    inertOthers?: boolean;
}

export interface TrapProps {
    tabIndex: -1;
    'data-biombo-trap': '';
}

function focusInitial(container: HTMLElement, initial: InitialFocus): void {
    const active = container.ownerDocument.activeElement;
    if (initial === false || (active && active !== container && container.contains(active))) {
        return;
    }
    if (initial === 'container') {
        container.focus();
        return;
    }
    const target = initial === 'first' ? focusableIn(container)[0] : initial.current;
    (target ?? container).focus();
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, options: UseFocusTrapOptions = {}): { getTrapProps: () => TrapProps } {
    const { active = true, contain = 'strict' } = options;
    const withInert = options.inertOthers ?? contain === 'strict';
    const latest = useRef(options);

    useIsomorphicLayoutEffect(() => {
        latest.current = options;
    });

    useIsomorphicLayoutEffect(() => {
        const container = ref.current;
        if (!active || !container) {
            return undefined;
        }
        const doc = container.ownerDocument;
        const previous = doc.activeElement;
        const release = pushTrap(container, contain);
        const restoreInert = withInert ? inertOthers(container) : null;
        focusInitial(container, latest.current.initialFocus ?? 'first');
        return () => {
            restoreInert?.();
            release();
            const current = doc.activeElement;
            const lost = !current || current === doc.body || container.contains(current) || !current.isConnected;
            if ((latest.current.returnFocus ?? true) && lost && previous instanceof HTMLElement && previous.isConnected) {
                previous.focus();
            }
        };
    }, [ref, active, contain, withInert]);

    const getTrapProps = useCallback((): TrapProps => ({ tabIndex: -1, 'data-biombo-trap': '' }), []);

    return { getTrapProps };
}
