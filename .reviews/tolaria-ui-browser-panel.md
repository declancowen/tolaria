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
- `src/hooks/useAppNavigation.ts`, `src/hooks/useAppNavigation.test.ts`, and `src/hooks/useGitFileWorkflows.ts` — added Turn 10
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
- `src/hooks/useNoteActions.ts`, `src/hooks/useNoteCreation.ts`, create-note focus tests, and smoke expectations for editor-surface note creation — added Turn 6
- `tests/smoke/missing-string-metadata-open-note.spec.ts` and `tests/smoke/save-before-note-switch.spec.ts` — added Turn 7
- `src/components/NoteItem.tsx`, `src/components/sidebar/SidebarSections.tsx`, and sidebar/note-list rendering tests — added Turn 11

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
- created-note browser-to-editor handoff and title-focus ownership — added Turn 6
- smoke-test note switching under the two-column browser/editor contract — added Turn 7
- browser-surface Back behavior when list/grid opens replace the active editor tab — added Turn 10
- browser folder/document grouping, list-preview parity, row/card spacing/property pills, sort/group trigger icon sizing, and empty sidebar-section height — added Turn 11

## Review status

| Field | Value |
|-------|-------|
| **Review started** | 2026-06-26 22:29:20 BST |
| **Last reviewed** | 2026-06-29 15:36:19 BST |
| **Total turns** | 11 |
| **Open findings** | 0 |
| **Resolved findings** | 13 |
| **Accepted findings** | 0 |

## Turn 11 — 2026-06-29 14:57:58 BST

| Field | Value |
|-------|-------|
| **Commit** | 8f0a2de5 plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Deep-reviewed the browser/list presentation patch that separates folder and document sections, keeps list-mode documents on the normal Inbox-style preview renderer, tightens row spacing, aligns card section headings with the card grid, renders row/card tags as type-colored pills, honors selected display properties in row/card entries, normalizes sort/group trigger icon sizing, removes folder row dividers, neutralizes the obsolete active note tint, and avoids empty expanded-sidebar padding.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** medium — the change touches shared note-list rendering paths, NoteItem row styling, sidebar section bodies, localization, and focused regression tests.
**Change archetypes:** broad UI presentation, virtualized note-list modes, sidebar empty-state spacing, selection-state visual behavior, localization.
**Intended change:** Folder browsing should show folders first and documents after them without misleading folder metadata rows; list mode should keep document previews consistent with Inbox/All Notes; rows mode should keep compact aligned rows with tighter right-side spacing; card headings/dividers should align with the card grid; row/card display properties should follow the picker; sort and group trigger icons should share the same rendered toolbar size; empty expanded sidebar sections should not grow from padding-only bodies.
**Intent vs actual:** `BrowserView` now builds explicit folder/document section headings only when there is content, skips empty document groups, spans section headings in card grids, renders list-mode documents through the existing `renderItem` path, keeps row-mode documents compact with icons, uses a tighter row grid, renders tags as type-colored pills, preserves resolved property-chip styling for selected properties, applies `displayPropsOverride` in row/card entries, and keeps folder cards/rows free of empty metadata. `SortDropdown` and `GroupByDropdown` both force trigger SVGs through the shared toolbar icon size class. `NoteItem` keeps selected rows neutral while retaining an inset divider. Sidebar views/types/folders avoid padded empty bodies.
**Confidence:** high for the React render paths covered by focused tests; medium for pixel-perfect native visual parity until a fresh manual screenshot pass is done on the rebuilt app.
**Coverage note:** Added focused rendering assertions for card folder/document separation, card heading/divider width, list-mode document preview parity, row-mode folder/document height and icon alignment, tighter row columns, type-colored tag pills, selected display properties with resolved chip styling in row/card entries, normalized sort/group trigger icons, omitted empty document groups, neutral selected note styling, and empty sidebar section bodies.
**Finding triage:** No new findings. The most likely bug classes were list/row mode confusion, missing or over-inset section dividers, ignored property-picker state in custom row/card renderers, unintended folder dividers, stale selected-row tint, and padding-only sidebar expansion; each has direct code ownership and focused test coverage.
**Static/analyzer evidence:** ESLint, TypeScript, focused Vitest, localization validation, whitespace check, demo-vault dirt check, and Apple Silicon Tauri build passed. CodeScene MCP/CLI and Codacy CLI/MCP were unavailable in this environment.
**Architecture impact:** None. The change stays inside existing browser view, note item, and sidebar rendering boundaries. No vault data model, persistence, routing, native command, or storage contract changed.
**Deep-review evidence:** Correctness/safety pass checked list/cards/rows mode separation, section visibility for empty and populated folder/document variants, existing Inbox-style list preview reuse, row/card display-property override behavior, selection-state behavior, and localization presence. Maintainability/structure pass checked that browser section construction stays centralized in `buildBrowserViewItems`, document list previews reuse the existing `renderItem` boundary, row/card pill rendering stays inside `BrowserEntryItem`, and sidebar empty-section behavior remains local to section bodies.
**Bug classes / invariants checked:** list mode document rows remain `NoteItem` previews; row mode document rows remain compact rows; card headings span the virtualized grid and align with the card grid; section headings render only for content; row/card custom entries honor selected display properties; tag pills share the type pill color; folder rows have no document-style metadata or row dividers; note row dividers are inset; selected rows no longer imply a right-column active editor; empty expanded sidebar sections do not add body padding.
**Branch totality:** Rechecked against Turn 8 card-grid layout assumptions and Turn 10 browser-surface navigation assumptions. This patch changes presentation only and does not alter the note-open/navigation handoff fixed in the prior turns.
**Sibling closure:** Browser cards, list, and rows were checked separately; folder and document entries were checked separately; default and custom display-property row/card paths were checked; sidebar views, types, and folders empty bodies were checked together; all locale catalogs received the new document-section label.
**Remediation impact surface:** `NoteListViews`, `NoteListLayout`, `useNoteListModel`, `NoteItem`, `FolderTree`, `SidebarSections`, focused tests, and locale catalogs. No persistence, native command, or vault fixtures changed.
**Residual risk / unknowns:** Native screenshot/manual visual QA was not rerun after the final build; residual risk is limited to pixel spacing in WKWebView because focused rendering tests and the Apple Silicon build passed.

