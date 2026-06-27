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

## Hotspots

- note-list display modes rendering large vaults — added Turn 1
- two-column browser/editor navigation state — added Turn 1
- shared toolbar and side-panel icon sizing — added Turn 1
- hidden root guidance files and folder-tree root behavior — added Turn 1
- local transcription model download/delete lifecycle — added Turn 2
- recording block markdown persistence and editor insertion — added Turn 2
- dictation clipboard/active-target insertion while recording sessions are mutually exclusive — added Turn 2
- Tauri microphone permission and Whisper runtime packaging — added Turn 2

## Review status

| Field | Value |
|-------|-------|
| **Review started** | 2026-06-26 22:29:20 BST |
| **Last reviewed** | 2026-06-27 01:15:56 BST |
| **Total turns** | 2 |
| **Open findings** | 0 |
| **Resolved findings** | 8 |
| **Accepted findings** | 0 |

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
