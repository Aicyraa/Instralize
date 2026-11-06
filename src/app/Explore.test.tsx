// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Explore } from './Explore';
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
afterEach(cleanup);
it('switches algorithms, rejects malformed inputs and seeks through valid traces', async () => {
  const user = userEvent.setup();
  render(<Explore />);
  await user.click(screen.getByRole('button', { name: 'Binary search' }));
  expect(
    screen.getByRole('heading', { name: 'Binary search', level: 1 }),
  ).toBeTruthy();
  const input = screen.getByRole('textbox', { name: 'Array values' });
  await user.clear(input);
  await user.type(input, '3, 1');
  await user.click(screen.getByRole('button', { name: 'Apply input' }));
  expect(screen.getByRole('alert').textContent).toContain('ascending');
  await user.click(screen.getByRole('button', { name: 'Sort input ↑' }));
  expect((input as HTMLTextAreaElement).value).toBe('1, 3');
  await user.click(screen.getByRole('button', { name: 'Next step' }));
  expect(
    screen
      .getByRole('slider', { name: 'Playback position' })
      .getAttribute('value'),
  ).toBe('1');
});

it('supports keyboard navigation in the inspector tabs', async () => {
  const user = userEvent.setup();
  render(<Explore />);
  const explanation = screen.getByRole('tab', { name: 'Explanation' });
  explanation.focus();
  await user.keyboard('{ArrowRight}');
  expect(
    screen.getByRole('tab', { name: 'Steps' }).getAttribute('aria-selected'),
  ).toBe('true');
  await user.keyboard('{End}');
  expect(
    screen.getByRole('tab', { name: 'Details' }).getAttribute('aria-selected'),
  ).toBe('true');
  expect(screen.getByRole('tabpanel').textContent).toContain('Bubble sort');
});

it('adds, rewires and removes independent node instances from the panel', async () => {
  const user = userEvent.setup();
  const panel = document.createElement('div');
  document.body.append(panel);
  render(<Explore panel={panel} />);
  await user.click(screen.getByRole('button', { name: 'Add Visualization' }));
  expect(
    screen.getByRole('heading', { name: 'Visualization 2', level: 2 }),
  ).toBeTruthy();
  const sliders = () =>
    screen
      .getAllByRole('slider', { name: 'Playback position' })
      .map((slider) => slider.getAttribute('value'));
  expect(sliders()).toEqual(['0', '0']);
  await user.click(screen.getAllByRole('button', { name: 'Next step' })[1]);
  expect(sliders()).toEqual(['0', '1']);

  await user.click(screen.getByRole('button', { name: 'Add Execution map' }));
  const source = screen.getByRole('combobox', {
    name: 'Source for Execution map 2',
  }) as HTMLSelectElement;
  expect(source.value).toBe('visualization-2');
  await user.selectOptions(source, '');
  expect(screen.getByText(/Connect a Visualization node/)).toBeTruthy();

  await user.click(
    screen.getByRole('button', { name: 'Remove Visualization 2' }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Visualization 2' })).toBeNull(),
  );
  expect(sliders()).toEqual(['0']);
  expect(
    screen.queryByRole('button', { name: 'Remove Visualization' }),
  ).toBeNull();
  panel.remove();
});

it('creates a connected pipeline with its own algorithm', async () => {
  const user = userEvent.setup();
  const panel = document.createElement('div');
  document.body.append(panel);
  render(<Explore panel={panel} />);
  await user.click(
    screen.getByRole('button', { name: 'New connected pipeline' }),
  );
  for (const name of [
    'Algorithms 2',
    'Input 2',
    'Visualization 2',
    'Execution map 2',
  ])
    expect(screen.getByRole('heading', { name })).toBeTruthy();
  expect(
    screen.getByRole('heading', { name: 'Selection sort', level: 3 }),
  ).toBeTruthy();
  panel.remove();
});
