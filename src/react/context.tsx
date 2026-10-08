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
    children?: ReactNode;
}

export function BiomboProvider({ manager, options, listenEscape = true, trackViewport = true, children }: BiomboProviderProps) {
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

    return <BiomboContext.Provider value={value}>{children}</BiomboContext.Provider>;
}

export function useManager(): Manager {
    const manager = useContext(BiomboContext);
    if (!manager) {
        throw new Error('biombo: useManager must be used inside <BiomboProvider>');
    }
    return manager;
}
