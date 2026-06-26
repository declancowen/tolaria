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

## Hotspots

- note-list display modes rendering large vaults — added Turn 1
- two-column browser/editor navigation state — added Turn 1
- shared toolbar and side-panel icon sizing — added Turn 1
- hidden root guidance files and folder-tree root behavior — added Turn 1

## Review status

| Field | Value |
|-------|-------|
| **Review started** | 2026-06-26 22:29:20 BST |
| **Last reviewed** | 2026-06-26 22:29:20 BST |
| **Total turns** | 1 |
| **Open findings** | 0 |
| **Resolved findings** | 1 |
| **Accepted findings** | 0 |

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