### Validation

- `pnpm exec vitest run src/components/NoteList.sorting.test.tsx src/components/NoteList.rendering.test.tsx src/components/NoteItem.test.tsx src/components/Sidebar.typeActions.test.tsx` — passed, 126 tests
- `pnpm lint` — passed
- `npx tsc --noEmit` — passed
- `pnpm build` — passed
- `pnpm l10n:validate` — passed
- `git diff --check` — passed
- `pnpm tauri build --target aarch64-apple-darwin --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}'` — passed
- `file src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Tolaria.app/Contents/MacOS/tolaria` — confirmed `Mach-O 64-bit executable arm64`
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; no CodeScene MCP tool exposed and `cs` CLI unavailable
- Codacy scan — not run; no Codacy MCP tool exposed and `.codacy/cli.sh`/`codacy` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `NoteListViews`, `NoteListLayout`, `useNoteListModel`, `NoteItem`, `FolderTree`, `SidebarSections`, focused rendering tests, locale diff, and prior browser-panel review ledger.
- **Prior open findings rechecked:** none open from Turns 1-10.
- **Prior resolved/adjacent areas revalidated:** Turn 8 virtualized card-grid heading span remains covered; Turn 10 browser/editor navigation is untouched because document open handlers and history state are unchanged.
- **Hotspots or sibling paths revisited:** browser cards/list/rows, grouped and ungrouped document sections, default and selected display-property pill bands, folder-only and folder-plus-document states, selected note row styling, and empty expanded sidebar views/types/folders.
- **Dependency/adjacent surfaces revalidated:** ESLint, TypeScript, focused Vitest, localization validation, whitespace, demo-vault hygiene, and arm64 Tauri packaging.
- **Why this is enough:** The changed behavior is presentational and scoped to rendering branches that now have direct regression coverage; the existing navigation and persistence boundaries were not modified.

### Challenger pass

- `not needed` — Medium-risk UI presentation patch. The weakest assumption is native WKWebView visual spacing, recorded as a low-risk unknown after a successful Apple Silicon build.

### Resolved / Carried / New findings

