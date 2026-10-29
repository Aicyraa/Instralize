// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Explore } from './Explore';
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
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
