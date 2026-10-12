# CubeSteps V1.1 Guided Face-Color Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let club members enter a physical cube's six faces, correct invalid entries, and follow the existing explained LBL solution from the exact entered state.

**Architecture:** A pure facelet codec validates and converts color input into the existing immutable cube state. A discriminated input contract carries provenance through the worker and player. A separate draft model drives the guided editor, recovery, and undo; the existing teaching trace remains the authority for playback.

**Tech Stack:** Existing React, TypeScript, Vite, cubing.js 0.65.1, Vitest, Testing Library, Playwright, Node.js 24, npm, and ordinary CSS. No new product dependency.

**Spec:** [Approved V1.1 design](../specs/2026-10-12-guided-face-color-entry-design.md), approved October 12, 2026.

## Global Constraints

- English UI and documentation; browser-only computation, no accounts, uploads, backend, or general-solver fallback.
- Deliver six-face entry with the existing LBL course and algorithms. CFOP, Roux, ZZ, camera input, custom center schemes, picture cubes, and center-sticker orientation remain outside V1.1.
- Centers are fixed: U white, D yellow, F green, B blue, R red, L orange. Start with exactly 48 unfilled editable stickers and six filled, locked centers.
- Guided order is F, R, B, L, U, D. Grids are outside-view, row-major, indices 0–8, center 4. Holding directions must match the approved table exactly.
- Preserve separate scramble and color drafts. Palette selection stays stable; never automatically paint, turn the cube, or advance faces.
- Validate shape/centers, completion/counts, pieces/cyclic corner order, then reachability, in that order. Never use solver failure as a legality check or silently repair input.
- `SolveTrace.initial` is the starting-state authority. Preserve input provenance and verify it matches the trace. Internal renderer setup never becomes a teaching move or a displayed user scramble.
- Editing stickers, undoing, resetting, switching modes, and leaving the page invalidate pending work. Preserve prior verified results with their original read-only input snapshot.
- Use versioned sessionStorage for draft colors, face, and palette only. Invalid storage falls back safely; blocked storage leaves the feature usable in memory with a notice. Undo history and solutions are not persisted.
- Minimum 44px painting/navigation targets; verify a 390px viewport, keyboard access, reduced motion, and useful behavior without WebGL.
- Retain the original 1,000-seed LBL corpus and add at least 1,000 fixed-seed cases through the color path. Keep hash routing and the `/cube-steps/` Pages base path.
- New physical acceptance requires at least two differently scrambled real cubes, initial-state comparison, an entry correction, and following the LBL solution. Record it as pending until the owner confirms it; existing LBL acceptance is already confirmed.

## Review Focus

1. **Mirrored or rotated B/U/D grids:** independent asymmetric golden fixtures must catch errors that a codec round-trip cannot. Owned by Task 1 and checked against the actual renderer in Task 6.
2. **Incorrect legality rules:** reject single flips, single twists, mirrored corners, and unmatched swaps, while accepting paired flips, balanced twists, and matching edge/corner swaps. Owned by Task 1.
3. **Wrong renderer starting orientation or hidden setup counted as moves:** test all 24 solved holding orientations, solved input, provenance mismatch, and corrupted traces. Owned by Task 2; browser evidence in Task 6.
4. **A late result becoming attached to a changed draft:** test mutation, undo/reset, mode changes, navigation, random-scramble races, and immutable previous-solution snapshots. Owned by Tasks 2 and 5.
5. **Loss of input or access on less capable browsers:** malformed/blocked storage, refresh/lesson return, keyboard-only correction, 390px layout, and no-WebGL solving. Owned by Tasks 3–6.

## Starting Point and Execution

The repository is `D:\Projects\Cubing Calculator\cube-steps`. At planning time the local branch is `codex/face-color-input-design`, based on the deployed LBL version, with documentation commits recording owner acceptance and this design. These planning changes are local; this plan does not change the public site.

After plan approval, use `using-git-worktrees` to inspect attached worktrees and establish a suitable isolated implementation checkout containing these approved documents. Inspect status and refresh remote refs first; preserve existing changes and history. Follow the previously selected **Native** approach using `executing-plans`: implement sequentially in this session, then obtain one fresh independent review before integration. Do not start parallel implementers for these closely connected interfaces.

