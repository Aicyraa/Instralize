import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
// Frames one node so its controls are on screen, like double-clicking it on the map.
const focusNode = (page: Page, title: string) =>
  page.getByRole('button', { name: `Focus ${title}` }).dispatchEvent('click');

test('explore validates, searches and replays on desktop and mobile', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'About Bubble sort' }),
  ).toBeVisible();
  await focusNode(page, 'Algorithms');
  await page
    .getByRole('button', { name: 'Binary search', exact: true })
    .click();
  await focusNode(page, 'Input');
  await page.getByRole('textbox', { name: 'Array values' }).fill('3, 1, 2');
  await page.getByRole('button', { name: 'Apply input' }).click();
  await expect(page.getByRole('alert')).toContainText('ascending');
  await page.getByRole('button', { name: 'Sort input ↑' }).click();
  await expect(page.getByRole('textbox', { name: 'Array values' })).toHaveValue(
    '1, 2, 3',
  );
  await focusNode(page, 'Visualization');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Playback position' }),
  ).toHaveValue('1');
  expect(errors).toEqual([]);
});
test('Code Lab runs code, highlights execution and debugs incorrect results', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Code Lab', exact: true }).click();
  await focusNode(page, 'Run');
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Correct for this input',
  );
  await focusNode(page, 'Visualization');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('.code-execution-line').first()).toBeVisible();
  await focusNode(page, 'Run');
  await page.getByRole('button', { name: 'Check examples' }).click();
  await expect(page.getByRole('status')).toContainText(
    'All 7 example checks passed',
  );
  await page
    .getByRole('combobox', { name: 'Code example' })
    .selectOption('merge');
  await focusNode(page, 'Run');
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Correct for this input',
  );
  const editor = page.getByRole('textbox', { name: 'Algorithm code editor' });
  await focusNode(page, 'Code editor');
  await editor.fill('function sort(arr) { const n = arr.length; return arr; }');
  await focusNode(page, 'Run');
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText('Incorrect result');
  await focusNode(page, 'Code editor');
  await editor.fill('function sort(arr) { arr.sort(); }');
  await focusNode(page, 'Run');
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText('unsupported');
});
test('Code Lab cancels infinite loops and discards stale highlights', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Code Lab', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Algorithm code editor' });
  await editor.fill('function sort(arr) { while (true) {} }');
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText(/limit|budget/);
  await editor.fill('function sort(arr) { arr[0] = 1; return arr; }');
  await expect(page.locator('.code-error-line')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'About Bubble sort' }),
  ).toBeVisible();
});

