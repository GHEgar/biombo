import { useIsomorphicLayoutEffect } from './context.js';

interface Saved {
    overflow: string;
    paddingRight: string;
}

let count = 0;
let saved: Saved | null = null;

export function lockScroll(doc: Document = document): () => void {
    const body = doc.body;
    if (count === 0) {
        const win = doc.defaultView;
        const gap = win ? win.innerWidth - doc.documentElement.clientWidth : 0;
        saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
        if (gap > 0 && win) {
            const padding = Number.parseFloat(win.getComputedStyle(body).paddingRight) || 0;
            body.style.paddingRight = `${padding + gap}px`;
        }
        body.style.overflow = 'hidden';
    }
    count += 1;
    let released = false;
    return () => {
        if (released) {
            return;
        }
        released = true;
        count -= 1;
        if (count === 0 && saved) {
            body.style.overflow = saved.overflow;
            body.style.paddingRight = saved.paddingRight;
            saved = null;
        }
    };
}

export function useScrollLock(active = true): void {
    useIsomorphicLayoutEffect(() => (active && typeof document !== 'undefined' ? lockScroll(document) : undefined), [active]);
}
