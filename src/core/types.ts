export type Edge = 'top' | 'right' | 'bottom' | 'left';

export type GroupMode = 'free' | 'single';

export type DockPolicy = 'replace' | 'stack' | 'tabs';

export type CompactMode = 'sheet' | 'fullscreen' | 'inline';

export type Presentation = 'hidden' | 'floating' | 'docked' | 'maximized' | CompactMode;

export type SnapMode = 'auto' | 'button' | 'both';

export type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface Size {
    width: number;
    height: number;
}

export interface Area {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

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
    defaultSize?: Size;
    minSize?: Size;
    minDockSize?: number;
    maxDockRatio?: number;
    snap?: SnapMode;
    undockOnDrag?: boolean | number;
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
    layout: Rect | null;
    tabbed: boolean;
    presentation: Presentation;
}

export interface EdgeState {
    policy: DockPolicy;
    ids: readonly string[];
    active: string | null;
}

export interface GroupState {
    mode: GroupMode;
    ids: readonly string[];
    active: string | null;
}

export interface SnapPreview {
    id: string;
    edge: Edge;
    rect: Rect;
}

export interface Snapshot {
    panels: Readonly<Record<string, PanelState>>;
    order: readonly string[];
    active: Readonly<Record<string, string | null>>;
    viewport: Size;
    area: Area;
    edges: Readonly<Record<Edge, EdgeState>>;
    snap: SnapPreview | null;
    compact: boolean;
    obstacles: Readonly<Record<string, Rect>>;
    groups: Readonly<Record<string, GroupState>>;
}

export interface UpdateOptions {
    transient?: boolean;
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
    | 'move'
    | 'reorder';

export interface PanelEvent {
    type: PanelEventType;
    id: string;
    group: string;
    dock?: Edge | null;
    size?: number | null;
    rect?: Rect | null;
    ids?: readonly string[];
}

export interface GroupConfig {
    mode: GroupMode;
}

export interface EdgeConfig {
    policy: DockPolicy;
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
    onAreaChange?: (area: Area) => void;
    edges?: Readonly<Partial<Record<Edge, EdgeConfig>>>;
    dockedBand?: string;
    defaultDockRatio?: number;
    snapThreshold?: number;
    keepVisible?: Size;
    cascade?: number;
    compactBreakpoint?: number;
    sheetRatio?: number;
}