Commands below run from the implementation checkout; use `npm.cmd`/`npx.cmd` on Windows. Use the installed lockfile versions. Each implementation task begins with a meaningful failing assertion, then implementation and the focused passing check; Task 6 collects acceptance evidence for the completed feature. An import failure is only an initial scaffold failure; once exports exist, confirm the test exercises behavior. Commit a task only after its named tests and type checking pass. Do not repeatedly run the entire suite during every small edit.

## File Responsibilities

| Files | Responsibility |
| --- | --- |
| `src/core/types.ts`, new `src/core/state.ts` | Shared facelet/input types and defensive immutable state construction |
| New `src/core/facelet-layout.ts`, `src/core/facelets.ts` | One outside-view coordinate table, encoding, ordered validation and decoding |
| New `src/core/solve-input.ts` | Decode recorded provenance and compare it with a session's initial state |
| New `src/workers/solve-protocol.ts`, `src/workers/solve-request.ts`; existing `solve.worker.ts` | Serializable input/reply contract, independently checked worker input, existing LBL dispatch |
| Existing `src/app/solve-client.ts`; new `src/player/initial-setup.ts` | Request lifecycle and verified private renderer initialization |
| New `src/app/color-entry/draft.ts`, `draft-storage.ts` | Pure editing/undo transitions and recoverable versioned draft persistence |
| New `src/app/color-entry/FaceGrid.tsx`, `FaceOverview.tsx`, `HoldingGuide.tsx`, `ColorEntry.tsx`, `color-entry.css` | Shared grids, orientation cues, accessible guided editing and review |
| Existing `src/app/SolvePage.tsx`, `App.tsx`, player files | Input-mode integration, snapshot presentation, cancellation, playback compatibility |
| Adjacent tests, `tests/fixtures/facelet-cases.ts`, `tests/color-input-corpus.test.ts`, new color-entry E2E files | Independent mapping evidence, legality, lifecycle, browser and production regressions |
| `README.md`, new `docs/validation/v1.1.md`, `package.json` | Accurate capabilities, acceptance evidence, both corpus commands |

Keep mapping and legality out of React. Reuse the same grid renderer for editor, overview, and solution snapshot. Keep the existing LBL catalog, rules, and course content unchanged unless a demonstrated regression requires a narrowly tested fix.

## Shared Contracts

These names are the integration contract for all tasks; changes must update every consumer in the same task.

In `src/core/types.ts`:

```ts
type Facelets = Readonly<Record<Face, readonly (Color | null)[]>>;
type FaceletSnapshot = Readonly<Record<Face, readonly Color[]>>;
type FaceletRef = { face: Face; index: number };
type SolveInput =
  | { kind: 'scramble'; moves: readonly FaceMove[] }
  | { kind: 'facelets'; facelets: FaceletSnapshot };
interface SolveSession { input: SolveInput; trace: SolveTrace }
```

Array lengths and indices are runtime invariants: every face has nine cells; indices are 0–8. `Facelets` may be incomplete; `FaceletSnapshot` is a complete copied and frozen value produced by validation/encoding. Replace `SolveSession.scrambleMoves` in Task 2, not before its consumers are migrated.

## Task 1: Convert and Validate Face Colors Without Solving

**Files:** Create `src/core/state.ts`, `src/core/facelet-layout.ts`, `src/core/facelets.ts`, `src/core/facelets.test.ts`, `tests/fixtures/facelet-cases.ts`. Modify `src/core/types.ts` (facelet types only) and `src/core/cube.ts` (reuse immutable construction).

**Interfaces:** Consume existing `CubeState`, `Face`, `Color`, `EDGE_SLOTS`, `CORNER_SLOTS`, and `CENTER_SLOTS`. Produce:

