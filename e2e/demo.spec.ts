import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function box(page: Page, testId: string) {
    const rect = await page.getByTestId(testId).boundingBox();
    if (!rect) {
        throw new Error(`${testId} has no box`);
    }
    return rect;
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 10, from.y + 10, { steps: 2 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

test('drags a window, docks it at the bottom and the map shrinks', async ({ page }) => {
    await page.getByTestId('toggle-table').click();
    const panel = await box(page, 'panel-table');
    expect(panel.width).toBe(520);

    const handle = await box(page, 'handle-table');
    await drag(page, { x: handle.x + 60, y: handle.y + 15 }, { x: handle.x + 160, y: handle.y + 65 });
    const moved = await box(page, 'panel-table');
    expect(Math.round(moved.x - panel.x)).toBe(100);
    expect(Math.round(moved.y - panel.y)).toBe(50);

    await page.mouse.move(moved.x + 60, moved.y + 15);
    await page.mouse.down();
    await page.mouse.move(600, 500, { steps: 4 });
    await page.mouse.move(600, 795, { steps: 6 });
    await expect(page.getByTestId('snap')).toBeVisible();
    await page.mouse.up();

    await expect(page.getByTestId('panel-table')).toHaveAttribute('data-dock', 'bottom');
    await expect.poll(async () => (await box(page, 'map')).height).toBe(800 - 320);
});

test('resizes the docked panel and the map follows', async ({ page }) => {
    await page.getByTestId('toggle-table').click();
    await page.getByTestId('panel-table').getByRole('button', { name: 'Dock' }).click();
    const resizer = await box(page, 'resizer-table');
    await drag(page, { x: 600, y: resizer.y + 3 }, { x: 600, y: resizer.y + 3 - 100 });
    await expect.poll(async () => (await box(page, 'map')).height).toBe(800 - 420);
});

test('Escape closes the topmost window first and the mode last', async ({ page }) => {
    await page.getByTestId('mode').click();
    await page.getByTestId('toggle-info').click();
    await page.getByTestId('toggle-table').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-table')).toBeHidden();
    await expect(page.getByTestId('panel-info')).toBeVisible();
    await expect(page.getByTestId('mode')).toHaveText(/Mode active/);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-info')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mode')).toHaveText('Activate mode');
});

test('a click brings a window to the front', async ({ page }) => {
    await page.getByTestId('toggle-table').click();
    await page.getByTestId('toggle-info').click();
    await expect(page.getByTestId('panel-info')).toHaveAttribute('data-topmost', '');
    const table = await box(page, 'panel-table');
    await page.mouse.click(table.x + 12, table.y + table.height - 12);
    await expect(page.getByTestId('panel-table')).toHaveAttribute('data-topmost', '');
});

test('layout survives a reload', async ({ page }) => {
    await page.getByTestId('toggle-layers').click();
    await page.getByTestId('panel-layers').getByRole('button', { name: 'Minimize Layers' }).click();
    await page.getByTestId('toggle-table').click();
    await page.getByTestId('panel-table').getByRole('button', { name: 'Dock' }).click();
    await page.reload();
    await page.getByTestId('toggle-table').click();
    await expect(page.getByTestId('panel-table')).toHaveAttribute('data-dock', 'bottom');
});

test('compact mode turns panels into sheets and fullscreen, and frees the map', async ({ page }) => {
    await page.getByTestId('toggle-table').click();
    await page.getByTestId('panel-table').getByRole('button', { name: 'Dock' }).click();
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.getByTestId('panel-table')).toHaveAttribute('data-presentation', 'sheet');
    await expect.poll(async () => (await box(page, 'map')).height).toBe(800);
    await page.getByTestId('toggle-info').click();
    await expect(page.getByTestId('panel-info')).toHaveAttribute('data-presentation', 'fullscreen');
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.getByTestId('panel-table')).toHaveAttribute('data-presentation', 'docked');
});

test('F6 moves focus between windows', async ({ page }) => {
    await page.getByTestId('toggle-table').click();
    await page.getByTestId('toggle-info').click();
    await page.keyboard.press('F6');
    await expect(page.getByTestId('panel-table')).toBeFocused();
    await expect(page.getByTestId('panel-table')).toHaveAttribute('data-topmost', '');
    await page.keyboard.press('F6');
    await expect(page.getByTestId('panel-info')).toBeFocused();
});

test('the pill bar clears the scale and a docked panel', async ({ page }) => {
    const scale = await box(page, 'scale');
    await expect.poll(async () => 800 - (await box(page, 'pillbar')).y - (await box(page, 'pillbar')).height)
        .toBeGreaterThanOrEqual(800 - scale.y + 8 - 1);
    await page.getByTestId('toggle-table').click();
    await page.getByTestId('panel-table').getByRole('button', { name: 'Dock' }).click();
    await expect.poll(async () => (await box(page, 'pillbar')).y + (await box(page, 'pillbar')).height)
        .toBeLessThanOrEqual(800 - 320);
});

test('two panels docked on the right share the edge as tabs and reorder by dragging', async ({ page }) => {
    await page.getByTestId('toggle-legend').click();
    await page.getByTestId('toggle-notes').click();
    await expect(page.getByTestId('panel-notes')).toBeVisible();
    await expect(page.getByTestId('panel-legend')).toBeHidden();
    await expect.poll(async () => (await box(page, 'map')).width).toBe(1200 - 320);

    const strip = page.getByTestId('panel-notes').getByRole('tablist');
    await strip.getByRole('tab', { name: 'Legend' }).click();
    await expect(page.getByTestId('panel-legend')).toBeVisible();
    await expect(page.getByTestId('panel-notes')).toBeHidden();
    await expect.poll(async () => (await box(page, 'map')).width).toBe(1200 - 280);

    const tabs = page.getByTestId('panel-legend').getByRole('tab');
    await expect(tabs).toHaveText(['Legend', 'Notes']);
    const first = await tabs.nth(0).boundingBox();
    const second = await tabs.nth(1).boundingBox();
    if (!first || !second) {
        throw new Error('tabs without box');
    }
    await page.mouse.move(first.x + 10, first.y + 10);
    await page.mouse.down();
    await page.mouse.move(first.x + 30, first.y + 10, { steps: 3 });
    await page.mouse.move(second.x + second.width - 4, first.y + 10, { steps: 5 });
    await page.mouse.up();
    await expect(tabs).toHaveText(['Notes', 'Legend']);
});