No open findings.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** commit and push the reviewed UI presentation patch.
3. **Patterns noticed:** keep list-mode documents on the normal `NoteItem` preview path; use the compact browser-entry renderer only for rows/cards where the mode intentionally differs.
4. **Suggested approach:** if further spacing tweaks are needed, add focused assertions for the exact section/row variant before rebuilding.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

## Turn 10 — 2026-06-27 14:52:12 BST

| Field | Value |
|-------|-------|
| **Commit** | 3edc38e1 plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Re-reviewed and fixed the user-caught Back navigation escape where opening another document from the browser/grid surface could still return to the previously hidden document instead of the document list.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** medium — the runtime change touches shared browser/editor history state and fixes an issue that escaped the prior local review.
**Change archetypes:** escaped user finding, browser/editor navigation, async replace-tab transition, history stack.
**Intended change:** Back from a document opened by any main browser/list/grid surface must return to the source browser surface, even if an older editor document remains behind that surface in history.
**Intent vs actual:** `App.tsx` now records the source browser surface for browser-origin document opens, marks replace-tab opens as pending until the new document open settles, and clears source metadata for created/favorite/non-browser opens. `useAppNavigation` stores that source on note history entries and prefers it over stale older document entries when going Back.
**External finding import:**

| Source | Finding | Current status | Bug class | Missed invariant/variant | Action |
|--------|---------|----------------|-----------|--------------------------|--------|
| User live QA | Back sometimes returned to the previous document instead of the document list after opening a second document from grid/list | fixed | Variant State, Lifecycle And Transient Containers, Semantic Regression | replace-tab path briefly retained the old active document while browser surface was the intended source | fixed with source-surface history metadata plus pending replace target |

**Escape learning:** The failed mechanism was acquisition of history state from a stale retained editor tab during a browser-to-editor transition. The prior proof tested pending note selection but did not attack the replace-active-tab acquisition mode used by list/grid clicks.
**Confidence:** high for the shared Back handler and list/grid replace path; medium for native gesture feel until the rebuilt desktop app is exercised.
**Coverage note:** Added/updated focused hook regressions for both the normal pending source-surface path and a stale active-document replace transition. The note-list rendering regression was rerun to protect the grid work.
**Finding triage:** No open findings after the patch. The live user finding is fixed in current tree.
**Static/analyzer evidence:** TypeScript, ESLint, focused Vitest, whitespace, and demo-vault dirt checks passed. CodeScene MCP/CLI and Codacy CLI remained unavailable in this environment.
**Architecture impact:** Low. Navigation ownership remains in `useAppNavigation`; `App.tsx` only supplies transition/source metadata. No vault, persistence, native, markdown, or route contract changed.
**Deep-review evidence:** Correctness/safety pass checked list/grid click, replace-tab async transition, Back/Forward stack truncation, and browser-source preference. Maintainability pass checked that history rules stay centralized in `useAppNavigation` and the git diff wrapper only returns the replace operation it already started.
**Bug classes / invariants checked:** browser-surface source is preserved across document opens; pending replacement prevents stale active document acquisition; stale retained documents behind a browser surface are skipped on Back; created/favorite/editor-origin opens do not inherit browser-source behavior.
**Branch totality:** Rechecked against Turns 7-9 browser/editor and grid-surface assumptions. The Turn 9 all-clear was insufficient because it did not include the list/grid replace-active-tab acquisition path.
**Sibling closure:** Mouse click, keyboard open in the list, and neighborhood open all route through `onReplaceActiveTab` from the note-list interaction layer. Toolbar, sidebar, gesture, and keyboard Back all share `useAppNavigation`.
**Remediation impact surface:** `App.tsx`, `useAppNavigation`, `useGitFileWorkflows`, and navigation hook tests. No localization or user-facing copy changed.
**Residual risk / unknowns:** Full native manual QA remains after the Apple Silicon build, especially trackpad/mouse Back/Forward feel.

### Validation