- `copyCubeState(data: CubeState['data']): CubeState` in `state.ts`, extracted from the current private `copyState` with its defensive clone/freezes preserved.
- `FACE_ENTRY_ORDER: readonly Face[]`, `FACE_GUIDES: Record<Face, { top: Face; right: Face }>`, and `FACELET_LAYOUT: Record<Face, readonly ({ orbit: 'EDGES' | 'CORNERS' | 'CENTERS'; slot: number; sticker: number })[]>` in `facelet-layout.ts`. Exactly nine entries per face; `sticker` follows the existing slot string order.
- `stateToFacelets(state: CubeState): FaceletSnapshot` and `validateFacelets(value: unknown, solved: CubeState): FaceletValidation` in `facelets.ts`.
- `FaceletValidation = { ok: true; state: CubeState; facelets: FaceletSnapshot } | { ok: false; issues: FaceletIssue[] }`.
- `FaceletIssue = { code: FaceletIssueCode; message: string; cells: FaceletRef[] }`, with codes `shape`, `unknown-color`, `center`, `unfilled`, `color-count`, `piece-colors`, `duplicate-piece`, `mirrored-corner`, `edge-orientation`, `corner-orientation`, `permutation-parity`. Global invariant errors have an empty `cells` array.

- [x] **RED:** Add literal golden face grids for solved input, each of the six clockwise moves, and at least two asymmetric multi-face sequences. Export `GOLDEN_CASES: readonly { name: string; moves: readonly FaceMove[]; facelets: FaceletSnapshot }[]`. Derive/check these grids independently of the production mapping; record the outside-view reasoning in fixture comments. Never generate expected values by calling the codec under test.

  ```ts
  for (const example of GOLDEN_CASES) {
    const state = engine.apply(engine.solved(), example.moves);
    expect(stateToFacelets(state)).toEqual(example.facelets);
    const decoded = validateFacelets(example.facelets, engine.solved());
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error(example.name);
    expect(engine.equals(decoded.state, state)).toBe(true);
  }
  ```

- [x] Add all six move/inverse checks, nonmutation/deep-freeze checks, and 100 seeded legal round-trips. Add table-driven malformed shape, extra/missing faces/cells, unknown color, incorrect center, unfilled, wrong counts, invalid/duplicate pieces, and mirrored-corner tests. Assert prerequisite failures do not produce downstream parity errors.
- [x] Create cubie-level impossible/attainable fixtures by explicitly modifying the documented Reid orbit arrays, preserving the solved center representation. Assert single flip, single twist, and a lone edge/corner swap are rejected with the proper global code and no invented culprit cells. Assert two flips, twists of 1+2, and an edge swap paired with a corner swap are accepted. Include direct facelet mutations so the validator is not tested solely through its own encoder.
- [x] Run `npx.cmd vitest run src/core/facelets.test.ts`; expect the new contract/behavior assertions to fail before implementation.
- [x] **Implement:** Define one reviewed facelet-coordinate table matching F/R/B/L/U/D holding cues. Encode using actual orbit pieces/orientations and center colors. Decode edges by their two orders and corners only by valid cyclic orders; reject a matching color set with mirrored order. Compute parity from permutations and orientation sums in the existing convention. Build valid states from a clone of `solved`, replace edge/corner arrays, and retain ordinary-center metadata. Stop after the earliest failed validation tier while collecting actionable issues within that tier.
- [x] **GREEN:** Run `npx.cmd vitest run src/core` and `npm.cmd run typecheck`. Expect all domain tests and existing engine/parser tests to pass; legal round-trips must compare exactly, not merely report solvedness.
- [x] Commit: `git add src/core tests/fixtures/facelet-cases.ts` then `git commit -m "feat: validate and decode fixed-scheme cube colors"`.

## Task 2: Solve and Render Sessions With Explicit Input Provenance

**Files:** Create `src/core/solve-input.ts`, `src/core/solve-input.test.ts`, `src/workers/solve-protocol.ts`, `src/workers/solve-request.ts`, `src/workers/solve-request.test.ts`, `src/player/initial-setup.ts`, `src/player/initial-setup.test.ts`. Modify `src/core/types.ts`, `src/workers/solve.worker.ts`, `src/app/solve-client.ts`, `src/app/solve-client.test.ts`, `src/app/SolvePage.tsx`, `src/player/controller.ts`, `controller.test.ts`, `cubing-adapter.ts`, `CubePlayer.tsx`, and `PlayerFixture.tsx`. Inspect `LearnPage.tsx` for compatibility with the unchanged `solveScramble` entry point.

