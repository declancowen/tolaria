# Review: Tolaria UI Browser Panel

## Project context

| Field | Value |
|-------|-------|
| **Repository** | tolaria |
| **Remote** | origin https://github.com/declancowen/tolaria.git |
| **Branch** | main |
| **Stack** | Tauri, React, TypeScript, Rust |

## Scope

- `src/App.tsx` — added Turn 1
- `src/components/note-list/*` — added Turn 1
- `src/components/EditorRightPanel.tsx` — added Turn 1
- `src/components/AiWorkspaceSideHeader.tsx` — added Turn 1
- `src/components/inspector/InspectorChrome.tsx` — added Turn 1
- `src/components/FolderTree.tsx` — added Turn 1
- `src-tauri/src/vault/*` — added Turn 1
- `src/lib/locales/*.json` — added Turn 1
- `src-tauri/src/transcription_*` and `src-tauri/src/commands/transcription.rs` — added Turn 2
- `src/components/RecordingTranscriptBlock.tsx` and `src/components/TranscriptionSettingsSection.tsx` — added Turn 2
- `src/hooks/useDictationShortcut.ts` and `src/utils/*recording*` / `src/utils/*transcription*` — added Turn 2
- `src/components/editorSchema.tsx`, `src/utils/editorDurableMarkdown.ts`, and recording markdown tests — added Turn 2
- settings, mock Tauri handlers, docs, ADR, and macOS entitlements for local transcription — added Turn 2
- `src/main.tsx`, `src/utils/platform.ts`, `src/App.css`, `src/components/Editor.css`, and collapsed header tests — added Turn 3
- `src-tauri/src/vault/config_seed.rs`, `src-tauri/src/vault/getting_started.rs`, vault/MCP guidance readers, and guidance docs — added Turn 3
- `src-tauri/src/app_updater.rs`, release workflows, and `src-tauri/tauri.conf.json` updater endpoints — added Turn 3
- live transcription cleanup in `src/components/RecordingTranscriptBlock.tsx`, `src/utils/transcriptionRuntime.ts`, native transcription commands, and persistent dictation toast wiring — added Turn 3
- `src/App.tsx`, `src/components/EditorRightPanel.tsx`, `src/components/Inspector.tsx`, `src/components/note-list/NoteListViews.tsx`, and regression tests for browser AI panel / grouped card headings / properties divider — added Turn 4

## Hotspots

- note-list display modes rendering large vaults — added Turn 1
- two-column browser/editor navigation state — added Turn 1
- shared toolbar and side-panel icon sizing — added Turn 1
- hidden root guidance files and folder-tree root behavior — added Turn 1
- local transcription model download/delete lifecycle — added Turn 2
- recording block markdown persistence and editor insertion — added Turn 2
- dictation clipboard/active-target insertion while recording sessions are mutually exclusive — added Turn 2
- Tauri microphone permission and Whisper runtime packaging — added Turn 2
- macOS fullscreen traffic-light offset and collapsed-sidebar header positioning — added Turn 3
- hard migration of managed guidance into hidden `.laputa/agents/` with restore/MCP parity — added Turn 3
- chunked live recording transcription and async native model/download commands — added Turn 3
- fork-owned updater metadata and release feed generation — added Turn 3
- browser-mode AI workspace visibility without an open editor — added Turn 4
- single-divider right-panel ownership for Properties vs AI — added Turn 4
- virtualized card-grid group heading span/alignment — added Turn 4

## Review status

| Field | Value |
|-------|-------|
| **Review started** | 2026-06-26 22:29:20 BST |
| **Last reviewed** | 2026-06-27 10:33:45 BST |
| **Total turns** | 5 |
| **Open findings** | 0 |
| **Resolved findings** | 11 |
| **Accepted findings** | 0 |

## Turn 5 — 2026-06-27 10:33:45 BST