- `pnpm exec vitest run src/hooks/useAppNavigation.test.ts --reporter=dot` — passed, 9 tests
- `pnpm exec vitest run src/components/NoteList.rendering.test.tsx --reporter=dot` — passed, 60 tests
- `pnpm exec tsc --noEmit` — passed
- `pnpm lint` — passed
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; no CodeScene MCP tool exposed and `cs` CLI unavailable
- Codacy scan — not run; no Codacy MCP tool exposed and `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `useAppNavigation`, `useNavigationHistory`, `App.tsx`, note-list interactions, `useGitFileWorkflows`, keyboard navigation, and prior review turns.
- **Prior open findings rechecked:** none open from Turns 1-9.
- **Prior resolved/adjacent areas revalidated:** Turn 8 grid/list surface remains covered; Turn 9 navigation fix is strengthened rather than replaced.
- **Hotspots or sibling paths revisited:** note-list mouse open, keyboard open, replacement flow, source-surface encoding, Back/Forward handlers, and native gesture entrypoint through the shared hook.
- **Dependency/adjacent surfaces revalidated:** TypeScript, ESLint, focused Vitest, whitespace, and demo-vault hygiene.
- **Why this is enough:** The missed class was stale state acquisition during replace-tab transition, and the current tests now cover both the intended pending route and the stale retained-document variant.

### Challenger pass

- **Weakest assumption attacked:** a stale active document can still be recorded between returning to the browser and completing a second replace. The new second regression explicitly pushes that stale state and verifies Back still returns to the source browser surface.

### Resolved / Carried / New findings

No open findings.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** commit the navigation correction and create a fresh Apple Silicon desktop build.
3. **Patterns noticed:** browser/editor history must carry source-surface intent, not infer intent only from the currently active editor tab.
4. **Suggested approach:** keep future history changes tested with stale retained-state variants, especially when a browser surface hides but does not close the editor tab.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

## Turn 9 — 2026-06-27 14:34:17 BST

| Field | Value |
|-------|-------|
| **Commit** | d60dd2fc plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Reviewed the focused navigation-history patch that prevents Back from landing on the previous hidden editor document after opening a new document from the browser/grid surface.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** low — the patch adds a pending note key to an existing navigation hook and a direct regression for the reported sequence.
**Change archetypes:** browser/editor navigation, async note-open race, history-stack regression.
**Intended change:** When the browser surface opens a document while a previous editor tab is still active behind it, record the newly requested document in app history rather than the stale active tab.
**Intent vs actual:** `App.tsx` now tracks the pending main-surface note path during note open, clears it when the open request settles or when returning to a browser surface, and `useAppNavigation` prefers that pending path only while the editor surface is active.
**Confidence:** high for the stale-tab history bug class; medium for every native gesture path until the rebuilt desktop app is manually exercised.
**Coverage note:** Added a regression that reproduces grid/browser surface → document A → Back → document B while A is still the hidden active tab → Back, and asserts Back returns to the browser surface instead of A.
**Finding triage:** No new findings. The live issue was the pending editor transition using stale `activeTabPath` as the history key before the requested document finished loading.
**Static/analyzer evidence:** TypeScript, ESLint, focused navigation Vitest, whitespace, and demo-vault dirt checks passed. CodeScene MCP/CLI and Codacy CLI remained unavailable in this environment.
**Architecture impact:** None. This keeps browser/editor history ownership in `useAppNavigation` and feeds it one extra transition-state value from `App.tsx`.
**Deep-review evidence:** Targeted correctness/safety pass checked browser-to-editor transition ordering, Back/Forward stack truncation after Back, and hidden active-tab state. Maintainability/structure pass checked the fix stays as a small optional hook parameter rather than duplicating history logic in `App.tsx`.
**Bug classes / invariants checked:** pending requested note wins over stale active note while entering editor mode; browser surfaces remain first-class history entries; Back after opening a new document from a returned browser surface goes to that browser surface; Forward still uses the existing stack behavior.
**Branch totality:** Rechecked against Turn 7 two-column browser/editor contract and Turn 8 card-grid browser surface behavior.
**Sibling closure:** Keyboard/mouse/toolbar Back share `useAppNavigation`, so the hook-level fix covers those entrypoints. Native gesture binding also calls the same handlers.
**Remediation impact surface:** `App.tsx`, `useAppNavigation`, and its test only. No persistence, routing URL, note save, native, or vault data behavior changed.
**Residual risk / unknowns:** Full native manual QA still needed after the desktop rebuild to confirm trackpad/mouse history gestures feel correct.

### Validation

- `pnpm exec vitest run src/hooks/useAppNavigation.test.ts --reporter=dot` — passed, 8 tests
- `pnpm exec vitest run src/components/NoteList.rendering.test.tsx --reporter=dot` — passed, 60 tests
- `pnpm exec tsc --noEmit` — passed
- `pnpm lint` — passed
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; no CodeScene MCP tool exposed and `cs` CLI unavailable
- Codacy scan — not run; no Codacy MCP tool exposed and `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `src/hooks/useAppNavigation.ts`, `src/hooks/useNavigationHistory.ts`, `src/App.tsx`, and the navigation hook test.
- **Prior open findings rechecked:** none open from Turns 1-8.
- **Prior resolved/adjacent areas revalidated:** two-column browser/editor separation, Back returning to browser surfaces, and card-grid browser surface availability.
- **Hotspots or sibling paths revisited:** app Back/Forward handlers, sidebar toolbar controls, command/gesture entrypoints via shared hook return values.
- **Dependency/adjacent surfaces revalidated:** TypeScript, ESLint, focused Vitest, whitespace, and demo-vault hygiene.
- **Why this is enough:** The bug was a hook-level transition-state race, and the new test exercises the exact stale-active-tab sequence that caused Back to choose the previous document.

