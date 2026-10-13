export { createManager, DEFAULT_BANDS, DEFAULT_GROUP, type Manager } from './manager.js';
export { createEscapeStack, ESCAPE_PRIORITY, type EscapeLayer, type EscapeStack } from './escape.js';
export { DEFAULT_PERSIST_FIELDS, localStorageAdapter, memoryAdapter } from './persistence.js';
export { DEFAULT_KEEP_VISIBLE } from './store.js';
export { clearance, isCovered, type ClearanceOptions } from './clearance.js';
export { ANCHOR_DEFAULTS, isOutside, placeAnchored, type Align, type AnchoredPlacement, type AnchorOptions, type Side } from './anchor.js';
export { DEFAULT_CONTAIN_MARGIN } from './geometry.js';
export {
    areaRect,
    centerRect,
    clampRect,
    containRect,
    DOCK_DEFAULTS,
    dockPreviewRect,
    EDGES,
    layoutDocks,
    resizeRect,
    snapEdge,
    ZERO_AREA,
    type ContainedRect,
} from './layout.js';
export type {
    Area,
    CompactMode,
    ContainMode,
    DockPolicy,
    Edge,
    EdgeConfig,
    EdgeState,
    Focusable,
    GroupConfig,
    GroupMode,
    GroupState,
    Interaction,
    ManagerOptions,
    PanelConfig,
    PanelEvent,
    PanelEventType,
    PanelState,
    PersistField,
    PersistOptions,
    PersistedPanel,
    Presentation,
    Rect,
    ResizeDirection,
    Size,
    Snapshot,
    SnapMode,
    SnapPreview,
    StorageAdapter,
    UpdateOptions,
} from './types.js';
