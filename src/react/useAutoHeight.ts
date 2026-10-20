import { useCallback, useEffect, useState, type RefCallback } from 'react';
import type { FitHeightOptions } from '../core/types.js';
import { useManager } from './context.js';

export interface UseAutoHeightOptions extends FitHeightOptions {
    enabled?: boolean;
}

const pixels = (value: string): number => Number.parseFloat(value) || 0;

const inFlow = (element: Element): boolean => {
    const position = getComputedStyle(element).position;
    return position !== 'absolute' && position !== 'fixed';
};

export function contentHeight(content: HTMLElement): number {
    const style = getComputedStyle(content);
    const children = Array.from(content.children).filter(inFlow);
    const stacked = children.reduce((sum, child) => {
        const margins = getComputedStyle(child);
        return sum + child.getBoundingClientRect().height + pixels(margins.marginTop) + pixels(margins.marginBottom);
    }, 0);
    const gap = /flex|grid/.test(style.display) ? pixels(style.rowGap) * Math.max(0, children.length - 1) : 0;
    return stacked + gap + pixels(style.paddingTop) + pixels(style.paddingBottom);
}

export function neededHeight(content: HTMLElement): number | null {
    const window = content.closest('[data-biombo-panel]');
    if (!window) {
        return null;
    }
    return window.getBoundingClientRect().height - content.clientHeight + contentHeight(content);
}

export function useAutoHeight(id: string, options: UseAutoHeightOptions = {}): RefCallback<HTMLElement> {
    const manager = useManager();
    const [content, setContent] = useState<HTMLElement | null>(null);
    const { enabled = true, ...fit } = options;
    const key = JSON.stringify(fit);

    useEffect(() => {
        if (!content || !enabled) {
            return undefined;
        }
        const fitOptions = JSON.parse(key) as FitHeightOptions;
        const measure = (): void => {
            if (manager.getSnapshot().interaction?.id === id) {
                return;
            }
            const height = neededHeight(content);
            if (height !== null) {
                manager.fitHeight(id, height, fitOptions);
            }
        };
        measure();
        const unsubscribe = manager.subscribe(() => {
            if (manager.getSnapshot().interaction === null) {
                measure();
            }
        });
        if (typeof ResizeObserver === 'undefined') {
            return unsubscribe;
        }
        const resize = new ResizeObserver(measure);
        const observe = (): void => {
            resize.disconnect();
            resize.observe(content);
            Array.from(content.children).forEach((child) => resize.observe(child));
        };
        observe();
        const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
            observe();
            measure();
        });
        mutations?.observe(content, { childList: true });
        return () => {
            unsubscribe();
            resize.disconnect();
            mutations?.disconnect();
        };
    }, [manager, id, content, enabled, key]);

    return useCallback<RefCallback<HTMLElement>>((element) => setContent(element), []);
}
