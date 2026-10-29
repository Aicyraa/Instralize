import { expect, test } from '@playwright/test';
test('explore validates, searches and replays on desktop and mobile', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Bubble sort', level: 1 }),
  ).toBeVisible();
  if (isMobile)
    await page.getByRole('button', { name: 'Algorithms & input' }).click();
  await page
    .getByRole('button', { name: 'Binary search', exact: true })
    .click();
  if (isMobile)
    await page.getByRole('button', { name: 'Algorithms & input' }).click();
  await page.getByRole('textbox', { name: 'Array values' }).fill('3, 1, 2');
  await page.getByRole('button', { name: 'Apply input' }).click();
  await expect(page.getByRole('alert')).toContainText('ascending');
  await page.getByRole('button', { name: 'Sort input ↑' }).click();
  await expect(page.getByRole('textbox', { name: 'Array values' })).toHaveValue(
    '1, 2, 3',
  );
  if (isMobile)
    await page
      .getByRole('button', { name: 'Close Algorithms & input' })
      .click();
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
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Correct for this input',
  );
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('.code-execution-line').first()).toBeVisible();
  await page.getByRole('button', { name: 'Check examples' }).click();
  await expect(page.getByRole('status')).toContainText(
    'All 7 example checks passed',
  );
  await page
    .getByRole('combobox', { name: 'Code example' })
    .selectOption('merge');
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Correct for this input',
  );
  const editor = page.getByRole('textbox', { name: 'Algorithm code editor' });
  await editor.fill('function sort(arr) { const n = arr.length; return arr; }');
  await page.getByRole('button', { name: 'Run & play' }).click();
  await expect(page.getByRole('status')).toContainText('Incorrect result');
  await editor.fill('function sort(arr) { arr.sort(); }');
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
    page.getByRole('heading', { name: 'Bubble sort', level: 1 }),
  ).toBeVisible();
});

test('recursion, alternate array styles and accessible drawers', async ({
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
  if (isMobile)
    await page.getByRole('button', { name: 'Algorithms & input' }).click();
  await page
    .getByRole('button', { name: 'Tower of Hanoi', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByRole('button', { name: /hanoi\(3/ })).toBeVisible();
  if (isMobile)
    await page.getByRole('button', { name: 'Algorithms & input' }).click();
  await page.getByRole('button', { name: 'Merge sort', exact: true }).click();
  if (!isMobile)
    await page
      .getByRole('combobox', { name: 'Visualization style' })
      .selectOption('circles');
  if (!isMobile) await page.setViewportSize({ width: 1100, height: 800 });
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Execution inspector' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
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