| Field | Value |
|-------|-------|
| **Commit** | 56dde097 plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Re-reviewed the branch after the push gate exposed a Rust clippy failure in the transcription model catalog helper.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** low — the fix is limited to catalog construction shape and does not change model IDs, titles, URLs, paths, install state, or runtime behavior.
**Change archetypes:** native lint-gate cleanup, transcription model catalog maintainability.
**Intended change:** Remove the clippy `too_many_arguments` failure without weakening the hook or changing transcription behavior.
**Intent vs actual:** The helper now accepts a named `ModelDefinitionSeed`, preserving the existing model metadata while making field ownership explicit and keeping the push gate intact.
**Confidence:** high for the native change; medium for the full branch until the push gate and Apple Silicon build complete again.
**Coverage note:** Native formatter and clippy passed for the touched Rust file path. Broader validation remains covered by Turn 4 and the retrying pre-push gate.
**Finding triage:** One push-gate finding was live and resolved. No additional issues found in the model catalog path.
**Static/analyzer evidence:** `cargo fmt --manifest-path src-tauri/Cargo.toml --check` and `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` passed. CodeScene MCP/CLI and Codacy CLI remained unavailable.
**Architecture impact:** None. The model catalog remains the single source for downloadable transcription model metadata.
**Deep-review evidence:** Correctness/safety pass confirmed no metadata values changed. Maintainability/structure pass confirmed the replacement removes positional argument drift and keeps future model additions readable.
**Bug classes / invariants checked:** Transcription model identity, engine/language metadata, artifact URLs, model size, and install artifact list are preserved.
**Branch totality:** Rechecked this native gate fix against the Turn 2 transcription/download work and Turn 3 async download/runtime changes.
**Sibling closure:** The sibling catalog entries use the same named seed shape, so the previous positional-argument issue is removed from all current models.
**Remediation impact surface:** Local to `src-tauri/src/transcription_models.rs`; no command signatures, serialized responses, settings keys, or frontend model consumers changed.
**Residual risk / unknowns:** CodeScene and Codacy are still not runnable locally in this environment. Final confidence depends on the full pre-push gate and packaged app build.

### Validation

- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — passed
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` — passed

### Branch-totality proof

- **Non-delta files/systems re-read:** `src-tauri/src/transcription_models.rs` and the prior transcription review scope.
- **Prior open findings rechecked:** none open from Turns 1-4.
- **Prior resolved/adjacent areas revalidated:** model catalog naming, download/install status construction, and async transcription model command assumptions.
- **Hotspots or sibling paths revisited:** all current model catalog entries.
- **Dependency/adjacent surfaces revalidated:** native formatter and clippy gate.
- **Why this is enough:** The failed gate was isolated to construction shape in one helper; the fix preserves all catalog values and directly satisfies the failing native check.

### Challenger pass

- `done` — Assumed a cleanup could accidentally change user-visible model metadata; diff review confirmed the same model IDs, names, engine, language mode, license, sizes, descriptions, and artifact URLs are retained.

### Resolved / Carried / New findings

#### B5-1 — Resolved — Low — `src-tauri/src/transcription_models.rs`

The native model catalog used an eight-argument helper, which tripped the push gate's clippy `too_many_arguments` rule and made future model metadata edits easy to mis-order.

Resolution: replaced the positional helper parameters with a named `ModelDefinitionSeed` while preserving all existing catalog values.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** retry the full pre-push gate and run the requested Apple Silicon build.
3. **Patterns noticed:** named seed/config structs are a better fit for catalog metadata than positional helper calls.
4. **Suggested approach:** keep future model additions inside the same named seed shape unless the catalog moves to external data.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

## Turn 4 — 2026-06-27 10:12:26 BST

| Field | Value |
|-------|-------|
| **Commit** | 18f2b6e1 plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Deep-reviewed the focused UI patch that removes the duplicate Properties divider, mounts AI chat beside the browser surface when no editor is open, and makes virtualized card-grid group headings span the full grid row without relying on `:has()`.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** medium — shared app layout state and virtualized note-list rendering changed, but the patch is narrow and has direct regression tests plus full frontend safety checks.
**Change archetypes:** UI layout, right-panel composition, virtualized grid rendering, regression coverage.
**Intended change:** Match Properties divider thickness to AI chat, allow AI chat from browser/no-document state, and correct grouped rows/cards alignment without disturbing list mode or editor right-panel behavior.
**Intent vs actual:** The implementation matches the request. `Inspector` no longer draws its own left border when nested inside `EditorRightPanel`, the browser surface now renders the same side-mode AI workspace when the editor is hidden, and grouped card headings are marked on the virtualized grid item wrapper so they span all columns.
**Confidence:** high for the React behavior covered by tests and build; medium for pixel-perfect visual alignment until a packaged/native visual pass is repeated after the build.
**Coverage note:** Targeted regression tests cover the three requested failures. Full frontend coverage also passed at 87.01% lines.
**Finding triage:** No new findings. The most likely bug classes were duplicate border ownership, missing mount point for browser-mode AI, and virtualized grid wrapper alignment drift; each now has a direct assertion or clear code ownership.
**Static/analyzer evidence:** ESLint, TypeScript, production Vite build, locale validation, whitespace check, demo-vault dirt check, targeted Vitest, and full frontend coverage passed. CodeScene MCP/CLI and Codacy CLI remained unavailable in this environment.
**Architecture impact:** No new architecture decision. The patch keeps right-panel border ownership in `EditorRightPanel` and keeps note-list virtualized grid layout inside `NoteListViews`.
**Deep-review evidence:** Correctness/safety pass checked browser/editor visibility state, AI workspace open/close behavior without an active tab, panel tab availability when an editor is present, properties border ownership, and grid heading item wrapping. Maintainability/structure pass checked that the border special case is a small prop on the existing Inspector boundary and that grid span logic lives on the virtualized item wrapper rather than in fragile global selectors.
**Bug classes / invariants checked:** AI chat can open with no active document; editor-mode properties still show document properties; no duplicate right-panel left divider; group headings remain full-row in card grid mode; list/rows continue using their existing virtualized row path; demo vault fixtures stay clean.
**Branch totality:** Re-read the current-turn files and checked them against prior right-panel/browser-view findings from Turns 1-3.
**Sibling closure:** Properties and AI right-panel header surfaces were checked together; browser AI and editor AI share the same `AppAiWorkspaceSurface`; list, row, and card browser modes still flow through `buildBrowserViewItems`.
**Remediation impact surface:** The changes are local to React layout/rendering and test setup. No native, persistence, locale copy, or vault scanner behavior was changed in this turn.
**Residual risk / unknowns:** CodeScene and Codacy are still missing locally. Native visual smoke is deferred to the Apple Silicon build run requested after push.

### Validation

- `pnpm exec tsc --noEmit` — passed
- `pnpm exec vitest run src/components/EditorRightPanel.test.tsx src/components/NoteList.rendering.test.tsx src/App.test.tsx --reporter=dot` — passed, 100 tests
- `pnpm lint` — passed
- `pnpm build` — passed
- `pnpm l10n:validate` — passed, 20 locale catalogs / 1,000 English keys
- `FRONTEND_COVERAGE_CONCURRENCY=1 VITEST_COVERAGE_MAX_WORKERS=2 node scripts/run-vitest-coverage-shards.mjs --silent` — passed, 4,756 tests; lines 87.01%
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; no CodeScene MCP tool exposed and `cs` CLI unavailable
- Codacy scan — not run; no Codacy MCP tool exposed and `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `App.tsx`, `App.css`, `EditorRightPanel.tsx`, `Inspector.tsx`, `NoteListViews.tsx`, AI workspace sizing/header code, and the shared Virtuoso test mock.
- **Prior open findings rechecked:** none open from Turns 1-3.
- **Prior resolved/adjacent areas revalidated:** three-column browser/editor separation, right-panel tab switching, shared AI workspace side surface, and grouped note-list virtualization.
- **Hotspots or sibling paths revisited:** card grid grouping, row/list grouped rendering path, browser AI side panel, and editor Properties/AI right panel.
- **Dependency/adjacent surfaces revalidated:** frontend build, localization validation, coverage, whitespace, and demo-vault dirt checks.
- **Why this is enough:** The review attacked the exact UI ownership bugs reported by the user and paired them with targeted regression tests plus the full frontend coverage lane.

