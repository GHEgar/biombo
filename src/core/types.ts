export type Edge = 'top' | 'right' | 'bottom' | 'left';

export type GroupMode = 'free' | 'single';

export type DockPolicy = 'replace' | 'stack' | 'tabs';

export type CompactMode = 'sheet' | 'fullscreen' | 'inline';

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Focusable {
    focus: () => void;
}

export interface PanelConfig {
    group?: string;
    band?: string;
    closeOnEscape?: boolean;
    escapePriority?: number;
    dockable?: readonly Edge[];
    minimizable?: boolean;
    compact?: CompactMode;
    persist?: boolean;
    initial?: Partial<PersistedPanel>;
}

export interface PersistedPanel {
    open: boolean;
    minimized: boolean;
    maximized: boolean;
    dock: Edge | null;
    dockSize: number | null;
    rect: Rect | null;
}

export interface PanelState extends PersistedPanel {
    id: string;
    group: string;
    band: string;
    visible: boolean;
    active: boolean;
    topmost: boolean;
    zIndex: number;
}

export interface Snapshot {
    panels: Readonly<Record<string, PanelState>>;
    order: readonly string[];
    active: Readonly<Record<string, string | null>>;
}

export type PanelEventType =
    | 'open'
    | 'close'
    | 'focus'
    | 'minimize'
    | 'restore'
    | 'maximize'
    | 'unmaximize'
    | 'dock'
    | 'undock'
    | 'resize'
    | 'move';

export interface PanelEvent {
    type: PanelEventType;
    id: string;
    group: string;
    dock?: Edge | null;
    size?: number | null;
    rect?: Rect | null;
}

export interface GroupConfig {
    mode: GroupMode;
}

export interface StorageAdapter {
    get: (key: string) => string | null;
    set: (key: string, value: string) => void;
}

export type PersistField = keyof PersistedPanel;

export interface PersistOptions {
    storage: StorageAdapter | null;
    key: string;
    version: number;
    fields?: readonly PersistField[];
    migrate?: (data: unknown, fromVersion: number) => Record<string, Partial<PersistedPanel>> | null;
}

export interface ManagerOptions {
    bands?: Readonly<Record<string, number>>;
    defaultBand?: string;
    groups?: Readonly<Record<string, GroupConfig>>;
    persist?: PersistOptions;
    onEvent?: (event: PanelEvent) => void;
}