**Interfaces:** Consume Task 1 validation and existing `solveLBL`, `flattenTrace`, `CubeEngine`. Produce:

- The `SolveInput`/`SolveSession` contract above, with a copied input snapshot retained separately from editable drafts.
- `resolveSolveInput(engine: CubeEngine, input: SolveInput): CubeState` and `assertSessionInput(engine: CubeEngine, session: SolveSession): void` in `solve-input.ts`. Reject invalid provenance or inequality with `trace.initial`.
- `SolveRequestInput = { kind: 'scramble'; moves: readonly FaceMove[] } | { kind: 'facelets'; facelets: Facelets }`; `SolveRequest = { requestId: number; input: SolveRequestInput }` in `solve-protocol.ts`.
- `WorkerReply = { requestId: number; result: { ok: true; session: SolveSession } | { ok: false; error: { kind: 'input' | 'solver'; message: string; issues?: FaceletIssue[] } } }` in `solve-protocol.ts`.
- `handleSolveRequest(engine: CubeEngine, request: unknown): WorkerReply | null` in `solve-request.ts`; `null` only when no valid nonnegative safe-integer request ID can be echoed. Invalid payload with a valid ID gets an input error. The worker wrapper owns asynchronous engine startup and startup-error reporting.
- Keep `createSolveClient(factory?)`, `solveScramble(text): Promise<SessionResult>`, and `cancel()`. Add `solveFacelets(facelets: Facelets): Promise<SessionResult>`, extend errors with `kind: 'input'` and optional `issues`, and update `WorkerPort.postMessage` to `SolveRequest`. Preserve parse offsets, solver failure wording, cancellation settlement, and worker-error handling.
- `buildInitialSetup(engine: CubeEngine, session: SolveSession): TeachingMove[]` in `initial-setup.ts`. Change adapter call to `createCubingAdapter(host: HTMLElement, engine: CubeEngine, session: SolveSession)`; its existing returned methods and timing array remain unchanged.

- [x] **RED:** Extend client/worker tests for both input kinds, invalid runtime request shape, invalid move tokens, and invalid facelets. A validator failure must return structured issues before `solveLBL` is invoked (spy on that module in the handler test). Valid replies must retain the exact input snapshot and trace initial state. Test cancellation across input kinds, wrong request IDs, late replies after termination, input-array mutation after dispatch, and a failed worker startup. Pass successful replies through `structuredClone` in the worker double, then assert the client's published snapshot and cube-state arrays are immutable again.

  ```ts
  const reply = handleSolveRequest(engine, {
    requestId: 7, input: { kind: 'facelets', facelets: GOLDEN_CASES[1].facelets },
  });
  expect(reply?.result.ok).toBe(true);
  if (!reply?.result.ok) throw new Error('Expected a solved color-input session');
  const session = reply.result.session;
  expect(session.input).toEqual({ kind: 'facelets', facelets: GOLDEN_CASES[1].facelets });
  expect(() => assertSessionInput(engine, session)).not.toThrow();
  expect(engine.equals(engine.apply(engine.solved(), buildInitialSetup(engine, session)),
    session.trace.initial)).toBe(true);
  ```

