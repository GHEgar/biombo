import { useCallback, useSyncExternalStore } from 'react';
import type { Area, Edge, EdgeState, Size, SnapPreview } from '../core/types.js';
import { useManager } from './context.js';

function useSelect<T>(select: (snapshot: ReturnType<ReturnType<typeof useManager>['getSnapshot']>) => T): T {
    const manager = useManager();
    const getSnapshot = useCallback(() => select(manager.getSnapshot()), [manager, select]);
    return useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);
}

const selectArea = (snapshot: { area: Area }): Area => snapshot.area;
const selectSnap = (snapshot: { snap: SnapPreview | null }): SnapPreview | null => snapshot.snap;
const selectViewport = (snapshot: { viewport: Size }): Size => snapshot.viewport;

export function useArea(): Area {
    return useSelect(selectArea);
}

export function useSnapPreview(): SnapPreview | null {
    return useSelect(selectSnap);
}

export function useViewport(): Size {
    return useSelect(selectViewport);
}

export function useEdge(edge: Edge): EdgeState {
    const select = useCallback((snapshot: { edges: Readonly<Record<Edge, EdgeState>> }) => snapshot.edges[edge], [edge]);
    return useSelect(select);
}