### Challenger pass

- `done` — Assumed the browser AI panel could accidentally render inside the editor or lose side-mode behavior. The regression asserts it mounts under `.app__browser-ai-panel`, outside `.app__editor`, with `data-ai-workspace-mode="side"`.
- `done` — Assumed virtualized grid group headings might not span because class application was on the wrong DOM layer. The regression checks the nearest grid item wrapper receives the group span class.

### Resolved / Carried / New findings

No new findings.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** run the requested Apple Silicon packaged build and visually verify Properties/AI divider thickness plus grouped rows/cards in the native app.
3. **Patterns noticed:** keep side-panel border ownership at the containing panel level; avoid global CSS selectors that depend on descendant structure inside virtualized wrappers.
4. **Suggested approach:** if grouped row/card alignment continues to shift visually, add one Playwright screenshot smoke against a deterministic grouped vault fixture.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

## Turn 3 — 2026-06-27 02:45:01 BST

| Field | Value |
|-------|-------|
| **Commit** | 9ea7ebaf plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Re-reviewed the cumulative local work after adding macOS fullscreen sidebar alignment, fork-owned updater/release endpoints, hidden managed guidance migration, async transcription model commands, live chunk transcription, persistent dictation toast behavior, and the packaged-app guidance restore path.
**Outcome:** all clear after fixing two review findings.
**Risk score:** high — this pass touches native subprocess/download behavior, vault file migration, MCP instruction discovery, app startup chrome state, and editor recording lifecycle.
**Change archetypes:** native integration, migration, updater configuration, editor block lifecycle, keyboard/dictation UX, MCP compatibility, docs/ADR.
**Intended change:** Keep Tolaria guidance hidden but restorable/MCP-readable, stop using upstream release feeds, prevent model downloads/transcription from freezing the UI, show recording transcript chunks during capture, keep dictation feedback visible while recording, and fix full-screen macOS sidebar offsets.
**Intent vs actual:** The implementation matches the requested direction. Managed guidance now canonicalizes under `.laputa/agents/`, root guidance becomes migration input only, MCP reads the hidden source, and restore writes the hidden source. Release metadata now targets the fork. Recording transcribes queued audio chunks every five seconds and appends the final chunk on stop/resume.
**Confidence:** high for automated gates; medium for packaged native UX until manual microphone/model-download testing is done in the built app.
**Coverage note:** Full frontend tests and frontend coverage passed. Rust tests and Rust coverage passed; Rust coverage required rerunning outside the sandbox because coverage-instrumented subprocess tests hit macOS `Operation not permitted` inside the sandbox.
**Finding triage:** Two medium findings were fixed during this turn: recording block mounted-state cleanup could become stale if a node view was reused for a different block, and Getting Started tests still expected root guidance after the hidden migration.
**Static/analyzer evidence:** ESLint, TypeScript, full Vitest, frontend coverage, Rust tests, Rust coverage, Rust formatting, locale validation, MCP Node tests, production web build, whitespace check, and demo-vault dirt check passed. CodeScene MCP/CLI and Codacy CLI were unavailable in this environment.
**Architecture impact:** ADR 0146 makes hidden managed vault guidance canonical and supersedes the previous root-managed guidance ADR. MCP and restore behavior now follow the same source path instead of treating root files as active managed files.
**Deep-review evidence:** Correctness/safety pass checked fullscreen chrome class synchronization, hidden guidance migration/restore/classification, starter-vault normalization, MCP guidance reads, updater endpoints, async native transcription commands, live recording chunk serialization, and dictation toast lifetime. Maintainability pass checked centralized paths/model metadata, docs/ADR alignment, and test coverage for the changed behavior.
**Bug classes / invariants checked:** no visible root managed guidance in folder/note scans, custom root guidance is migrated only when hidden guidance can be safely replaced, restore writes to `.laputa/agents/`, MCP context reads hidden guidance, app updater no longer calls upstream releases, model downloads and transcription run off the UI thread, recording cleanup does not update after unmount, dictation remains blocked while editor recording is active, and fullscreen macOS chrome removes traffic-light padding.
**Branch totality:** Re-read the Turn 3 changes and revisited Turn 2 recording/dictation paths because live chunking changes their lifecycle assumptions.
**Sibling closure:** Hidden guidance changes were checked across vault seeding, repair, Getting Started clone refresh, vault scanning, MCP server context, docs, and tests. Updater changes were checked across runtime constants, Tauri config, and both release workflows.
**Remediation impact surface:** Fixes were local: mounted-state reset in the recording block cleanup effect and hidden-path expectations in Getting Started tests.
**Residual risk / unknowns:** CodeScene and Codacy remain unavailable locally. Manual native QA is still needed after the Apple Silicon build for microphone permission, model download progress, live transcript chunking, and updater metadata in a packaged app.

