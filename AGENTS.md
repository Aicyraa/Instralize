# Repository Guidelines

## Project Structure & Module Organization

Instralize is a React and TypeScript algorithm visualizer built with Vite. `src/main.tsx` mounts the app, and `src/App.tsx` coordinates its interface and state.

- `src/algorithms/sorting/` and `src/algorithms/recursion/` generate algorithm steps.
- `src/engine/` defines shared types and animation playback behavior.
- `src/components/` contains workspace controls, visualizers, and reusable UI elements.
- `src/hooks/` contains canvas interaction logic.
- `src/App.css` and `src/index.css` provide styling; `src/assets/` and `public/` hold assets.

Keep algorithm logic separate from rendering. Extend the shared `Step` contract in `src/engine/types.ts` deliberately when introducing new visual behavior.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server.
- `npm run build`: run TypeScript project checks and generate production assets in `dist/`.
- `npm run lint`: run ESLint across the repository.
- `npm run preview`: serve the production build locally after building.

## Coding Style & Naming Conventions

Use TypeScript with strict checking, two-space indentation, single quotes, and semicolons in application code. Match the surrounding file when editing configuration. Use PascalCase for React components and their filenames, camelCase for functions and variables, and `use` prefixes for hooks. Algorithm modules use lowercase names such as `bubble.ts` and `factorial.ts`.

Use `import type` for type-only dependencies. ESLint checks TypeScript, React Hooks, and React Refresh conventions; no dedicated formatter is configured.

## Testing Guidelines

There is currently no automated test framework, test script, or coverage threshold. Run `npm run lint` and `npm run build` before submitting changes. Manually verify affected algorithms, playback, pause, step, reset, speed controls, and canvas interactions. For algorithm changes, check step snapshots and final results with duplicate values and already-sorted inputs where applicable.

## Commit & Pull Request Guidelines

Recent commits commonly use Conventional Commit prefixes with optional scopes, such as `feat(recursion/algorithms): ...`, `fix(RecursionVisualizer): ...`, and `chore(ui): ...`. Follow this pattern with a concise, imperative description.

Pull requests should explain the behavior changed, link relevant issues, and report validation performed. Include screenshots or a short recording for visual changes, especially animation or layout updates.
