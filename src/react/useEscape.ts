import { useEffect, useId, useRef } from 'react';
import { ESCAPE_PRIORITY } from '../core/escape.js';
import { useManager } from './context.js';

export interface UseEscapeOptions {
    priority?: number;
    enabled?: boolean;
}

export function useEscape(handler: (event: KeyboardEvent) => unknown, options: UseEscapeOptions = {}): void {
    const manager = useManager();
    const id = useId();
    const handlerRef = useRef(handler);
    const { priority = ESCAPE_PRIORITY.surface, enabled = true } = options;

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }
        return manager.escape.push({
            id: `escape:${id}`,
            priority,
            onEscape: (event) => handlerRef.current(event),
        });
    }, [manager, id, priority, enabled]);
}

export function useGlobalMode(onExit: () => void, active = true): void {
    useEscape(() => {
        onExit();
    }, { priority: ESCAPE_PRIORITY.mode, enabled: active });
}
