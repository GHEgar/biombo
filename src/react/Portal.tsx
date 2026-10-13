import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
    children?: ReactNode;
    container?: Element | DocumentFragment | null;
}

const subscribe = (): (() => void) => () => undefined;
const onClient = (): boolean => true;
const onServer = (): boolean => false;

export function Portal({ children, container }: PortalProps) {
    const mounted = useSyncExternalStore(subscribe, onClient, onServer);
    if (!mounted) {
        return null;
    }
    return createPortal(children, container ?? document.body);
}