### Validation

- `pnpm exec vitest run --reporter=dot` — passed, 444 files / 4,753 tests
- `pnpm test:coverage` — passed
- `pnpm exec tsc --noEmit` — passed
- `pnpm lint` — passed
- `pnpm build` — passed
- `cargo test --manifest-path src-tauri/Cargo.toml --quiet` — passed, 1,039 passed / 2 ignored plus integration/doc-test lanes
- `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 --quiet` — passed outside sandbox, lines 85.63%
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — passed after formatting
- `cargo test --manifest-path src-tauri/Cargo.toml getting_started --quiet` — passed after hidden-path test fix
- `node --test mcp-server/test.js mcp-server/tool-service.test.js` — passed, 38 tests
- `pnpm l10n:validate` — passed, 20 locale catalogs / 1,000 English keys
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- `pnpm l10n:translate` — attempted earlier but blocked by missing `LARA_ACCESS_KEY_ID` / `LARA_ACCESS_KEY_SECRET`; affected locale copy was updated manually and validated
- CodeScene file/project health — not run; MCP and `cs` CLI unavailable
- Codacy scan — not run; `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `config_seed.rs`, `getting_started.rs`, `vault/mod.rs`, `commands/git.rs`, MCP server guidance readers, updater runtime/config/workflows, `RecordingTranscriptBlock.tsx`, `transcriptionRuntime.ts`, `useDictationShortcut.ts`, `main.tsx`, platform helpers, and collapsed header render tests.
- **Prior open findings rechecked:** none open from Turns 1 or 2.
- **Prior resolved/adjacent areas revalidated:** recording/dictation mutual exclusion, no-model recording messaging, model catalog naming, right-panel toast/display state, MCP vault context, and hidden root folder behavior.
- **Hotspots or sibling paths revisited:** vault guidance migration ran through startup, repair, restore, Getting Started, MCP, folder scan, docs, and tests; live transcription ran through browser capture and native Tauri commands.
- **Dependency/adjacent surfaces revalidated:** macOS Info.plist/entitlements for microphone were already present, docs/ADR updated, locale catalogs validated, release workflows and Tauri updater config pointed at the fork.
- **Why this is enough:** The review traced each requested behavior across the user-visible path and its native/runtime persistence boundary, then validated with full frontend/Rust suites, coverage gates, MCP tests, and production build.

### Challenger pass

- `done` — Assumed the hidden guidance migration was incomplete somewhere outside the direct restore path and found Getting Started test expectations still pointing at root `AGENTS.md`. Fixed that and reran the focused and full Rust suites.
- `done` — Assumed live transcription could leave a stale update path during editor block reuse/unmount. Fixed the mounted-state reset and cleanup behavior.

### Resolved / Carried / New findings

#### B3-1 — Resolved — Medium — `src/components/RecordingTranscriptBlock.tsx`

The mounted guard was initialized once but cleanup could leave it `false` if a reused node view received a new block id. That would silently prevent later live transcript chunks from updating the block.

Resolution: reset `mountedRef.current = true` when the cleanup effect is established, and keep the existing cleanup path for timers, capture, and active-session state.

#### B3-2 — Resolved — Medium — `src-tauri/src/vault/getting_started.rs`

Getting Started clone tests still read `AGENTS.md` at the vault root after the app now migrates managed guidance into `.laputa/agents/AGENTS.md`.

Resolution: updated test helpers and assertions to seed/read the hidden managed guidance path and assert the root managed file is absent.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** run the Apple Silicon packaged app and manually test model download, microphone permission, live transcript chunk appearance before stop, Option+K dictation toast lifetime, and guidance restore warning.
3. **Patterns noticed:** keep hidden managed guidance source-of-truth logic in `config_seed.rs`; avoid reintroducing root `AGENTS.md` as an active managed source in MCP or setup code.
4. **Suggested approach:** if live transcript latency needs to feel closer to phrase-by-phrase dictation, lower the chunk interval or introduce a streaming local ASR worker as a separate architecture change.
5. **Architecture transition:** ADR 0146 supersedes ADR 0065 for hidden managed guidance.
6. **Defer on purpose:** CodeScene and Codacy evidence is deferred only because the local/MCP entrypoints are unavailable here.

## Turn 2 — 2026-06-27 01:15:56 BST

| Field | Value |
|-------|-------|
| **Commit** | cf300716593be9dc4f1631702500de9cbed42b28 plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Re-reviewed the cumulative branch after adding local Whisper transcription, recording transcript blocks, dictation, recording settings, model download/delete commands, microphone permissions, markdown persistence, and the remaining fixes from the UI browser/panel work.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** high — the branch now spans editor content persistence, native model downloads, microphone capture, settings migration, app-level keyboard capture, and broad UI layout state.
**Change archetypes:** native integration, editor block schema, markdown serialization, settings migration, keyboard shortcut, browser/editor navigation, UI layout.
**Intended change:** Keep the UI/browser redesign clean, then add a recording block and app dictation that use downloadable local Whisper models, avoid storing audio, write transcript text into notes or active text surfaces, and expose model management in settings.
**Intent vs actual:** The implementation matches the requested product shape for download/select/delete, recording start/stop/resume, read-only transcript blocks, app dictation, clipboard copy, and editor/active-target insertion. Recording currently transcribes on stop/resume boundaries rather than live streaming each partial phrase during capture.
**Confidence:** medium-high — frontend lint/type/build/coverage, Rust tests, Rust coverage, locale validation, focused recording/dictation tests, and whitespace checks passed. CodeScene and Codacy remain unavailable locally, so those mandatory external gates are recorded as missing evidence.
**Coverage note:** Full frontend coverage passed before the final small cleanup; focused tests were then added and passed for recording markdown persistence and dictation text commit. Rust test and coverage gates passed after installing/using the coverage toolchain.
**Finding triage:** No open findings remain. The review loop fixed the live render/test failures previously seen around group state, breadcrumb button footprint, panel/browser visibility, macOS collapsed header offset, and recording/dictation coverage.
**Static/analyzer evidence:** ESLint, TypeScript, `git diff --check`, locale validation, full frontend coverage, Rust tests, and Rust coverage passed. Fallow is not installed. CodeScene MCP/CLI and Codacy CLI were not available in this environment.
**Architecture impact:** Adds a new local transcription boundary: the browser records WAV audio in memory, Tauri loads local Whisper model artifacts from app config data, and notes persist transcript text only through a fenced durable markdown block. Settings owns model/default/dictation preferences.
**Deep-review evidence:** Correctness/safety pass checked model install state, no-model messaging, microphone capture cleanup, dictation-vs-recording mutual exclusion, markdown persistence, native command registration, settings migration, and two-column browser/editor state. Maintainability/structure pass checked that recording model metadata stays centralized, editor block insertion is isolated, and settings UI uses existing controls.
**Bug classes / invariants checked:** no audio is written to vault/disk by recording capture, selected model must be installed before recording/dictation starts, transcript blocks serialize without losing backticks or metadata, dictation always copies and inserts when a text target exists, settings tolerate missing/legacy transcription values, entity/folder selections stay in the browser surface, and toolbar/button sizing/footprint remains consistent.
**Branch totality:** Re-read the new native transcription files, frontend recording/dictation utilities, recording block, settings section, editor schema/markdown codecs, app dictation wiring, current UI browser fixes, and prior review hotspots.
**Sibling closure:** Recording toolbar insertion and slash-command insertion both flow through `recordingTranscriptInsertion.ts`; browser dictation and editor recording share the same model catalog/runtime; mock and native Tauri command names were checked together.
**Remediation impact surface:** Fixes were local to the affected surfaces: silent audio graph for capture, defensive group dropdown defaults, restored breadcrumb action footprint CSS, entity selection routed to browser mode, settings normalizers, shadcn button cleanup, and targeted tests.
**Residual risk / unknowns:** CodeScene/Codacy are not callable here. The model download uses the static Whisper catalog and HTTPS but does not verify hashes. Live microphone/manual native UX was not exercised end-to-end because this review used automated checks; the subsequent Apple Silicon build will further validate native compilation.

### Validation

- `pnpm exec vitest run src/App.test.tsx src/components/BreadcrumbBar.visibility.test.tsx src/components/PulseView.test.tsx --reporter=dot` — passed
- `pnpm exec vitest run src/utils/editorDurableMarkdown.test.ts src/utils/dictationText.test.ts --reporter=dot` — passed
- `pnpm test:coverage` — passed, 4,744 tests; lines 86.87%
- `npx tsc --noEmit` — passed
- `pnpm lint` — passed
- `pnpm l10n:validate` — passed
- `pnpm build` — passed
- `cargo test --manifest-path src-tauri/Cargo.toml` — passed, 1,039 library tests plus integration/doc-test lanes
- `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85` — passed, lines 85.68%
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; MCP and `cs` CLI unavailable
- Codacy scan — not run; `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `RecordingTranscriptBlock.tsx`, `TranscriptionSettingsSection.tsx`, `useDictationShortcut.ts`, `transcriptionRuntime.ts`, `recordingTranscriptMarkdown.ts`, `editorDurableMarkdown.ts`, `editorSchema.tsx`, `settings.rs`, `transcription_models.rs`, `transcription_runtime.rs`, `commands/transcription.rs`, `App.tsx`, `BreadcrumbBar.tsx`, `GroupByDropdown.tsx`, `PulseView.tsx`, and mock Tauri handlers.
- **Prior open findings rechecked:** none open from Turn 1.
- **Prior resolved/adjacent areas revalidated:** list/row/card browser, right-panel tabs, breadcrumb toolbar footprint, collapsed sidebar header, and main browser/editor split were rechecked by tests and direct review.
- **Hotspots or sibling paths revisited:** recording insertion via toolbar/slash command, dictation commit paths, model install status in settings and block UI, and native/mock Tauri command parity.
- **Dependency/adjacent surfaces revalidated:** settings persistence, locale catalogs, ADR/docs, macOS Info.plist/entitlements, Cargo lock/dependency addition, and demo-vault hygiene.
- **Why this is enough:** The review attacks the highest-risk state and persistence variants introduced by the branch and pairs them with automated verification across frontend, Rust, localization, and build paths.