- [x] Test setup construction for ordinary scramble sessions, asymmetric color sessions, and a solved color session with an empty trace. Test all 24 final solved orientations using test-only consistent traces that append whole-cube regrips; update recorded action/stage/final states together. Reject mismatched provenance, a false `trace.final`, and an unsolved trace endpoint. Assert controller totals equal only `flattenTrace(trace).moves.length` and start at index zero.
- [x] Run `npx.cmd vitest run src/core/solve-input.test.ts src/workers/solve-request.test.ts src/app/solve-client.test.ts src/player/initial-setup.test.ts src/player/controller.test.ts`; expect the new behavior to fail before implementation.
- [x] **Implement:** Migrate all session producers/consumers in this task. Revalidate worker inputs independently, copy provenance, dispatch the existing LBL solver, and keep client request IDs/termination protection. Restore immutability of received session data before publishing it to React because worker structured cloning does not preserve freezes. `assertSessionInput` replaces the scramble-only controller guard. The setup builder verifies replay equals `trace.final` and is solved, enumerates at most 24 orientations via whole-cube x/y rotations, finds Q, then returns Q plus inverse trace moves for color sessions. Require exact initial-state equality before the adapter attaches the renderer. Scramble sessions retain their original move setup. Report an explicit initialization failure on mismatch.
- [x] Keep the current scramble UI functioning. Narrow the session discriminant in its summary; temporarily render a labeled textual color snapshot for facelet sessions, replaced by the shared overview in Task 5. Catch controller initialization errors as well as adapter errors in `CubePlayer` so a rejected session does not crash the page. Do not silently treat invalid provenance as a WebGL-only fallback.
- [x] **GREEN:** Run the focused command above, `npm.cmd run test:unit`, `npm.cmd run typecheck`, and `npx.cmd playwright test e2e/player.spec.ts e2e/free-solve.spec.ts`. Existing scramble/lesson behavior must remain usable and worker cancellation tests must settle every promise.
- [x] Commit: `git add src/core src/workers src/app/solve-client.ts src/app/solve-client.test.ts src/app/SolvePage.tsx src/player` then `git commit -m "feat: solve and initialize playback from validated face colors"`.

## Task 3: Preserve an Editable Draft With Undo and Safe Recovery

**Files:** Create `src/app/color-entry/draft.ts`, `draft.test.ts`, `draft-storage.ts`, `draft-storage.test.ts`.

**Interfaces:** Consume shared facelet types and `FACE_ENTRY_ORDER`. Produce:

```ts
interface ColorDraft { facelets: Facelets; face: Face; selection: Color | null }
interface DraftState { draft: ColorDraft; history: readonly Facelets[]; revision: number }
type DraftAction =
  | { type: 'select-face'; face: Face }
  | { type: 'select-color'; color: Color | null }
  | { type: 'paint'; cell: FaceletRef }
  | { type: 'undo' }
  | { type: 'reset' };
// draft.ts
createBlankDraft(): ColorDraft;
createDraftState(draft?: ColorDraft): DraftState;
reduceDraft(state: DraftState, action: DraftAction): DraftState;
// draft-storage.ts
createDraftStore(open: () => Pick<Storage, 'getItem' | 'setItem'>): {
  load(): { draft: ColorDraft; available: boolean };
  save(draft: ColorDraft): boolean;
};
```

Use storage key `cubesteps.color-draft.v1` and envelope `{ version: 1, draft: ColorDraft }`. Default selection is white and default face F; null selection is the eraser. The storage reader checks representation, fixed centers, face, and palette, but must preserve incomplete/count-invalid drafts for correction. It must not require cube legality to restore unfinished work.

- [x] **RED:** Test exactly 48 null cells, locked centers, stable selection, paint/overwrite/erase, no-op painting, revisiting faces, and undo. Reset clears all editable cells in one undoable operation. Sticker changes and reset/undo increment `revision`; face/palette navigation does not. History snapshots never alias later edits.

  ```ts
  const start = createDraftState();
  const painted = reduceDraft(start, { type: 'paint', cell: { face: 'F', index: 0 } });
  const reset = reduceDraft(painted, { type: 'reset' });
  expect(reset.draft.facelets.F[0]).toBeNull();
  expect(reduceDraft(reset, { type: 'undo' }).draft.facelets).toEqual(painted.draft.facelets);
  expect(start.draft.facelets.F[0]).toBeNull();
  ```

- [x] Test persistence of all six faces, selected face and eraser/color; no history/solution persistence. Reject malformed JSON, versions, missing/extra faces, wrong lengths/centers, invalid colors and invalid selections. Catch storage getter, read, and write exceptions independently. Loading malformed data returns a blank draft without claiming storage is unavailable if the API itself works.
- [x] Run `npx.cmd vitest run src/app/color-entry/draft.test.ts src/app/color-entry/draft-storage.test.ts`; expect failures before implementing the reducer and store.
- [x] **Implement:** Keep editing transitions pure and defensively copy changed arrays. Store prior facelet snapshots for paint/erase/reset; undo restores one snapshot while keeping current navigation/palette. Ignore center/out-of-range painting. Validate recovered data without deleting unrelated storage. Return availability to the UI; never throw a storage exception into rendering.
- [x] **GREEN:** Run the same tests and `npm.cmd run typecheck`. Confirm intentionally incomplete and over-count drafts restore unchanged.
- [x] Commit: `git add src/app/color-entry/draft*` then `git commit -m "feat: retain color drafts with undo and session recovery"`.

