import type { PanelConfig } from 'biombo/react';

export const TITLES: Record<string, string> = {};

export const PANELS: Record<string, { title: string; config: PanelConfig }> = {
    tabla: {
        title: 'Tabla',
        config: { dockable: ['top', 'right', 'bottom', 'left'], defaultSize: { width: 520, height: 280 } },
    },
    capas: {
        title: 'Capas',
        config: { dockable: ['left', 'right'], defaultSize: { width: 300, height: 360 }, initial: { dockSize: 300 } },
    },
    leyenda: {
        title: 'Leyenda',
        config: { dockable: ['right'], defaultSize: { width: 280, height: 300 }, initial: { dock: 'right', dockSize: 280 } },
    },
    notas: {
        title: 'Notas',
        config: { dockable: ['right'], defaultSize: { width: 280, height: 300 }, initial: { dock: 'right', dockSize: 320 } },
    },
    info: {
        title: 'Info',
        config: { defaultSize: { width: 320, height: 200 }, minimizable: false, compact: 'fullscreen' },
    },
};

for (const [id, panel] of Object.entries(PANELS)) {
    TITLES[id] = panel.title;
}