### Challenger pass

- `done` — Assumed one serious issue remained in persistence or capture. Found missing focused recording/dictation tests and a raw collapse button in the recording block; both were fixed and validated. Rechecked the previous UI regressions that had caused render errors.

### Resolved / Carried / New findings

#### B2-1 — Resolved — Medium — `src/utils/transcriptionRuntime.ts`

The microphone graph connected the script processor directly to the destination. That can keep processing alive, but it can also create audible monitoring depending on platform behavior.

Resolution: routed the processor through a muted gain node before the destination so capture remains active without playing microphone audio.

#### B2-2 — Resolved — Medium — `src/components/note-list/GroupByDropdown.tsx`

Collapsed header tests and some render paths could omit the group value, causing undefined group state to reach the dropdown.

Resolution: defaulted missing group state to `none` defensively.

#### B2-3 — Resolved — Medium — `src/components/Editor.css`

The breadcrumb toolbar lost its zero-footprint button CSS, which could reintroduce spacing/alignment drift in the editor action row.

Resolution: restored the breadcrumb action button footprint rule.

#### B2-4 — Resolved — Medium — `src/App.tsx`

Entity/neighborhood selections could fall back into an editor-plus-list surface and recreate the three-column behavior the UI redesign was meant to remove.

Resolution: entity selections now remain browser-surface selections, and neighborhood entry no longer opens the editor.

