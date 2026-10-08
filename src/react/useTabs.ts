import { useCallback, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type RefCallback } from 'react';
import type { Manager } from '../core/manager.js';
import type { Edge, Snapshot } from '../core/types.js';
import { useManager } from './context.js';
import { DRAG_THRESHOLD } from './interactions.js';
import { capture, trackPointer } from './pointer.js';

export type TabScope = { group: string } | { edge: Edge };

export interface UseTabsOptions {
    onReorder?: (ids: string[]) => void;
}

export interface TabListProps {
    ref: RefCallback<HTMLElement>;
    role: 'tablist';
    'aria-orientation': 'horizontal';
}

export interface TabProps {
    role: 'tab';
    'aria-selected': boolean;
    tabIndex: 0 | -1;
    'data-biombo-tab': string;
    'data-active'?: '';
    'data-dragging'?: '';
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
}

export interface UseTabsResult {
    ids: readonly string[];
    active: string | null;
    dragging: string | null;
    getTabListProps: () => TabListProps;
    getTabProps: (id: string) => TabProps;
}

const EMPTY: readonly string[] = [];

function select(snapshot: Snapshot, scope: TabScope): { ids: readonly string[]; active: string | null } {
    if ('group' in scope) {
        return snapshot.groups[scope.group] ?? { ids: EMPTY, active: null };
    }
    return snapshot.edges[scope.edge];
}

export function moveId(ids: readonly string[], id: string, index: number): string[] {
    const rest = ids.filter((other) => other !== id);
    const clamped = Math.max(0, Math.min(index, rest.length));
    return [...rest.slice(0, clamped), id, ...rest.slice(clamped)];
}

function reorder(manager: Manager, scope: TabScope, ids: string[], options: UseTabsOptions): void {
    if (options.onReorder) {
        options.onReorder(ids);
    } else if ('group' in scope) {
        manager.setGroupOrder(scope.group, ids);
    } else {
        manager.setEdgeOrder(scope.edge, ids);
    }
}

export function useTabs(scope: TabScope, options: UseTabsOptions = {}): UseTabsResult {
    const manager = useManager();
    const listRef = useRef<HTMLElement | null>(null);
    const suppressClick = useRef(false);
    const [dragging, setDragging] = useState<string | null>(null);
    const group = 'group' in scope ? scope.group : null;
    const edge = 'edge' in scope ? scope.edge : null;
    const getSnapshot = useCallback(
        () => select(manager.getSnapshot(), group !== null ? { group } : { edge: edge ?? 'bottom' }),
        [manager, group, edge],
    );
    const { ids, active } = useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);

    const tabElements = (): HTMLElement[] => [...(listRef.current?.querySelectorAll<HTMLElement>('[data-biombo-tab]') ?? [])];

    const focusTab = (id: string): void => {
        manager.focus(id);
        tabElements().find((element) => element.dataset.biomboTab === id)?.focus();
    };

    const startDrag = (id: string, event: PointerEvent<HTMLElement>): void => {
        if (event.button !== 0) {
            return;
        }
        const handle = event.currentTarget;
        const startX = event.clientX;
        let moved = false;
        let target = ids.indexOf(id);
        trackPointer(handle, event.pointerId, {
            move: (moveEvent) => {
                if (!moved && Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD) {
                    return;
                }
                if (!moved) {
                    moved = true;
                    capture(handle, moveEvent.pointerId);
                    setDragging(id);
                }
                const others = tabElements().filter((element) => element.dataset.biomboTab !== id);
                target = others.filter((element) => {
                    const box = element.getBoundingClientRect();
                    return box.left + box.width / 2 < moveEvent.clientX;
                }).length;
            },
            end: (_event, cancelled) => {
                setDragging(null);
                if (!moved) {
                    return;
                }
                suppressClick.current = true;
                const next = moveId(ids, id, target);
                if (!cancelled && next.some((other, i) => other !== ids[i])) {
                    reorder(manager, scope, next, options);
                }
            },
        });
    };

    const getTabListProps = (): TabListProps => ({
        ref: (element) => {
            listRef.current = element;
        },
        role: 'tablist',
        'aria-orientation': 'horizontal',
    });

    const getTabProps = (id: string): TabProps => {
        const props: TabProps = {
            role: 'tab',
            'aria-selected': id === active,
            tabIndex: id === active || (!active && id === ids[0]) ? 0 : -1,
            'data-biombo-tab': id,
            onClick: () => {
                if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                }
                manager.focus(id);
            },
            onKeyDown: (event) => {
                const index = ids.indexOf(id);
                const nextIndex = {
                    ArrowRight: index + 1,
                    ArrowLeft: index - 1,
                    Home: 0,
                    End: ids.length - 1,
                }[event.key];
                if (nextIndex === undefined || ids.length === 0) {
                    return;
                }
                event.preventDefault();
                const next = ids[(nextIndex + ids.length) % ids.length];
                if (next) {
                    focusTab(next);
                }
            },
            onPointerDown: (event) => startDrag(id, event),
        };
        if (id === active) {
            props['data-active'] = '';
        }
        if (id === dragging) {
            props['data-dragging'] = '';
        }
        return props;
    };

    return { ids, active, dragging, getTabListProps, getTabProps };
}
