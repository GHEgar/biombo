import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures';

async function box(locator: Locator) {
    const rect = await locator.boundingBox();
    if (!rect) {
        throw new Error('no box');
    }
    return rect;
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

test('traps focus in nested modals, with Esc, outside press and scroll lock', async ({ page }) => {
    await page.getByTestId('open-modal').click();
    await expect(page.getByTestId('modal-input')).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('open-nested')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('modal-close')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('modal-input')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('modal-close')).toBeFocused();
    expect(await page.locator('#root').getAttribute('inert')).toBe('');

    await page.getByTestId('open-nested').click();
    await expect(page.getByTestId('nested-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('nested-input')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('nested')).toHaveCount(0);
    await expect(page.getByTestId('modal')).toBeVisible();
    await expect(page.getByTestId('open-nested')).toBeFocused();

    await page.mouse.click(20, 400);
    await expect(page.getByTestId('modal')).toHaveCount(0);
    await expect(page.getByTestId('open-modal')).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    expect(await page.locator('#root').getAttribute('inert')).toBeNull();
});

test('tooltips flip at the edges and stay inside the viewport', async ({ page }) => {
    const expected: Record<string, string> = { tl: 'bottom', tr: 'left', bl: 'top', br: 'top' };
    for (const [id, placement] of Object.entries(expected)) {
        await page.getByTestId(`tip-${id}`).hover();
        const tooltip = page.getByTestId(`tooltip-${id}`);
        await expect(tooltip).toHaveAttribute('data-placement', placement);
        const rect = await box(tooltip);
        expect(rect.x).toBeGreaterThanOrEqual(8);
        expect(rect.y).toBeGreaterThanOrEqual(8);
        expect(rect.x + rect.width).toBeLessThanOrEqual(1200 - 8);
        expect(rect.y + rect.height).toBeLessThanOrEqual(800 - 8);
        await page.mouse.move(600, 400);
        await expect(tooltip).toHaveCount(0);
    }
});

test('a tooltip follows its trigger inside a scrolled container', async ({ page }) => {
    await page.getByTestId('tip-scroll').focus();
    const tooltip = page.getByTestId('tooltip-scroll');
    const before = await box(tooltip);
    await page.getByTestId('scroller').evaluate((element) => {
        element.scrollTop = 30;
    });
    await expect.poll(async () => Math.round((await box(tooltip)).y)).toBe(Math.round(before.y - 30));
});

test('the InfoBox anchors to the click, drags inside the viewport and drops swiped cards', async ({ page }) => {
    const infobox = page.getByTestId('infobox');
    await expect(async () => {
        await page.mouse.click(600, 450);
        await expect(infobox).toBeVisible({ timeout: 300 });
    }).toPass();
    await expect(infobox).toHaveAttribute('data-placement', 'top');
    const placed = await box(infobox);
    expect(Math.round(placed.x + placed.width / 2)).toBe(600);
    expect(Math.round(placed.y + placed.height)).toBe(442);

    const handle = await box(page.getByTestId('infobox-handle'));
    await page.mouse.move(handle.x + 40, handle.y + 10);
    await page.mouse.down();
    await page.mouse.move(handle.x + 60, handle.y + 20, { steps: 2 });
    await page.mouse.move(1400, -200, { steps: 8 });
    await page.mouse.up();
    const dragged = await box(infobox);
    expect(Math.round(dragged.x + dragged.width)).toBe(1200 - 10);
    expect(Math.round(dragged.y)).toBe(10);

    const card = page.getByTestId('card-Colonia');
    const cardBox = await box(card);
    await page.mouse.move(cardBox.x + 150, cardBox.y + 15);
    await page.mouse.down();
    await page.mouse.move(cardBox.x + 120, cardBox.y + 16, { steps: 2 });
    await page.mouse.move(cardBox.x + 60, cardBox.y + 16, { steps: 2 });
    await page.mouse.move(cardBox.x - 20, cardBox.y + 16, { steps: 4 });
    await expect(card).toHaveAttribute('data-swipe', 'armed');
    await page.mouse.up();
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId('card-Municipio')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(infobox).toHaveCount(0);
});
