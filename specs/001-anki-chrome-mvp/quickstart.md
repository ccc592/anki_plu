# Quickstart: Anki Assistant Chrome Extension MVP

## Prerequisites

1. Install **Node.js 20 LTS** and **pnpm 9**.
2. Install **Google Chrome** (v120+) or another Chromium browser that supports Manifest V3.
3. Install the **Anki desktop app** plus the **AnkiConnect** add-on (required for live integration).
4. Optional: install **Playwright** browsers (`pnpm --filter extension-tests playwright install`) and **MSW CLI** (`pnpm dlx msw init`) for fully automated testing.

## Install Dependencies

```bash
cd /home/100_Project/anki_plu
pnpm install
```

This command bootstraps the pnpm workspace:
- `extension/` – Manifest V3 source code bundled with Vite + CRXJS.
- `extension-tests/` – Playwright + Vitest harness and shared testing utilities.

## Daily Development Loop

### 1. Run the extension in watch mode

```bash
pnpm --filter extension dev
```

- Outputs to `extension/dist/`.
- Load the unpacked extension from that directory (chrome://extensions → Developer mode → Load unpacked).
- The dev server rebuilds when overlay, content, or background files change.

### 2. Unit + contract tests (Vitest)

```bash
pnpm --filter extension test -- --run
pnpm --filter extension typecheck
```

Covers heuristics, sanitizers, background queue, and messaging contracts.

### 3. End-to-end regression (Playwright)

```bash
pnpm --filter extension-tests test:e2e
```

Launches Chromium with the packaged extension, mocks AnkiConnect via MSW when desired, and walks through the P1/P2 journeys.

### 4. Manual validation checklist

1. Start Anki desktop; confirm AnkiConnect listening on `http://127.0.0.1:8765`.
2. In Chrome, highlight page content and trigger the shortcut (default `Alt+A`).
3. Inspect the overlay: edit cards, adjust deck/model/tags, then click **Add to Anki**.
4. Watch status updates for added, duplicate, or failed cards; use the **Retry** button for failures.
5. Open `chrome-extension://<ID>/options.html` to confirm preferences persist and propagate live (heuristics, media policy, shortcuts, site rules).

## Packaging & Linting

```bash
pnpm --filter extension build        # Production bundle
pnpm --filter extension lint         # ESLint (React + TypeScript rules)
pnpm --filter extension format       # Prettier write
pnpm --filter extension-tests test   # Vitest utilities in the test harness
```

Running `pnpm build` at the workspace root executes every package build target (extension + tests).

## Release Checklist

1. `pnpm build` → confirm `extension/dist/` contains manifest, background, content, overlay, and options bundles.
2. `pnpm --filter extension-tests test:e2e` → verify import pipeline against mocked AnkiConnect.
3. Install the dist folder into Chrome and perform a manual capture with images to ensure media downloads rewrite correctly.
4. Export the latest error report from the overlay (**Import Status → Export Errors**) to confirm logging pipeline works.

## Troubleshooting

- **Extension refuses to load**: run `pnpm --filter extension build` to regenerate manifest+assets, then reload in chrome://extensions.
- **AnkiConnect unreachable / whitelist issues**: open the overlay banner and follow the whitelist prompt, or run the Playwright suite with MSW to isolate UI behaviour without Anki.
- **Images missing after import**: check background logs (`chrome://extensions → Inspect views`) for `mediaDownloader` failures; adjust media policy concurrency or size thresholds in the options page.
- **Shortcut mismatch**: update the shortcut in options and reload the extension; the background command syncs via `chrome.commands.update`.

## Next Steps

- Use `/speckit.tasks` to regenerate a fresh task list if scope changes.
- Run `pnpm changeset` (if configured) before publishing packaged builds to the Chrome Web Store.