#### B2-5 — Resolved — Medium — `src-tauri/src/settings.rs`

Legacy or missing transcription settings were normalized into concrete defaults too early, making tests and migration behavior harder to reason about.

Resolution: native normalizers now return `None` for missing/invalid values and let the UI layer apply defaults.

#### B2-6 — Resolved — Medium — `src/utils/editorDurableMarkdown.test.ts`, `src/utils/dictationText.test.ts`

The new recording/dictation paths did not have targeted frontend tests proving transcript persistence or dictation copy/insert behavior.

Resolution: added focused tests for fenced recording transcript markdown round-trip and dictation text commit.

#### B2-7 — Resolved — Low — `src/components/RecordingTranscriptBlock.tsx`

The recording block collapse control used a raw button instead of the app's shadcn button primitive.

Resolution: changed the collapse control to `Button` while keeping the existing visual class.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** after the Apple Silicon build, manually test model download, microphone permission prompt, recording start/stop/resume, and Option+K dictation in the packaged app.
3. **Patterns noticed:** keep transcription model metadata centralized; do not duplicate model names or language labels in settings/block UI.
4. **Suggested approach:** if live partial transcription becomes a hard requirement, add chunked/streaming transcription as a separate architecture change rather than bolting it onto the current stop-boundary flow.
5. **Architecture transition:** local-only Whisper runtime and transcript-only persistence are documented in ADR 0145.
6. **Defer on purpose:** CodeScene and Codacy evidence is deferred only because the local/MCP entrypoints are unavailable here.