## Task 4: Build the Guided Editor and Six-Face Review

**Files:** Create `src/app/color-entry/FaceGrid.tsx`, `FaceOverview.tsx`, `HoldingGuide.tsx`, `ColorEntry.tsx`, `ColorEntry.test.tsx`, and `color-entry.css`.

**Interfaces:** Consume Tasks 1 and 3 types and direction table. Export named React components:

- `FaceGrid` props: `{ face: Face; facelets: Facelets; editable?: boolean; invalidCells?: readonly FaceletRef[]; onPaint?: (cell: FaceletRef) => void }`.
- `FaceOverview` props: `{ facelets: Facelets; issues?: readonly FaceletIssue[]; onEdit?: (face: Face) => void }`; absence of `onEdit` makes a read-only solution snapshot.
- `HoldingGuide` props: `{ face: Face }`.
- `ColorEntry` props: `{ state: DraftState; onAction: (action: DraftAction) => void; validation: FaceletValidation | null; onCheck: () => void; onSolve: () => void; busy: boolean; storageAvailable: boolean }`.

`ColorEntry` owns only editor/review view selection. The parent owns validation and request lifecycle. Selecting Edit dispatches `select-face` and opens the editor. Next on D opens the overview; Back/revisit preserve all entries.

- [x] **RED:** Use a jsdom test file with Testing Library/user-event and a small reducer-backed harness. Test all six direction cues, center labels, all palette names, stable selection, Back/Next/revisit, erase/undo/reset, Edit from review, progress/counts including centers, over-count feedback, and validation invalidation as supplied by the parent. A complete draft alone must not enable solving before a successful check.

  ```ts
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'White', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Front, row 1, column 1, unfilled' }));
  expect(screen.getByRole('button', { name: 'Front, row 1, column 1, white' })).toBeVisible();
  expect(screen.getByLabelText('Front, row 2, column 2, green, fixed center')).toBeVisible();
  ```

- [x] Test Enter/Space painting via real button semantics, text as well as color selection/error indicators, local issue markers and global issue descriptions, read-only overview behavior, and the storage notice. Use explicit labels rather than brittle DOM offsets. Run `npx.cmd vitest run src/app/color-entry/ColorEntry.test.tsx`; expect these behaviors to fail before implementation.
- [x] **Implement:** Use shared grids with original inline SVG holding illustrations, exact center-based top/right cues, and the instruction to rotate the whole cube without turning layers. Provide a center-scheme check at entry and white-up/green-front instruction before solving. Use scoped CSS, visible focus, at least 44px editor/navigation targets, and wrapped labeled overview faces on narrow screens. Do not create a new 3D painter or introduce graphics dependencies.
- [x] **GREEN:** Run `npx.cmd vitest run src/app/color-entry` and `npm.cmd run typecheck`. Inspect the components through the page after Task 5; do not claim mobile layout acceptance from jsdom measurements.
- [x] Commit: `git add src/app/color-entry` then `git commit -m "feat: add guided face painting and accessible cube review"`.

## Task 5: Integrate Color Solving and Protect Request Lifecycles

**Files:** Modify `src/app/SolvePage.tsx` and `src/app/App.tsx`; create `src/app/SolvePage.test.tsx`. Modify `src/app/solve-client.test.ts` only if a new client-level regression is exposed.

**Interfaces:** Consume `ColorEntry`, `FaceOverview`, the reducer/store, `validateFacelets`, `createSolveClient().solveFacelets`, and discriminated `SolveSession`. Preserve `SolvePage({ engine }: { engine: CubeEngine })` and existing hash routes. Parent page state holds the current input mode, draft/revision, and validation paired to the revision checked; `SolveTrace.initial` stays the only session starting state.