### Challenger pass

- `not needed` — Low-risk localized navigation patch. The weakest remaining assumption is native event entrypoints, which use the same `handleGoBack`/`handleGoForward` handlers and will be checked in the rebuilt app.

### Resolved / Carried / New findings

No open findings.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** commit the navigation fix and create a fresh Apple Silicon desktop build.
3. **Patterns noticed:** browser/editor history needs a pending target during async note opens because the hidden editor tab remains live behind the browser surface.
4. **Suggested approach:** keep future navigation changes tested at `useAppNavigation` so keyboard, toolbar, mouse, and gesture paths stay unified.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

## Turn 8 — 2026-06-27 14:26:45 BST

| Field | Value |
|-------|-------|
| **Commit** | 40ccc79f plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Reviewed the focused card-grid correction after visual iteration on card overflow, fixed card spacing, two-row pill behavior, and grid top inset.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** low — the runtime change is localized to the note-list card display mode and has a focused rendering regression test.
**Change archetypes:** UI layout, virtualized grid, card overflow/clamping, regression coverage.
**Intended change:** Restore card-mode visual behavior so cards keep bounded widths, text clamps predictably, pills occupy a controlled two-row band, and the top grid inset matches the side/gap spacing.
**Intent vs actual:** The diff leaves list and rows paths untouched, constrains card content inside its grid cell, adds a reliable `pt-2` grid surface wrapper, and asserts those card/grid invariants in the existing rendering test.
**Confidence:** high for the localized React layout and regression coverage; medium for pixel-perfect native parity until the fresh desktop build is manually opened.
**Coverage note:** Focused rendering test now covers the card grid surface inset, grouped heading span, card overflow constraints, and two-row pill band. User visually confirmed the browser surface after the iteration.
**Finding triage:** No new findings. The main reviewed bug classes were virtualized grid padding loss, card content overflow, card height drift, and extra visual pill rows.
**Static/analyzer evidence:** TypeScript, ESLint, focused Vitest, whitespace, and demo-vault dirt checks passed. CodeScene MCP/CLI and Codacy CLI remained unavailable in this environment.
**Architecture impact:** None. The change stays inside the existing note-list display-mode boundary and does not alter data, routing, persistence, or native commands.
**Deep-review evidence:** Targeted correctness/safety pass checked card/list/rows separation, virtualized grid wrapper behavior, and item overflow. Maintainability/structure pass checked that layout-specific assertions remain in the focused rendering test and no shared button primitive was changed.
**Bug classes / invariants checked:** card mode content cannot widen a virtualized grid cell; group headings still span the full grid row; card top inset matches grid side/gap padding; title/preview/pill rows clamp instead of creating variable-width rows; list and rows display modes keep their existing render paths.
**Branch totality:** Rechecked the patch against Turn 4 virtualized card-grid heading handling and Turn 7 browser/editor surface assumptions.
**Sibling closure:** Card folder items and card entry items were both constrained; rows/list paths were intentionally left untouched.
**Remediation impact surface:** Local to `NoteListViews` card mode and its rendering test. No localization, native, model, updater, vault, or persistence code changed.
**Residual risk / unknowns:** Automated browser screenshot could not reuse the user's loaded vault state, so native/browser visual proof relies on the live local tab inspection and the upcoming desktop build.

