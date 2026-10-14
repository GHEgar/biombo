import type { PanelConfig } from 'biombo/react';

export const TITLES: Record<string, string> = {};

export const PANELS: Record<string, { title: string; config: PanelConfig }> = {
    table: {
        title: 'Table',
        config: { dockable: ['top', 'right', 'bottom', 'left'], defaultSize: { width: 520, height: 280 } },
    },
    layers: {
        title: 'Layers',
        config: { dockable: ['left', 'right'], defaultSize: { width: 300, height: 360 }, initial: { dockSize: 300 } },
    },
    legend: {
        title: 'Legend',
        config: { dockable: ['right'], defaultSize: { width: 280, height: 300 }, initial: { dock: 'right', dockSize: 280 } },
    },
    notes: {
        title: 'Notes',
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
