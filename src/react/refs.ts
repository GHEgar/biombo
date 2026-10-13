import type { Ref, RefCallback } from 'react';

type Cleanup = () => void;

function assign<T>(ref: Ref<T> | undefined, value: T | null): Cleanup | undefined {
    if (typeof ref === 'function') {
        const result = ref(value);
        return typeof result === 'function' ? result : undefined;
    }
    if (ref) {
        ref.current = value;
    }
    return undefined;
}

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
    return (value) => {
        const cleanups = refs.map((ref) => assign(ref, value));
        return () => {
            cleanups.forEach((cleanup, index) => {
                if (cleanup) {
                    cleanup();
                } else {
                    assign(refs[index], null);
                }
            });
        };
    };
}