### Validation

- `pnpm exec vitest run src/components/NoteList.rendering.test.tsx --reporter=dot` — passed, 60 tests
- `pnpm exec tsc --noEmit` — passed
- `pnpm lint` — passed
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; no CodeScene MCP tool exposed and `cs` CLI unavailable
- Codacy scan — not run; no Codacy MCP tool exposed and `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `src/components/note-list/NoteListViews.tsx`, changed rendering-test block, prior review ledger for note-list/card-grid hotspots.
- **Prior open findings rechecked:** none open from Turns 1-7.
- **Prior resolved/adjacent areas revalidated:** Turn 4 group-heading full-row behavior remains asserted; Turn 7 browser/editor separation unaffected because only browser card rendering changed.
- **Hotspots or sibling paths revisited:** entry cards, folder cards, grouped card headings, card grid top inset, and list/rows render branches.
- **Dependency/adjacent surfaces revalidated:** TypeScript, ESLint, focused Vitest, whitespace, and demo-vault hygiene.
- **Why this is enough:** The patch is a focused card-mode layout correction, and the risky invariants are now covered by the closest component test plus live visual feedback.

### Challenger pass

- `not needed` — Low-risk localized UI patch. The weakest assumption is native WKWebView matching Chromium grid behavior; the fresh Apple Silicon desktop build will be created next for manual inspection.

### Resolved / Carried / New findings

No open findings.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** create and inspect a fresh Apple Silicon desktop build.
3. **Patterns noticed:** virtualized grid spacing is more reliable when the top inset lives on a wrapping surface and horizontal/bottom spacing stays on the list grid.
4. **Suggested approach:** keep future card-grid spacing changes covered by the same rendering test before rebuilding native.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

## Turn 7 — 2026-06-27 13:36:18 BST

| Field | Value |
|-------|-------|
| **Commit** | 04bd6873 plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Re-reviewed the branch after the pre-push Playwright smoke gate exposed remaining old three-column assumptions in note-switching smoke tests.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** low — the patch is test-only and exercises the actual two-column user path instead of changing runtime behavior.
**Change archetypes:** smoke-test contract update, browser/editor navigation, note-switch persistence validation.
**Intended change:** Keep the new two-column behavior while making smoke tests switch notes by returning to the document browser before selecting another note.
**Intent vs actual:** The tests now reveal the note list through the app's Back control before clicking the next document, so they no longer require the list and editor to be visible at the same time.
**Confidence:** high for the push-blocking specs; medium for the full branch until the full pre-push gate completes.
**Coverage note:** The exact failing smoke specs now pass locally.
**Finding triage:** One low/medium push-gate finding was live and resolved. No product regression was found in this turn.
**Static/analyzer evidence:** TypeScript, ESLint, focused Playwright smoke, whitespace check, and demo-vault dirt check passed. CodeScene MCP/CLI and Codacy CLI remained unavailable in this environment.
**Architecture impact:** None. This preserves the browser/editor surface model and updates tests to follow it.
**Deep-review evidence:** Correctness/safety pass checked missing-metadata note open and save-before-switch flows. Maintainability/structure pass kept the navigation helper local to the affected specs because this is a smoke-contract correction rather than a reusable product helper.
**Bug classes / invariants checked:** note list is hidden while editor is open, Back can return to browser surfaces, save-before-switch still persists raw/rich edits, slow-save de-duplication still opens the latest requested note, and property deletion remains editable after switching.
**Branch totality:** Rechecked this patch against Turn 1 two-column navigation and Turn 6 created-note editor-surface behavior.
**Sibling closure:** The two pre-push failing smoke files were both rerun together after patching.
**Remediation impact surface:** Local to smoke tests. No app code, native code, persistence schema, localization, or updater behavior changed in this turn.
**Residual risk / unknowns:** Full pre-push gate may still expose additional older smoke tests that assume the removed three-column layout.

### Validation

- `pnpm exec playwright test --config playwright.smoke.config.ts tests/smoke/missing-string-metadata-open-note.spec.ts tests/smoke/save-before-note-switch.spec.ts` — passed, 5 tests
- `pnpm exec tsc --noEmit` — passed
- `pnpm lint` — passed
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; no CodeScene MCP tool exposed and `cs` CLI unavailable
- Codacy scan — not run; no Codacy MCP tool exposed and `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `useAppNavigation.ts`, `SidebarSections.tsx`, and the two failing smoke specs.
- **Prior open findings rechecked:** none open from Turns 1-6.
- **Prior resolved/adjacent areas revalidated:** two-column browser/editor separation, created-note editor transition, and note-switch save flushing.
- **Hotspots or sibling paths revisited:** missing metadata note switching, raw save-before-switch, slow rich-editor save-before-switch, and property editing after note switch.
- **Dependency/adjacent surfaces revalidated:** TypeScript, ESLint, focused Playwright smoke, whitespace, and demo-vault hygiene.
- **Why this is enough:** The patch directly targets the specs that blocked push and verifies the note-switching invariants without weakening the runtime product behavior.

