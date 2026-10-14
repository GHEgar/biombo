import { useId, useRef, useState, type ReactNode } from 'react';
import {
    ESCAPE_PRIORITY,
    Portal,
    useAnchoredPosition,
    useDismissOutside,
    useEscape,
    useFocusTrap,
    useScrollLock,
    type Side,
} from 'biombo/react';

function Modal({ title, testId, onClose, children }: { title: string; testId: string; onClose: () => void; children?: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const { getTrapProps } = useFocusTrap(ref);
    const { getDismissProps } = useDismissOutside(ref, onClose);
    useScrollLock();
    useEscape(onClose, { priority: ESCAPE_PRIORITY.modal });

    return (
        <Portal>
            <div className="backdrop" data-testid={`${testId}-backdrop`}>
                <div ref={ref} {...getTrapProps()} {...getDismissProps()} role="dialog" aria-modal="true" aria-label={title} className="modal" data-testid={testId}>
                    <h2>{title}</h2>
                    <input data-testid={`${testId}-input`} placeholder="Name" />
                    {children}
                    <button type="button" data-testid={`${testId}-close`} onClick={onClose}>Close</button>
                </div>
            </div>
        </Portal>
    );
}

export function ModalDemo() {
    const [open, setOpen] = useState(false);
    const [nested, setNested] = useState(false);
    return (
        <>
            <button type="button" data-testid="open-modal" onClick={() => setOpen(true)}>Modal</button>
            {open && (
                <Modal title="Modal" testId="modal" onClose={() => setOpen(false)}>
                    <button type="button" data-testid="open-nested" onClick={() => setNested(true)}>Nested modal</button>
                    {nested && <Modal title="Nested" testId="nested" onClose={() => setNested(false)} />}
                </Modal>
            )}
        </>
    );
}

export function Tip({ id, text, placement = 'top', className }: { id: string; text: string; placement?: Side; className?: string }) {
    const trigger = useRef<HTMLButtonElement>(null);
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const tipId = useId();
    const anchored = useAnchoredPosition(ref, { anchor: trigger, open, placement });
    const show = () => setOpen(true);
    const hide = () => setOpen(false);

    return (
        <>
            <button
                ref={trigger}
                type="button"
                className={`tip-trigger ${className ?? ''}`}
                data-testid={`tip-${id}`}
                aria-describedby={open ? tipId : undefined}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
            >
                ?
            </button>
            {open && (
                <Portal>
                    <div ref={ref} {...anchored.getFloatingProps()} id={tipId} role="tooltip" className="tooltip" data-testid={`tooltip-${id}`}>
                        {text}
                        <span className="tooltip-arrow" data-placement={anchored.placement} style={{ left: anchored.arrow }} />
                    </div>
                </Portal>
            )}
        </>
    );
}

export function Surfaces() {
    return (
        <>
            <nav className="surfaces">
                <ModalDemo />
                <span>Click the map: InfoBox</span>
            </nav>
            <Tip id="tl" className="corner tl" placement="top" text="No room above: flips below." />
            <Tip id="tr" className="corner tr" placement="right" text="No room on the right: flips left." />
            <Tip id="bl" className="corner bl" placement="bottom" text="No room below: flips above." />
            <Tip id="br" className="corner br" text="Corner: clamped to the viewport." />
            <div className="scroller" data-testid="scroller">
                <p>Scrolling list</p>
                <Tip id="scroll" placement="right" text="Follows its trigger on scroll." />
                <div className="scroller-fill" />
            </div>
        </>
    );
}
