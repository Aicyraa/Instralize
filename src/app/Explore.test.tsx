// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Explore } from './Explore';
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
afterEach(cleanup);
it('switches algorithms, rejects malformed inputs and seeks through valid traces', async () => {
  const user = userEvent.setup();
  render(<Explore />);
  await user.click(screen.getByRole('button', { name: 'Binary search' }));
  expect(screen.getByRole('heading', { name: 'Binary search', level: 1 })).toBeTruthy();
  const input = screen.getByLabelText('Array values');
  await user.clear(input); await user.type(input, '3, 1');
  await user.click(screen.getByRole('button', { name: 'Apply input' }));
  expect(screen.getByRole('alert').textContent).toContain('ascending');
  await user.click(screen.getByRole('button', { name: 'Sort input ↑' }));
  expect((input as HTMLTextAreaElement).value).toBe('1, 3');
  await user.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('slider', { name: 'Playback position' }).getAttribute('value')).toBe('1');
});