## Turn 1 — 2026-06-26 22:29:20 BST

| Field | Value |
|-------|-------|
| **Commit** | 8359765a |
| **IDE / Agent** | Codex |

**Summary:** Reviewed the UI restructuring that hides the root/system guidance files, moves folder/document browsing into a two-column browser/editor surface, adds list/row/card display modes with grouping, merges Properties and AI into one right panel, and standardizes toolbar icon sizing.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** medium — broad UI state and rendering changes, reduced by focused tests, type checking, linting, locale validation, and browser smoke.
**Change archetypes:** UI layout, navigation state, rendering performance, localization, vault scanning.
**Intended change:** Make the sidebar folder-only, hide root guidance files, move document lists into a browser surface, open the editor only after selecting a document, add grouped row/card/list modes, and unify right-panel tab controls.
**Intent vs actual:** The implementation matches the requested surface model. The review found one performance regression in the new browser views and fixed it before this turn was closed.
**Confidence:** medium — TypeScript/React surfaces are covered; Rust and CodeScene/Codacy checks were unavailable in this local environment.
**Coverage note:** Focused tests cover note-list rendering, folder tree behavior, app navigation, right panel behavior, AI workspace changes, platform helpers, and app startup.
**Finding triage:** One medium performance finding was resolved. No open findings remain.
**Static/analyzer evidence:** ESLint, TypeScript, locale validation, and whitespace checks passed. CodeScene MCP/CLI and Codacy CLI were not available locally.
**Architecture impact:** Main browser/editor state moved into `App.tsx` and note-list rendering remains inside the existing note-list component boundary. Shared toolbar icon sizing was centralized in `toolbarIconButton.ts`.
**Deep-review evidence:** Correctness/safety pass checked navigation history, hidden file scanning, folder-only sidebar behavior, right-panel tab switching, and main browser/editor visibility. Maintainability/performance pass checked virtualization, shared icon sizing constants, localization, and package workspace config.
**Bug classes / invariants checked:** no undefined render variables, no three-column editor/list regression for browser selections, no eager full-vault rendering in row/card modes, root guidance files hidden only at vault root, type pill colors preserved, sidebar and editor toolbar icon sizing shared.
**Branch totality:** All changed source paths were listed and high-risk files were re-read directly. Tests covered the changed React surfaces and helper logic.
**Sibling closure:** Row, card, grouped, and folder browser render paths were checked together after fixing eager rendering. Properties and AI panel headers were checked against the same icon constants.
**Remediation impact surface:** The resolved performance patch only changes note-list browser view rendering; existing list mode remains on `Virtuoso`.
**Residual risk / unknowns:** Browser-only smoke shows expected local mock API 400 responses from `/api/vault/list` and `/api/vault/content`, but no React/page errors and the main UI renders. Rust tests could not run because `cargo` is not installed in this environment. CodeScene and Codacy tools were not callable.

