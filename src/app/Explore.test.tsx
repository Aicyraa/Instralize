// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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
    screen.getByRole('button', { name: 'About Binary search' }),
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

it('lists only completed steps in the execution map', async () => {
  const user = userEvent.setup();
  render(<Explore />);
  expect(screen.getByText('No steps done yet.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Next step' }));
  await user.click(screen.getByRole('button', { name: 'Next step' }));
  const log = screen.getByRole('list', { name: 'Completed steps' });
  expect(log.querySelectorAll('li')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Previous step' }));
  expect(log.querySelectorAll('li')).toHaveLength(1);
});

it('grows the recursion tree and shows returned values', async () => {
  const user = userEvent.setup();
  render(<Explore />);
  await user.click(screen.getByRole('button', { name: 'Fibonacci' }));
  expect(screen.queryByRole('group', { name: 'Visualization style' })).toBeNull();
  const slider = screen.getByRole('slider', { name: 'Playback position' });
  const last = Number(slider.getAttribute('max'));
  await user.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('button', { name: /^fib\(5\), active/ })).toBeTruthy();
  fireEvent.change(slider, { target: { value: String(last) } });
  expect(
    screen.getByRole('button', { name: 'fib(5), returned, returns 5' }),
  ).toBeTruthy();
  expect(screen.getByText('Finished')).toBeTruthy();
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
    screen.getByRole('button', { name: 'About Selection sort' }),
  ).toBeTruthy();
  panel.remove();
});
