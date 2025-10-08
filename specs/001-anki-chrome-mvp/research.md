# Research for Anki Assistant Chrome Extension MVP

## Task: Research language/version for Chrome MV3 clipping extension

- **Decision**: Use TypeScript 5.x targeting ES2022 with Node.js 20 toolchain for build scripts.
- **Rationale**: TypeScript provides static typing across service worker, content, and UI layers, reducing runtime errors when transforming DOM selections and coordinating background queues. ES2022 aligns with Chrome MV3 capabilities, and Node 20 is the current LTS widely supported by Vite-based toolchains.
- **Alternatives considered**:
  - **Plain JavaScript**: Lightweight but sacrifices type safety across messaging boundaries, making it harder to enforce card payload contracts.
  - **Rust/Wasm**: Offers performance but introduces significant complexity for DOM integration and MV3 packaging, exceeding MVP scope.

## Task: Research primary dependencies for MV3 overlay workflow

- **Decision**: Adopt React 18 with the CRXJS Vite plugin, Zustand for lightweight state coordination, DOMPurify for sanitization, and Zod for payload validation.
- **Rationale**: React 18 integrates well with MV3 via CRXJS, enabling component-based overlay UI with fine-grained updates for card editing. Zustand keeps background queue state simple without Redux ceremony, DOMPurify satisfies the spec’s sanitization requirements, and Zod enforces deduplication hashes and media manifests before submission.
- **Alternatives considered**:
  - **SvelteKit + rollup-plugin-chrome-extension**: Smaller bundle but rollup-based tooling has slower rebuilds and fewer MV3-specific presets.
  - **Preact + vanilla state**: Lower footprint but sacrifices developer familiarity and available libraries for complex rich-text editing.
  - **Redux Toolkit**: Mature but adds boilerplate beyond MVP needs.

## Task: Research testing approach for MV3 extension

- **Decision**: Use Vitest for unit tests (content sanitization, heuristics), Playwright with the Chrome DevTools protocol for end-to-end extension sessions, and Mock Service Worker (MSW) to stub AnkiConnect responses.
- **Rationale**: Vitest runs quickly with Vite projects and shares configuration with TypeScript. Playwright can automate Chromium with extension loading, covering user journeys. MSW intercepts fetch calls in service worker tests, enabling deterministic AnkiConnect scenarios without a live Anki instance.
- **Alternatives considered**:
  - **Jest**: Feature-rich but slower with ESM/Vite and requires extra transpilation layers.
  - **Selenium/WebDriver**: Works but heavier setup and slower iteration than Playwright for extension flows.
  - **Custom HTTP stubs**: Less reusable than MSW and harder to share across unit/integration layers.

## Task: Research integration strategy with AnkiConnect

- **Decision**: Implement a service-worker queue that issues fetch POST requests to `http://127.0.0.1:8765` using AnkiConnect’s JSON payloads, wrapping calls with exponential backoff, port configurability, and whitelist detection prompts.
- **Rationale**: Service workers remain persistent enough for queued downloads and retries, satisfying the spec’s background processing requirement. Direct fetch maintains compatibility with AnkiConnect 6+, while queue metadata lets the overlay surface per-card statuses and retries.
- **Alternatives considered**:
  - **Direct content-script calls**: Simplifies implementation but violates MV3 restrictions (content scripts cannot bypass CORS for arbitrary hosts) and complicates retry handling.
  - **Native host messaging**: Offers robust transport but introduces installation friction and diverges from MVP scope.
