export { createManager, DEFAULT_BANDS, DEFAULT_GROUP, type Manager } from './manager.js';
export { createEscapeStack, ESCAPE_PRIORITY, type EscapeLayer, type EscapeStack } from './escape.js';
export { DEFAULT_PERSIST_FIELDS, localStorageAdapter, memoryAdapter } from './persistence.js';
export type {
    CompactMode,
    DockPolicy,
    Edge,
    Focusable,
    GroupConfig,
    GroupMode,
    ManagerOptions,
    PanelConfig,
    PanelEvent,
    PanelEventType,
    PanelState,
    PersistField,
    PersistOptions,
    PersistedPanel,
    Rect,
    Snapshot,
    StorageAdapter,
} from './types.js';