- [x] **RED:** Add jsdom integration tests using a controlled solve-client mock and mocked visual player (worker and actual renderer behavior already have separate owning tests). Test checking invalid and valid entries, disabled-before-check solving, submitting the checked snapshot, and displaying `Colors used for this solution`. After a successful solve, editing the draft must leave the previous snapshot and trace unchanged.
- [x] For a pending deferred solve, exercise paint, erase, undo, reset, mode switch, and unmount separately. Assert cancellation and late-resolution suppression. Include scramble edits and a delayed random-scramble result arriving after entering color mode. Mode switches preserve both drafts; neither parse errors nor legality errors discard the prior verified session.

  ```ts
  // Render with a controlled pending color solve, then edit the draft.
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  await user.click(screen.getByRole('button', { name: 'Reset colors' }));
  expect(client.cancel).toHaveBeenCalled();
  await act(async () => pending.resolve({ ok: true, session: obsoleteSession }));
  expect(screen.queryByText('Verified LBL solution')).not.toBeInTheDocument();
  ```

- [x] Test storage recovery on mount, return from a lesson, and continued editing/solving after storage failure. UI validation must be cleared by every sticker revision; changing only the face or palette does not falsely alter the cube. Run `npx.cmd vitest run src/app/SolvePage.test.tsx`; expect the missing integration behavior to fail.
- [x] **Implement:** Add explicit `Scramble` / `Enter colors` controls, retain current scramble actions, and change the global navigation label to `Solve your cube`. Load the versioned draft once, persist each changed draft, and show the notice when a store operation fails. `Check colors` validates synchronously; `Explain with LBL` submits a copied valid snapshot only while its revision matches. Reuse the epoch guard across random generation and both solving modes. Cancel immediately inside mutation/mode handlers and on unmount, before late callbacks can commit a result. Keep controls available for correction while solving.
- [x] Replace the temporary color result summary with read-only `FaceOverview` under the exact snapshot label. Render scramble provenance only for scramble sessions. A newly completed session resets playback/stage selection; editing input does not replace or relabel an existing result. Route worker input issues back into actionable color review without clearing the draft.
- [x] **GREEN:** Run `npx.cmd vitest run src/app`, `npm.cmd run typecheck`, and `npx.cmd playwright test e2e/free-solve.spec.ts e2e/learning.spec.ts`. Expect existing course navigation and scramble solving to remain functional.
- [x] Commit: `git add src/app/SolvePage.tsx src/app/SolvePage.test.tsx src/app/App.tsx src/app/solve-client.test.ts` then `git commit -m "feat: integrate color-input solving with safe draft and result lifecycles"`.

## Task 6: Verify Color Solving, Browser Playback, and Release Readiness

**Files:** Create `tests/color-input-corpus.test.ts`, `e2e/color-entry.spec.ts`, `e2e/helpers/color-entry.ts`, `docs/validation/v1.1.md`. Modify `package.json`, `e2e/production.spec.ts`, and `README.md`. Keep existing `tests/solver-corpus.test.ts`. Inspect `.github/workflows/ci.yml` and `pages.yml`; their current `test:corpus` invocation should cover both corpora without duplicated workflow steps.

**Interfaces:** Consume `seededScramble(seed, length?)`, `GOLDEN_CASES`, `handleSolveRequest`, `replayMatchesRecordedStates`, `LBL_STAGE_IDS`, `checkStage`, and `flattenTrace`. Produce test helper `enterFacelets(page: Page, facelets: FaceletSnapshot): Promise<void>` that uses visible palette/sticker/face controls, not a hidden product-only test API. Keep any renderer inspection local to Playwright.

- [x] Add a 1,000-seed color-path corpus (seeds 1–1000, default 25 moves), independently checking original initial state equality, worker decode/solve, immutable input snapshot, ordered/skipped stages, every action boundary, algorithm references/repetition evidence, checkpoints, and final solvedness. Explicitly include solved/partially completed examples outside the random loop. Keep the existing scramble corpus intact.

  ```ts
  for (let seed = 1; seed <= 1000; seed++) {
    const initial = engine.apply(engine.solved(), seededScramble(seed));
    const reply = handleSolveRequest(engine, {
      requestId: seed, input: { kind: 'facelets', facelets: stateToFacelets(initial) },
    });
    if (!reply?.result.ok) throw new Error(`Color-input seed ${seed} failed`);
    const { trace } = reply.result.session;
    expect(engine.equals(trace.initial, initial)).toBe(true);
    expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
    expect(engine.isSolved(engine.apply(initial, flattenTrace(trace).moves))).toBe(true);
    // Also assert each stage checkpoint and each catalog-backed action as in the original corpus.
  }
  ```