### Validation

- `./node_modules/.bin/eslint . --max-warnings=0` — passed
- `./node_modules/.bin/tsc --noEmit` — passed
- `./node_modules/.bin/vitest run src/components/NoteList.rendering.test.tsx src/utils/noteListHelpers.test.ts src/components/AiWorkspace.test.tsx src/components/EditorRightPanel.test.tsx src/components/FolderTree.test.tsx src/components/sidebar/SidebarTitleBar.test.tsx src/hooks/useAppNavigation.test.ts src/utils/platform.test.ts src/main.test.ts` — passed
- `node scripts/validate-locales.mjs` — passed
- `git diff --check -- . ':!.reviews/'` — passed
- Browser smoke against `http://127.0.0.1:5201/` — passed after dismissing AI setup; main UI rendered, no page errors
- `cargo test --manifest-path src-tauri/Cargo.toml vault::mod_tests` — not run; `cargo` unavailable
- CodeScene file/project health — not run; MCP and `cs` CLI unavailable
- Codacy scan — not run; `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `App.tsx`, `useAppNavigation.ts`, `NoteListViews.tsx`, `useNoteListModel.tsx`, `EditorRightPanel.tsx`, `AiWorkspaceSideHeader.tsx`, `InspectorChrome.tsx`, `FolderTree.tsx`, `vault/mod.rs`, `vault/cache.rs`, and `noteListHelpers.ts`.
- **Prior open findings rechecked:** no prior review findings existed in `.reviews/`.
- **Prior resolved/adjacent areas revalidated:** initial render errors around `displayMode`, `rightPanel`, and callback initialization were rechecked by lint/type tests and direct file review.
- **Hotspots or sibling paths revisited:** all display modes and group/folder browser render paths were revisited after virtualization.
- **Dependency/adjacent surfaces revalidated:** locale catalogs, workspace dependency config, demo-vault dirt, and dev server availability were checked.
- **Why this is enough:** The review covered the highest-risk state transitions and render paths introduced by the diff, plus focused test coverage for the changed components.

### Challenger pass

- `done` — Challenged the row/card browser view for large-vault performance and found eager rendering. Replaced it with virtualized rows/cards/groups and reran the focused checks.

### Resolved / Carried / New findings

#### B1-1 — Resolved — Medium — `src/components/note-list/NoteListViews.tsx`

The new rows/cards/browser display paths rendered every folder, group, and document eagerly, while the existing list mode used virtualization. On large vaults this made the display switcher slow and risked locking the UI.

Root cause: the new views were implemented as direct maps during the UI restructuring and did not inherit the existing `Virtuoso` list behavior.

Resolution: changed grouped/list browser paths to `Virtuoso` and card mode to `VirtuosoGrid`, with stable item keys for folders, groups, and entries. Group headings span the grid row through a targeted grid item selector in `App.css`.

Prevention artifact: focused note-list tests were rerun, and the performance-sensitive code path now uses the same virtualization dependency as the original list.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** add a dedicated Playwright smoke for switching list/rows/cards on a large mock vault if this surface keeps changing.
3. **Patterns noticed:** shared toolbar icon sizing should stay centralized in `toolbarIconButton.ts`; avoid local size constants in side-panel headers.
4. **Suggested approach:** start the recording/transcription editor block from this clean baseline, with a narrow first pass covering block UI, slash command insertion, and no-audio-persistence behavior.
5. **Architecture transition:** none needed for this diff.
6. **Defer on purpose:** full Rust and CodeScene/Codacy verification are deferred to an environment where those tools are installed/callable.
