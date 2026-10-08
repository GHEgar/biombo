import { useEffect, useId, useRef } from 'react';
import { createEscapeStack, ESCAPE_PRIORITY, type EscapeStack } from '../core/escape.js';
import { useOptionalManager } from './context.js';

let standalone: EscapeStack | null = null;

function standaloneStack(): EscapeStack {
    if (!standalone) {
        standalone = createEscapeStack();
        if (typeof window !== 'undefined') {
            standalone.attach(window);
        }
    }
    return standalone;
}

export interface UseEscapeOptions {
    priority?: number;
    enabled?: boolean;
}

export function useEscape(handler: (event: KeyboardEvent) => unknown, options: UseEscapeOptions = {}): void {
    const manager = useOptionalManager();
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
        const stack = manager ? manager.escape : standaloneStack();
        return stack.push({
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
