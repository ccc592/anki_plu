---
description: "Implementation task list for Anki Assistant Chrome Extension MVP"
---

# Tasks: Anki Assistant Chrome Extension MVP

**Input**: Design documents from `/specs/001-anki-chrome-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the specification; focus on implementation tasks with manual verification per story’s independent test criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Story or phase label (e.g., Setup, Foundation, US1)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish workspace structure, tooling, and packages required by all subsequent work.

- [X] T001 [Setup] Initialize pnpm workspace (`package.json`, `pnpm-workspace.yaml`, root scripts) at `/home/100_Project/anki_plu/` with workspace entries for `extension` and `extension-tests`.
- [X] T002 [Setup] Scaffold `extension/` Vite + React + CRXJS package (`extension/package.json`, `extension/vite.config.ts`, `extension/tsconfig.json`, `extension/public/manifest.json`, `extension/src/main.tsx`).
- [X] T003 [Setup] Scaffold `extension-tests/` package with Playwright + Vitest harness (`extension-tests/package.json`, `extension-tests/playwright.config.ts`, `extension-tests/vitest.config.ts`, shared helpers directory).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story work.

- [X] T004 [Foundation] Create shared TypeScript configuration (`tsconfig.base.json`, `extension/tsconfig.json`, `extension-tests/tsconfig.json`) with path aliases matching the implementation plan structure.
- [X] T005 [Foundation] Define domain schemas and message contracts using Zod in `extension/src/messaging/schemas.ts` and `extension/src/messaging/messages.ts` (SelectionCapture, CandidateCard, MediaAsset, UserPreferences, SyncStatus).
- [X] T006 [Foundation] Implement chrome storage adapters and preference snapshot utilities in `extension/src/shared/storage.ts` and `extension/src/shared/preferencesSnapshot.ts` leveraging schemas from T005.
- [X] T007 [Foundation] Build background service worker skeleton with queue manager and message routing (`extension/src/background/index.ts`, `extension/src/background/queue.ts`, update `extension/public/manifest.json` service worker entry).

**Checkpoint**: Foundation ready — background, messaging, and storage infrastructure in place.

---

## Phase 3: User Story 1 - Clip and Approve Cards (Priority: P1) 🎯 MVP

**Goal**: Allow users to capture selected webpage content, review automatically generated Q/A cards, edit them, and queue them for Anki import.

**Independent Test**: Load the extension, select representative webpage content, trigger via context menu or hotkey, and verify the overlay displays editable cards with deck/template/tag controls and submission queuing.

### Implementation for User Story 1

- [X] T008 [US1] Register context-menu action and keyboard command in `extension/public/manifest.json` and `extension/src/background/contextMenus.ts` to trigger capture messaging.
- [X] T009 [US1] Implement selection capture pipeline in `extension/src/content/selection.ts` and `extension/src/content/index.ts` to clone DOM ranges, sanitize via DOMPurify, and post `CaptureRequest` messages.
- [X] T010 [US1] Implement Q/A detection heuristics module in `extension/src/shared/qaDetection.ts` covering explicit markers, structural cues, question punctuation, and optional list/table rules.
- [X] T011 [US1] Build overlay shell and card list UI in `extension/src/overlay/App.tsx` and `extension/src/overlay/components/CardList.tsx` to render candidate cards with formatting preview.
- [X] T012 [US1] Add card editing features (merge, split, manual front/back assignment, markdown shortcuts) in `extension/src/overlay/components/CardEditor.tsx` and supporting utilities.
- [X] T013 [US1] Implement deck/model/tag controls with auto-complete and template expansion in `extension/src/overlay/components/DeckControls.tsx` and `extension/src/overlay/state/useCardStore.ts`.
- [X] T014 [US1] Wire overlay submission to queue by transforming selected cards into CandidateCard payloads and dispatching `SubmissionRequest` messages (`extension/src/overlay/actions/submitCards.ts`).

**Checkpoint**: User Story 1 independently delivers card capture, review, and submission queuing.

---

## Phase 4: User Story 2 - Reliable Import with Assets (Priority: P2)

**Goal**: Ensure queued cards download media, deduplicate against Anki, sync via AnkiConnect with retries, and surface per-card statuses with retry options.

**Independent Test**: Submit cards containing linked images and known duplicates, observe background processing downloading assets, flagging duplicates, and updating overlay statuses with retry controls.

### Implementation for User Story 2

- [X] T015 [US2] Extend queue processing with deduplication logic and normalized front hashing in `extension/src/background/queue.ts`, `extension/src/background/dedupe.ts`, and `extension/src/shared/normalizer.ts`.
- [X] T016 [US2] Implement media downloader with concurrency limits and HTML rewrite support in `extension/src/background/mediaDownloader.ts` and integrate with `MediaAsset` metadata.
- [X] T017 [P] [US2] Implement AnkiConnect client with exponential backoff, whitelist detection, and deck/model helpers in `extension/src/background/ankiClient.ts`.
- [X] T018 [US2] Compose background processor to coordinate media downloads, dedupe, and Anki submission, emitting per-card status updates (`extension/src/background/processor.ts`, `extension/src/background/index.ts`).
- [X] T019 [US2] Surface status badges, retry buttons, and error export in overlay (`extension/src/overlay/components/StatusPanel.tsx`, `extension/src/overlay/state/useCardStore.ts`).
- [X] T020 [US2] Persist capture operation logs and error report packaging in `extension/src/background/operationLog.ts` and expose history via messaging.

**Checkpoint**: User Stories 1 and 2 together support reliable imports with clear status tracking.

---

## Phase 5: User Story 3 - Configure Recognition and Defaults (Priority: P3)

**Goal**: Provide an options page for configuring heuristics, tag templates, shortcuts, media policies, and site rules that immediately influence future captures.

**Independent Test**: Open the options page, adjust heuristics toggles and tag templates, change shortcut and media policies, then perform a new capture to confirm settings apply without restarting the extension.

### Implementation for User Story 3

- [X] T021 [US3] Implement preferences repository with schema validation and change broadcasting (`extension/src/shared/preferences.ts`, update storage adapters as needed).
- [X] T022 [US3] Build options page UI with heuristics toggles, tag template preview, and media policy controls (`extension/src/options/App.tsx`, `extension/src/options/components/PreferencesForm.tsx`).
- [X] T023 [US3] Connect overlay and background to live preference updates (`extension/src/overlay/state/usePreferences.ts`, `extension/src/background/context.ts`).
- [X] T024 [US3] Add site allowlist/blocklist management and clipboard import toggle handling (`extension/src/options/components/SiteRules.tsx`, `extension/src/content/selection.ts`).
- [X] T025 [US3] Implement customizable keyboard shortcut syncing by updating manifest commands and command handler (`extension/public/manifest.json`, `extension/src/background/commands.ts`).

**Checkpoint**: All user stories now configurable and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements, documentation, and performance tuning across stories.

- [X] T026 [Polish] Update developer documentation with end-to-end workflow and troubleshooting (`specs/001-anki-chrome-mvp/quickstart.md`, repository `README.md`).
- [X] T027 [Polish] Optimize overlay rendering with lazy image loading and batching updates (`extension/src/overlay/components/CardList.tsx`, `extension/src/overlay/state/useCardStore.ts`).
- [X] T028 [Polish] Finalize build and packaging scripts including lint/format commands and release bundle verification (`extension/package.json`, `extension-tests/package.json`, root `package.json`).

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)** → prerequisite for all later phases.
- **Phase 2 (Foundational)** → depends on Phase 1, blocks all user stories.
- **Phase 3 (US1)** → depends on Phase 2 completion.
- **Phase 4 (US2)** → depends on Phase 2; may start after Phase 3 but teams can run in parallel once foundational work is complete (requires queue primitives from Phase 3’s submissions).
- **Phase 5 (US3)** → depends on Phase 2; can start after Phase 3 establishes overlay hooks.
- **Phase 6 (Polish)** → depends on chosen user stories being ship-ready.

### User Story Dependencies
- **US1 (P1)** provides capture and overlay; must complete before integrating US2 status updates or US3 preference wiring.
- **US2 (P2)** relies on queue submission from US1 and extends background processing.
- **US3 (P3)** reuses overlay and storage built for US1/US2 but introduces new UI and storage flows.

### Task-Level Notes
- T017 can run in parallel with T016 because AnkiConnect client lives in a separate module.
- T019 depends on T015–T018 to ensure status sources exist.
- T025 depends on T021–T024 to ensure preference state and commands align.

---

## Parallel Execution Examples

### User Story 1
- Run T009 (selection capture) and T010 (heuristics module) in parallel once T008 is ready; they touch distinct modules.
- After T011 scaffold, T012 (editor) and T013 (deck controls) can proceed concurrently if coordination avoids shared files.

### User Story 2
- After T015 establishes dedupe utilities, run T016 (media downloader) and T017 (AnkiConnect client) in parallel; integrate with T018 afterwards.

### User Story 3
- Once T021 is done, T022 (options UI) and T024 (site rules) can progress in parallel since they target different component files.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 Setup and Phase 2 Foundational tasks.
2. Execute Phase 3 tasks (T008–T014) to deliver card capture, editing, and queuing.
3. Validate end-to-end capture flow manually per independent test, then consider release.

### Incremental Delivery
1. MVP (US1) → deliver initial clipping overlay.
2. Layer US2 to add reliable imports and status visibility.
3. Layer US3 to provide advanced configuration and personalization.
4. Finish with Phase 6 polish tasks before public release.

### Team Parallelization
- Team members can split after foundational work:
  - Developer A: Focus on frontend overlay tasks (US1, later US3 UI).
  - Developer B: Handle background queue, media, and AnkiConnect (US2).
  - Developer C: Own options page and preference integrations (US3).
- Use [P] guidance to coordinate parallelizable modules without merge conflicts.

---

## Notes

- All tasks must include updates to relevant TypeScript types and ensure messaging contracts remain consistent with `contracts/extension-messages.yaml`.
- Manual verification per story should align with acceptance scenarios in `spec.md`.
- Keep each user story shippable on completion; avoid cross-story coupling beyond noted dependencies.
- Update quickstart instructions as tooling or commands evolve.

