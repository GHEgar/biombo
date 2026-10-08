import { describe, expect, it, vi } from 'vitest';
import { createEscapeStack, ESCAPE_PRIORITY } from '../../src/core/index.js';

const escape = () => new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });

describe('escape stack', () => {
    it('runs only the highest priority, most recent layer', () => {
        const stack = createEscapeStack();
        const mode = vi.fn();
        const first = vi.fn();
        const second = vi.fn();
        stack.push({ id: 'mode', priority: ESCAPE_PRIORITY.mode, onEscape: mode });
        stack.push({ id: 'first', priority: ESCAPE_PRIORITY.surface, onEscape: first });
        stack.push({ id: 'second', priority: ESCAPE_PRIORITY.surface, onEscape: second });
        stack.handle(escape());
        expect(second).toHaveBeenCalledOnce();
        expect(first).not.toHaveBeenCalled();
        expect(mode).not.toHaveBeenCalled();
    });

    it('raise moves a layer to the top of its priority', () => {
        const stack = createEscapeStack();
        stack.push({ id: 'a', priority: 100, onEscape: () => undefined });
        stack.push({ id: 'b', priority: 100, onEscape: () => undefined });
        stack.raise('a');
        expect(stack.top()).toBe('a');
    });

    it('falls through layers that return false or are disabled', () => {
        const stack = createEscapeStack();
        const mode = vi.fn();
        stack.push({ id: 'mode', priority: 0, onEscape: mode });
        stack.push({ id: 'hidden', priority: 100, onEscape: vi.fn(), enabled: () => false });
        stack.push({ id: 'pass', priority: 200, onEscape: () => false });
        expect(stack.handle(escape())).toBe(true);
        expect(mode).toHaveBeenCalledOnce();
    });

    it('ignores prevented events and other keys', () => {
        const stack = createEscapeStack();
        const layer = vi.fn();
        stack.push({ id: 'a', priority: 100, onEscape: layer });
        const prevented = escape();
        prevented.preventDefault();
        stack.handle(prevented);
        stack.handle(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(layer).not.toHaveBeenCalled();
    });

    it('stops legacy listeners once handled when attached in capture', () => {
        const stack = createEscapeStack();
        const legacy = vi.fn();
        stack.push({ id: 'a', priority: 100, onEscape: () => undefined });
        const detach = stack.attach(window);
        document.addEventListener('keydown', legacy);
        document.body.dispatchEvent(escape());
        expect(legacy).not.toHaveBeenCalled();
        detach();
        document.body.dispatchEvent(escape());
        expect(legacy).toHaveBeenCalledOnce();
        document.removeEventListener('keydown', legacy);
    });

    it('a stale release does not remove a re-pushed layer', () => {
        const stack = createEscapeStack();
        const release = stack.push({ id: 'a', priority: 100, onEscape: () => undefined });
        stack.push({ id: 'a', priority: 100, onEscape: () => undefined });
        release();
        expect(stack.top()).toBe('a');
    });
});
