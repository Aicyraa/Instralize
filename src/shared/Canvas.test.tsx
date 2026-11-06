// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Canvas } from './Canvas';
globalThis.ResizeObserver = class implements ResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback([], this);
  }
  unobserve() {}
  disconnect() {}
};
afterEach(cleanup);
const nodes = [
  {
    id: 'a',
    title: 'Alpha',
    icon: 'A',
    x: 0,
    y: 0,
    width: 200,
    children: <p>one</p>,
  },
  {
    id: 'b',
    title: 'Beta',
    icon: 'B',
    x: 300,
    y: 0,
    width: 200,
    children: <p>two</p>,
  },
];
it('renders connected nodes with labelled map controls', () => {
  const { container } = render(
    <Canvas
      label="Test map"
      nodes={nodes}
      edges={[{ id: 'e', from: 'a', to: 'b' }]}
    />,
  );
  expect(screen.getByRole('group', { name: 'Test map' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Alpha' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Beta' })).toBeTruthy();
  for (const name of ['Zoom in', 'Zoom out', 'Fit view', 'Reset layout'])
    expect(screen.getByRole('button', { name })).toBeTruthy();
  expect(container.querySelectorAll('.flow-edge').length).toBeLessThanOrEqual(
    1,
  );
});
it('keeps content interactive inside nodes', async () => {
  const user = userEvent.setup();
  let clicks = 0;
  render(
    <Canvas
      label="Test map"
      edges={[]}
      nodes={[
        { ...nodes[0], children: <button onClick={() => clicks++}>Go</button> },
      ]}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Go' }));
  expect(clicks).toBe(1);
});