- [x] Set `test:corpus` to `vitest run tests/solver-corpus.test.ts tests/color-input-corpus.test.ts`. Run `npm.cmd run test:corpus` first. This is an integration acceptance test, not a reason to manufacture a failing production change if Tasks 1–5 already meet it. If it reveals a bug, add the smallest focused failing regression before the fix; report seed and input.
- [x] Add Chromium/WebKit browser tests that enter a nonuniform golden fixture via visible controls, check/correct an invalid sticker, verify all six overview faces, and solve. At move zero compare all 54 colors of the actual TwistyPlayer pattern with the independent fixture using a test-side documented mapping. Also compare actual cubie pattern against the controller's boundary data, so a shared expected-state bug cannot hide the mismatch. Check next/previous moves, a regrip, formula replay, repeated stage jumps, camera orbit, and solved end state. Assert move totals exclude setup and no color-origin scramble instruction appears.
- [x] Add refresh and lesson-return recovery, malformed persisted data, storage read/write denial, keyboard painting, 390px layout/no horizontal overflow, 44px paint/navigation bounding boxes, reduced motion, and no-WebGL color validation/text-solution checks. Collect page errors and failed asset responses. Retain existing real-renderer tests; do not replace them with mocks.
- [x] Extend production tests at `/cube-steps/` with color entry through the real worker/renderer, route refresh, and retained draft. New browser checks describe acceptance behavior; if they fail, fix the owning module with a focused regression and rerun the affected checks.
- [x] **GREEN final verification:** Run `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run test:corpus`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run test:production`, and `git diff --check`. Capture and visually inspect desktop and 390px screenshots. Record exact commands, pass/fail evidence, browser versions, and limitations in `docs/validation/v1.1.md`; never label a host-blocked command as passing. Inspect the pinned renderer integration using actual browser state rather than trusting a static screenshot alone.
- [x] Update README with the two solve inputs, standard center scheme, browser-only draft handling, live/preview status, and incremental method roadmap. Record existing LBL physical acceptance separately from **V1.1 color-entry physical acceptance: pending owner check**. Include the two-cube/correction checklist and retain third-party notices and MIT licensing.
- [x] Commit: `git add tests/color-input-corpus.test.ts e2e package.json README.md docs/validation/v1.1.md` then `git commit -m "test: verify color-input solving and document V1.1 acceptance"`.
- [ ] Obtain the independent final branch review specified by the preserved Native workflow. Fix actionable findings, rerun affected checks, and complete `verification-before-completion`. Present the reviewed change and remaining physical check accurately. Use the existing GitHub integration/Pages workflow when authorized; preserve prior applicable merge/deploy authorization rather than asking again automatically. Attach any created PR to this task and verify CI before merging. Synchronize the local main branch after merge. Deploy as `publish_preview=true, teaching_accepted=false` while the new physical check remains pending, then verify the public site, worker, route refresh, and initial colors. Do not describe deployment or physical acceptance as completed before evidence exists.

## Plan Self-Review and Handoff

Inline review completed against the approved spec: the six tasks cover guided entry, direction mapping, ordered legality, snapshots, recovery, worker validation/cancellation, renderer initialization, accessibility, both corpora, and release/physical acceptance. Each Review Focus item has a named owner and explicit checks. Contract migration is kept together in Task 2 so a change from scramble-only sessions does not leave a broken player or lesson between tasks. No dependencies or later solving methods are added by this plan.

**Implementation status:** The owner approved execution on October 12, 2026. All six implementation tasks, automated acceptance, and independent branch review are complete. The reviewer found no actionable issues in `5418b26..ed5aeda`. The final delivery checkbox above is an implementation-time snapshot; CI, merge, local synchronization, and public preview evidence are tracked in [PR #3](https://github.com/Leosteeeve/cube-steps/pull/3). New physical-input acceptance remains pending.
