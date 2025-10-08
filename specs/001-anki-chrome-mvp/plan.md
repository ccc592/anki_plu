# Implementation Plan: Anki Assistant Chrome Extension MVP

**Branch**: `001-anki-chrome-mvp` | **Date**: 2025-10-08 | **Spec**: /home/100_Project/anki_plu/specs/001-anki-chrome-mvp/spec.md
**Input**: Feature specification from `/specs/001-anki-chrome-mvp/spec.md`

## Summary

Deliver a Chrome Manifest V3 extension that converts selected webpage content into curated Anki cards. The solution centers on a React-based overlay for preview and editing, a service-worker queue that sanitizes HTML, downloads media, deduplicates notes, and a resilient AnkiConnect integration with retry and status reporting. Tooling is TypeScript-first with Vite/CRXJS for bundling and Vitest + Playwright for validation.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022 (Node.js 20 toolchain)  
**Primary Dependencies**: React 18, CRXJS Vite plugin, Zustand, DOMPurify, Zod  
**Storage**: `chrome.storage.sync` for preferences, `chrome.storage.local` for cached captures/logs  
**Testing**: Vitest (unit), Playwright + MSW (end-to-end with AnkiConnect stubs)  
**Target Platform**: Chromium browsers supporting Manifest V3 (desktop)  
**Project Type**: Browser extension with content scripts, service worker, options UI  
**Performance Goals**: Overlay review + submission under 30 seconds for ≤2,000 word selection; ≥95% media download success on first attempt  
**Constraints**: Offline/local-only processing, background retries with exponential backoff, minimal perceptible latency in overlay  
**Scale/Scope**: Single-user workflow; queues sized for tens of cards per capture session

## Constitution Check

- `.specify/memory/constitution.md` contains placeholder sections with no actionable principles. No additional gates identified.  
- **Gate Status**: PASS (pending project owner update to constitution).

## Project Structure

### Documentation (this feature)

```
specs/001-anki-chrome-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md (created by /speckit.tasks later)
```

### Source Code (repository root)

```
extension/
├── src/
│   ├── background/        # service worker, queue, AnkiConnect client
│   ├── content/           # selection capture and DOM cloning helpers
│   ├── overlay/           # React UI for preview/editor
│   ├── options/           # settings page UI and forms
│   ├── messaging/         # shared message + schema definitions
│   └── shared/            # utilities (sanitizers, normalizers, hooks)
├── public/                # static assets, manifest base
└── vite.config.ts         # Vite + CRXJS bundler config

extension-tests/
├── unit/                  # Vitest suites (heuristics, sanitization)
├── integration/           # MSW-backed service-worker tests
└── e2e/                   # Playwright specs loading the extension bundle
```

**Structure Decision**: Root `extension/` houses MV3 source split by execution environment (background, content, UI) with shared messaging schemas, aligning with React + Vite tooling. Tests live alongside but outside bundle outputs in `extension-tests/` to keep build artifacts clean and allow Playwright harness configuration.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(None)* | *(N/A)* | *(N/A)* |