### Challenger pass

- `done` — Assumed one Back action would always reveal the browser surface. The missing-metadata spec showed a previous document could be next in history, so the helper now walks back until the note list is actually visible.

### Resolved / Carried / New findings

#### B7-1 — Resolved — Low — `tests/smoke/missing-string-metadata-open-note.spec.ts`, `tests/smoke/save-before-note-switch.spec.ts`

The smoke specs still clicked the document list after opening a note, which implied the removed three-column layout and timed out under the new browser/editor split.

Resolution: updated the affected smoke helpers to return through the app's Back navigation until the document browser is visible before selecting the next note.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** retry the full pre-push gate.
3. **Patterns noticed:** smoke tests that switch documents should explicitly choose whether they are exercising quick-open navigation or browser-list navigation.
4. **Suggested approach:** if another smoke spec fails on hidden note-list clicks, update that spec to use the same browser-return contract rather than reverting the UI.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

## Turn 6 — 2026-06-27 11:09:11 BST

| Field | Value |
|-------|-------|
| **Commit** | 6831bf7a plus working tree |
| **IDE / Agent** | Codex |

**Summary:** Re-reviewed the branch after the pre-push gate exposed a create-note regression in the new browser/editor surface model, followed by a missing higher-level config type for the new callback.
**Outcome:** all clear with low-risk unknowns.
**Risk score:** medium — shared note creation, main-surface routing, and editor focus ownership changed, but the fix is narrow and covered by targeted unit tests plus the exact failing smoke subset.
**Change archetypes:** browser/editor navigation, note creation, editor focus lifecycle, smoke-test contract update.
**Intended change:** Created notes should open the editor surface and focus the empty title even when the user started from the document browser or sidebar type section.
**Intent vs actual:** The app now switches to editor mode when a created note is opened, re-requests focus after the editor has mounted, resumes editor focus ownership after toolbar/sidebar interactions that intentionally suspended it, and exposes the callback through the `useNoteActions` config boundary.
**Confidence:** high for the create-note regression; medium for the full branch until the full pre-push gate and Apple Silicon build complete after this commit.
**Coverage note:** Targeted App/useNoteCreation/useNoteActions tests and the focused Playwright smoke subset that failed in the push gate passed.
**Finding triage:** One medium push-gate finding was live and resolved. The follow-up TypeScript config-boundary miss was also fixed before the push retry. No additional issues were found in the create-note sibling paths checked.
**Static/analyzer evidence:** TypeScript, ESLint, targeted Vitest, focused Playwright smoke, whitespace check, and demo-vault dirt check passed. CodeScene MCP/CLI and Codacy CLI remained unavailable in this environment.
**Architecture impact:** No new architecture decision. This preserves the two-column browser/editor model by making note creation an explicit transition from browser mode into editor mode.
**Deep-review evidence:** Correctness/safety pass checked list-header, typed-section, Cmd+N, command-palette, and desktop menu-command creation paths. Maintainability/structure pass checked that the browser-to-editor transition lives at the app surface boundary while creation hooks expose a small callback instead of importing app layout state.
**Bug classes / invariants checked:** note creation persists before selection, opening a created note hides the browser list and shows the editor, title heading receives focus after mount, toolbar/sidebar focus suspension does not block explicit create-note focus, and smoke assertions match the two-column behavior rather than the old visible-row contract.
**Branch totality:** Rechecked this patch against Turn 1 two-column navigation, Turn 4 browser AI/sidebar surface changes, and the Turn 5 push-gate retry.
**Sibling closure:** Checked named note creation, immediate note creation, type-section creation, command-palette creation, Cmd+N, and desktop menu command routing.
**Remediation impact surface:** Local to `App.tsx`, `useNoteActions.ts`, `useNoteCreation.ts`, and tests. No native code, persistence schema, vault scanning, localization, or updater behavior changed in this turn.
**Residual risk / unknowns:** CodeScene and Codacy are still not runnable locally. The full push gate and packaged Apple Silicon build remain the release confidence gate after this commit.

