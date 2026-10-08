import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { createManager, type Manager } from '../core/manager.js';
import type { ManagerOptions } from '../core/types.js';

export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const BiomboContext = createContext<Manager | null>(null);

export interface BiomboProviderProps {
    manager?: Manager;
    options?: ManagerOptions;
    listenEscape?: boolean;
    trackViewport?: boolean;
    cycleKey?: string | false;
    children?: ReactNode;
}

export function BiomboProvider({ manager, options, listenEscape = true, trackViewport = true, cycleKey = 'F6', children }: BiomboProviderProps) {
    const [own] = useState(() => manager ?? createManager(options));
    const value = manager ?? own;

    useEffect(() => {
        if (!listenEscape || typeof window === 'undefined') {
            return undefined;
        }
        return value.escape.attach(window);
    }, [value, listenEscape]);

    useIsomorphicLayoutEffect(() => {
        if (!trackViewport || typeof window === 'undefined') {
            return undefined;
        }
        let frame = 0;
        const measure = (): void => {
            value.setViewport({ width: window.innerWidth, height: window.innerHeight });
        };
        const onResize = (): void => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        measure();
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', onResize);
        };
    }, [value, trackViewport]);

    useEffect(() => {
        if (!cycleKey || typeof window === 'undefined') {
            return undefined;
        }
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== cycleKey || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            const id = value.cycle(event.shiftKey ? -1 : 1);
            if (!id) {
                return;
            }
            event.preventDefault();
            const element = document.querySelector<HTMLElement>(`[data-biombo-panel="${CSS.escape(id)}"]`);
            element?.focus();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [value, cycleKey]);

    return <BiomboContext.Provider value={value}>{children}</BiomboContext.Provider>;
}

export function useOptionalManager(): Manager | null {
    return useContext(BiomboContext);
}

export function useManager(): Manager {
    const manager = useContext(BiomboContext);
    if (!manager) {
        throw new Error('biombo: useManager must be used inside <BiomboProvider>');
    }
    return manager;
}
