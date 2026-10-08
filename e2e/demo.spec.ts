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
    await page.getByTestId('toggle-tabla').click();
    const panel = await box(page, 'panel-tabla');
    expect(panel.width).toBe(520);

    const handle = await box(page, 'handle-tabla');
    await drag(page, { x: handle.x + 60, y: handle.y + 15 }, { x: handle.x + 160, y: handle.y + 65 });
    const moved = await box(page, 'panel-tabla');
    expect(Math.round(moved.x - panel.x)).toBe(100);
    expect(Math.round(moved.y - panel.y)).toBe(50);

    await page.mouse.move(moved.x + 60, moved.y + 15);
    await page.mouse.down();
    await page.mouse.move(600, 500, { steps: 4 });
    await page.mouse.move(600, 795, { steps: 6 });
    await expect(page.getByTestId('snap')).toBeVisible();
    await page.mouse.up();

    await expect(page.getByTestId('panel-tabla')).toHaveAttribute('data-dock', 'bottom');
    await expect.poll(async () => (await box(page, 'map')).height).toBe(800 - 320);
});

test('resizes the docked panel and the map follows', async ({ page }) => {
    await page.getByTestId('toggle-tabla').click();
    await page.getByTestId('panel-tabla').getByRole('button', { name: 'Acoplar' }).click();
    const resizer = await box(page, 'resizer-tabla');
    await drag(page, { x: 600, y: resizer.y + 3 }, { x: 600, y: resizer.y + 3 - 100 });
    await expect.poll(async () => (await box(page, 'map')).height).toBe(800 - 420);
});

test('Escape closes the topmost window first and the mode last', async ({ page }) => {
    await page.getByTestId('mode').click();
    await page.getByTestId('toggle-info').click();
    await page.getByTestId('toggle-tabla').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-tabla')).toBeHidden();
    await expect(page.getByTestId('panel-info')).toBeVisible();
    await expect(page.getByTestId('mode')).toHaveText(/Modo activo/);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-info')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mode')).toHaveText('Activar modo');
});

test('a click brings a window to the front', async ({ page }) => {
    await page.getByTestId('toggle-tabla').click();
    await page.getByTestId('toggle-info').click();
    await expect(page.getByTestId('panel-info')).toHaveAttribute('data-topmost', '');
    const tabla = await box(page, 'panel-tabla');
    await page.mouse.click(tabla.x + 12, tabla.y + tabla.height - 12);
    await expect(page.getByTestId('panel-tabla')).toHaveAttribute('data-topmost', '');
});

test('layout survives a reload', async ({ page }) => {
    await page.getByTestId('toggle-capas').click();
    await page.getByTestId('panel-capas').getByRole('button', { name: 'Minimizar Capas' }).click();
    await page.getByTestId('toggle-tabla').click();
    await page.getByTestId('panel-tabla').getByRole('button', { name: 'Acoplar' }).click();
    await page.reload();
    await page.getByTestId('toggle-tabla').click();
    await expect(page.getByTestId('panel-tabla')).toHaveAttribute('data-dock', 'bottom');
});
