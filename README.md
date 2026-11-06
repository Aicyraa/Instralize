# Instralize

An interactive algorithm studio built with React, TypeScript, and Vite. Explore built-in algorithms or write a sorting function and follow its execution in Code Lab.

## Run locally

```sh
npm ci
npm run dev
```

```sh
npm run build       # Type-check and build production assets
npm run preview     # Serve the production build
npm run lint        # ESLint, including React Hooks rules
npm test            # Algorithms, playback, interpreter, and interaction tests
npm run test:watch  # Watch unit tests
npm run format      # Format source and configuration
npm run format:check
npx playwright install chromium
npm run test:e2e    # Desktop/mobile flows against the production build
```

## Explore

The algorithm browser contains bubble, selection, insertion, merge, quick, heap, shell, and counting sort; linear and binary search; Fibonacci, factorial, and Tower of Hanoi.

Enter 1–64 comma-separated integers between −999 and 999. Invalid tokens produce an error rather than being discarded. Binary search requires ascending input and offers an explicit **Sort input** action; searches return the first matching index. Recursion limits are Fibonacci 0–8, factorial 0–10, and Hanoi 1–5.

Play, pause, move backward or forward, seek on the timeline, replay, and change speed. The inspector explains operations, lists nearby steps, and shows metrics. Recursion cards show reached calls, evaluated base conditions, waiting states, and returned results; Hanoi also shows disk movements. Colors are paired with operation text. Reduced-motion preferences are respected.

## Studio panel

The floating studio panel switches between Explore and Code Lab. Drag its logo to move it (or focus the logo and use the arrow keys); double-click it to reset its position. The settings button opens workspace actions and canvas preferences (minimap, dot grid, snap to grid, animated links), which are remembered locally.

Explore can add more Algorithms, Input, Visualization, and Execution map nodes, or a complete connected pipeline for side-by-side comparisons. Each visualization has its own timeline. Dependent nodes include a source menu for rewiring, and extra instances can be removed. In Code Lab, additional visualizations and execution maps mirror the same run, so you can compare display styles.

## Code Lab

Start with bubble sort, recursive merge sort, or recursive quicksort. Draft code is saved locally when browser storage is available. **Reset example** replaces the draft with the selected starter.

The entry point is `function sort(arr)`. Mutate the input and return nothing, or return a numeric array. Use:

- Numeric/boolean literals and numeric arrays; `let` and `const`.
- Named synchronous helper functions and recursion with plain parameters.
- `if/else`, conditional expressions, `for`, `while`, `do/while`, `break`, and `continue`.
- Arithmetic, comparisons, logical expressions, assignments, and increments.
- Indexed array reads/writes and swap assignments such as `[arr[i], arr[j]] = [arr[j], arr[i]]`.
- Array `length`, `slice`, `push`, and `pop`; `Math.floor`, `Math.min`, and `Math.max`.

Only function declarations are accepted at the top level. Imports, arbitrary objects/properties, classes, async code, browser/network APIs, built-in `.sort()`, and other syntax are unsupported. Out-of-bounds indexed access is an error. This is a documented JavaScript subset, not a general JavaScript runtime; `==` and `!=` use strict equality without coercion.

Code runs through an AST interpreter in a dedicated Web Worker; it is never passed to `eval` or `Function`. Limits are 20KB source, 100,000 interpreter operations, 10,000 trace frames, 64 calls, 256 cells per array, 8,192 cumulative array cells, and a three-second worker deadline. **Stop**, changing source/input, and leaving the tab terminate pending execution. Recorded partial traces remain available after runtime/limit failures or Stop; editing invalidates them.

The editor highlights execution lines and exposes variables and the call stack. Temporary arrays appear in the working-buffer display while the original input remains visible; returned arrays become the final visualization. Tab indents; Escape followed by Tab leaves the editor.

Unrelated code that never inspects or modifies the input is rejected. Supported but incorrect attempts remain playable. Result checks require ascending order and preservation of all input values. **Check examples** runs seven fixed edge cases and reports the first failure. Passing examples is not proof of correctness.

## Code organization

- `src/app/`: workspace composition.
- `src/features/algorithms/`: registry, validation, and pure trace generators.
- `src/features/playback/`: reducer, timer lifecycle, and transport controls.
- `src/features/visualizations/`: array, recursion, and inspector views.
- `src/features/code-lab/`: editor, interpreter, worker protocol, and examples.
- `src/shared/`: shared interface primitives.
- `e2e/`: production browser checks.

Immutable frames contain resulting state, so backward seeking does not replay mutations. Each workspace owns its playback state. Algorithm complexity labels exclude trace-recording overhead. Tailwind provides theme tokens and layout utilities; component CSS handles diagram geometry. Motion handles element transitions, and IBM Plex fonts are bundled locally.

The existing `AGENTS.md` is preserved as originally requested; this README describes the updated paths and test commands. Favicon credit: Flaticon.
