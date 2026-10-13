export type TrapContain = 'strict' | 'tab';

const CANDIDATES = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'audio[controls]',
    'video[controls]',
    'summary',
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]',
].join(',');

const SKIP_INERT = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META', 'NOSCRIPT']);

export function isVisible(element: HTMLElement): boolean {
    if (element.closest('[hidden], [inert]') || element.closest('fieldset[disabled]')) {
        return false;
    }
    if (typeof element.checkVisibility === 'function') {
        return element.checkVisibility({ visibilityProperty: true });
    }
    return element.getClientRects().length > 0;
}

export function focusableIn(container: HTMLElement): HTMLElement[] {
    const all = [...container.querySelectorAll<HTMLElement>(CANDIDATES)]
        .filter((element) => element.tabIndex >= 0 && isVisible(element));
    const positive = all.filter((element) => element.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex);
    return [...positive, ...all.filter((element) => element.tabIndex === 0)];
}

export function inertOthers(element: HTMLElement): () => void {
    const marked: Element[] = [];
    const body = element.ownerDocument.body;
    let node: Element = element;
    while (node !== body && node.parentElement) {
        for (const sibling of node.parentElement.children) {
            if (sibling !== node && !SKIP_INERT.has(sibling.tagName) && !sibling.hasAttribute('inert')) {
                sibling.setAttribute('inert', '');
                marked.push(sibling);
            }
        }
        node = node.parentElement;
    }
    return () => {
        for (const sibling of marked) {
            sibling.removeAttribute('inert');
        }
    };
}

interface Trap {
    container: HTMLElement;
    contain: TrapContain;
    last: HTMLElement | null;
}

const traps: Trap[] = [];
let detach: (() => void) | null = null;

const topTrap = (): Trap | undefined => traps[traps.length - 1];

function onKeyDown(event: KeyboardEvent): void {
    const trap = topTrap();
    if (!trap || event.key !== 'Tab' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }
    const { container } = trap;
    const list = focusableIn(container);
    const first = list[0];
    const last = list[list.length - 1];
    if (!first || !last) {
        event.preventDefault();
        container.focus();
        return;
    }
    const active = container.ownerDocument.activeElement;
    const inside = !!active && container.contains(active);
    if (event.shiftKey && (!inside || active === first || active === container)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
    }
}

function onFocusIn(event: FocusEvent): void {
    const trap = topTrap();
    if (!trap || trap.contain !== 'strict' || !(event.target instanceof Node)) {
        return;
    }
    const { container } = trap;
    if (container.contains(event.target)) {
        trap.last = event.target instanceof HTMLElement ? event.target : trap.last;
        return;
    }
    const fallback = trap.last && container.contains(trap.last) ? trap.last : focusableIn(container)[0] ?? container;
    fallback.focus();
}

function attach(doc: Document): () => void {
    doc.addEventListener('keydown', onKeyDown, true);
    doc.addEventListener('focusin', onFocusIn, true);
    return () => {
        doc.removeEventListener('keydown', onKeyDown, true);
        doc.removeEventListener('focusin', onFocusIn, true);
    };
}

export function pushTrap(container: HTMLElement, contain: TrapContain): () => void {
    const trap: Trap = { container, contain, last: null };
    traps.push(trap);
    detach ??= attach(container.ownerDocument);
    return () => {
        const index = traps.indexOf(trap);
        if (index !== -1) {
            traps.splice(index, 1);
        }
        if (traps.length === 0) {
            detach?.();
            detach = null;
        }
    };
}

export function isTopTrap(container: HTMLElement): boolean {
    return topTrap()?.container === container;
}