test('recursion, alternate array styles and node map navigation', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.screenshot({
    path: isMobile
      ? '/tmp/instralize-mobile.png'
      : '/tmp/instralize-desktop.png',
    fullPage: true,
  });
  await focusNode(page, 'Algorithms');
  await page
    .getByRole('button', { name: 'Tower of Hanoi', exact: true })
    .click();
  await focusNode(page, 'Visualization');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByRole('button', { name: /^hanoi\(3.*active$/ })).toBeVisible();
  await focusNode(page, 'Algorithms');
  await page.getByRole('button', { name: 'Merge sort', exact: true }).click();
  await focusNode(page, 'Visualization');
  await page.getByRole('button', { name: 'Circles view' }).click();
  await expect(
    page.getByRole('button', { name: 'Circles view' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await focusNode(page, 'Execution map');
  await expect(page.getByText('No steps done yet.')).toBeVisible();
});

test('the map pans, zooms, fits and moves nodes', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const world = page.locator('.flow-world');
  const zoom = page.locator('.flow-zoom');
  await page.getByRole('button', { name: 'Fit view' }).click();
  const fitted = await zoom.textContent();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(zoom).not.toHaveText(fitted!);
  await page.getByRole('button', { name: 'Fit view' }).click();
  await expect(zoom).toHaveText(fitted!);
  const canvas = page.getByRole('group', { name: 'Algorithm workspace map' });
  await canvas.focus();
  const before = await world.getAttribute('style');
  await page.keyboard.press('ArrowRight');
  expect(await world.getAttribute('style')).not.toBe(before);
  if (isMobile) return;
  const header = page
    .locator('.flow-node-header')
    .filter({ hasText: 'Execution map' });
  const start = (await header.boundingBox())!;
  await page.mouse.move(start.x + 100, start.y + 20);
  await page.mouse.down();
  await page.mouse.move(start.x + 100, start.y + 140, { steps: 5 });
  await page.mouse.up();
  const end = (await header.boundingBox())!;
  expect(end.y).toBeGreaterThan(start.y + 100);
  await page.getByRole('button', { name: 'Reset layout' }).click();
  await expect
    .poll(async () => (await header.boundingBox())!.y)
    .toBeLessThan(end.y);
});

test('Stop terminates a pending worker and draft edits cancel old runs', async ({
  page,
}) => {
  // Hold execution open to exercise lifecycle controls without racing a fast interpreter.
  await page.route('**/assets/runner.worker-*.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'self.onmessage = () => { setTimeout(() => {}, 10000); };',
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Code Lab', exact: true }).click();
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Stopped');
  await expect(page.getByRole('button', { name: 'Run & play' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run & play' }).click();
  await page
    .getByRole('textbox', { name: 'Algorithm code editor' })
    .fill('function sort(arr) { return arr; }');
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.code-execution-line')).toHaveCount(0);
  await page.screenshot({
    path: '/tmp/instralize-code-lab.png',
    fullPage: true,
  });
});

test('studio panel toggles, moves and adds connected instances', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const panel = page.getByRole('complementary', { name: 'Studio' });
  const toggle = page.getByRole('button', { name: 'Workspace settings' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({
    path: `/tmp/instralize-${isMobile ? 'mobile' : 'desktop'}-closed.png`,
  });
  await toggle.click();
  await expect(
    page.getByRole('button', { name: 'Add Visualization' }),
  ).toBeVisible();
  await page.getByRole('switch', { name: /Minimap/ }).click();
  await expect(page.locator('.flow-minimap')).toHaveCount(0);
  await page.getByRole('switch', { name: /Minimap/ }).click();
  await page.getByRole('button', { name: 'New connected pipeline' }).click();
  await expect(page.getByRole('heading', { name: 'Visualization 2' })).toBeVisible();
  await expect(page.locator('.flow-edge-group')).toHaveCount(6);
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `/tmp/instralize-${isMobile ? 'mobile' : 'desktop'}-open.png`,
  });
  if (!isMobile) {
    const handle = page.getByRole('button', { name: 'Move studio panel' });
    const start = (await panel.boundingBox())!;
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 310, box.y + 210, { steps: 6 });
    await page.mouse.up();
    const end = (await panel.boundingBox())!;
    expect(end.x).toBeGreaterThan(start.x + 250);
    expect(end.y).toBeGreaterThan(start.y + 150);
  }
  await page.getByRole('button', { name: 'Code Lab', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add Execution map' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add Algorithms' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Add Visualization' }).click();
  await expect(page.getByRole('heading', { name: 'Visualization 2' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `/tmp/instralize-${isMobile ? 'mobile' : 'desktop'}-lab.png`,
  });
});

test('recursion grows a tree and returns values to callers', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop screenshot only');
  await page.goto('/');
  await focusNode(page, 'Algorithms');
  await page.getByRole('button', { name: 'Fibonacci', exact: true }).click();
  await focusNode(page, 'Visualization');
  for (let i = 0; i < 9; i++)
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('.call-result').first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/instralize-recursion.png' });
  await page.getByRole('button', { name: 'Fit view' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'About Fibonacci' }).hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/instralize-overview.png' });
});

test('connectors move around nodes and nodes resize', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Pointer dragging is covered on desktop');
  await page.goto('/');
  await focusNode(page, 'Input');
  await page.waitForTimeout(600);
  const node = page.locator('.flow-node').filter({
    has: page.getByRole('heading', { name: 'Input', exact: true }),
  });
  const port = node.locator('[data-port="out"]');
  const box = (await node.boundingBox())!;
  const start = (await port.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 30, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(port).toHaveClass(/side-bottom/);
  const grip = node.locator('[data-resize="xy"]');
  await node.hover();
  const g = (await grip.boundingBox())!;
  await page.mouse.move(g.x + 8, g.y + 8);
  await page.mouse.down();
  await page.mouse.move(g.x + 128, g.y + 88, { steps: 8 });
  await page.mouse.up();
  const resized = (await node.boundingBox())!;
  expect(resized.width).toBeGreaterThan(box.width + 60);
  expect(resized.height).toBeGreaterThan(box.height + 40);
  await page.screenshot({ path: '/tmp/instralize-ports.png' });
});