### Validation

- `pnpm exec tsc --noEmit` — passed
- `pnpm lint` — passed
- `pnpm exec vitest run src/hooks/useNoteCreation.test.ts src/App.test.tsx --reporter=dot` — passed, 101 tests
- `pnpm exec vitest run src/hooks/useNoteActions.hook.test.ts src/hooks/useNoteCreation.test.ts src/App.test.tsx --reporter=dot` — passed, 143 tests
- `pnpm exec playwright test --config playwright.smoke.config.ts tests/smoke/create-note-backing-file.spec.ts tests/smoke/fix-crash-create-note.spec.ts tests/smoke/keyboard-command-routing.spec.ts` — passed, 8 tests
- `git diff --check` — passed
- `git status --short -- demo-vault demo-vault-v2` — clean
- CodeScene file/project health — not run; no CodeScene MCP tool exposed and `cs` CLI unavailable
- Codacy scan — not run; no Codacy MCP tool exposed and `.codacy/cli.sh` unavailable

### Branch-totality proof

- **Non-delta files/systems re-read:** `App.tsx`, `useNoteActions.ts`, `useNoteCreation.ts`, `editorFocusOwnership.ts`, `useEditorFocus.ts`, `App.test.tsx`, `useNoteCreation.test.ts`, and the create-note smoke spec.
- **Prior open findings rechecked:** none open from Turns 1-5.
- **Prior resolved/adjacent areas revalidated:** two-column browser/editor separation, browser-mode AI panel, note-list create buttons, editor focus ownership, and desktop command routing.
- **Hotspots or sibling paths revisited:** create-note paths from list header, type section, Cmd+N, command palette, and desktop menu bridge.
- **Dependency/adjacent surfaces revalidated:** TypeScript, ESLint, targeted unit tests, focused Playwright smoke, whitespace, and demo-vault hygiene.
- **Why this is enough:** The failed push-gate smoke paths were rerun directly, and the fix keeps creation routing in the app surface boundary without weakening persistence or focus guards.

### Challenger pass

- `done` — Assumed the first fix only solved the active-tab state while leaving focus blocked by the toolbar click. Reproduced that failure, then resumed editor focus ownership during explicit creation and reran the full focused smoke subset.

### Resolved / Carried / New findings

#### B6-1 — Resolved — Medium — `src/App.tsx`, `src/hooks/useNoteActions.ts`, `src/hooks/useNoteCreation.ts`

Created notes opened a tab but could leave the app in browser mode, and focus could stay blocked by the toolbar/sidebar interaction that started the creation. The visible result was that the editor did not reliably appear/focus after list-header, typed-section, or menu-command note creation.

Resolution: added an app-level created-note callback that switches the main surface to editor mode and re-requests title focus after mount, exposed that callback through the `useNoteActions` config type, and made explicit creation resume editor focus ownership before dispatching the focus event. Smoke expectations now assert the editor breadcrumb/title-focus contract instead of the old visible list-row contract.

### Recommendations

1. **Fix first:** none open.
2. **Then address:** retry the full pre-push gate and run the requested Apple Silicon build.
3. **Patterns noticed:** creation hooks should notify app shell state changes, not own app layout state directly.
4. **Suggested approach:** keep create-note smoke checks focused on the user-visible editor result now that document list and editor are mutually exclusive.
5. **Architecture transition:** none.
6. **Defer on purpose:** CodeScene and Codacy remain deferred because their local/MCP entrypoints are unavailable here.

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
