# Data Model: Anki Assistant Chrome Extension MVP

## Overview

The extension persists lightweight state across three storage surfaces:
- **In-memory overlay state**: Runtime-only card editing session.
- **`chrome.storage.sync`**: Cross-device user preferences (deck defaults, heuristics toggles, shortcuts).
- **`chrome.storage.local`**: Capture logs, cached media metadata, transient failure records.

## Entities

### SelectionCapture

Represents a single user-triggered capture session.
- **Identifier**: `captureId` (UUID v4).
- **Attributes**:
  - `sourceUrl` (string, required, valid URL).
  - `sourceTitle` (string, optional, ≤256 chars).
  - `capturedAt` (ISO 8601 timestamp, required).
  - `rawHtml` (string, required) — sanitized HTML snapshot used for preview.
  - `textDigest` (string, SHA-256 hex, required) — normalized front-text hash for deduplication baseline.
  - `mediaManifest` (array of `MediaAssetRef`, optional) — initial references extracted from HTML.
  - `configSnapshot` (`UserPreferencesSnapshot`, required) — frozen copy of relevant preferences at capture time.
- **Storage**: `chrome.storage.local` (retained for 10 most recent captures) and runtime memory during active session.
- **State Transitions**:
  - `draft` → `submitted` when user confirms import.
  - `submitted` → `completed` after queue finishes (all cards resolved), or `submitted` → `failed` if unrecoverable error logged.

### CandidateCard

One potential Anki note derived from a capture.
- **Identifier**: Composite `{captureId}:{cardId}` (cardId short UUID).
- **Attributes**:
  - `frontHtml` (string, required) — sanitized HTML for question.
  - `backHtml` (string, required) — sanitized HTML for answer.
  - `confidence` (float 0–1, required).
  - `status` (enum: `draft`, `queued`, `added`, `duplicate`, `failed:image`, `failed:anki`, `skipped:user`).
  - `selected` (boolean, default true) — user toggle prior to submission.
  - `deckId` (string, required at submission).
  - `modelId` (string, required at submission).
  - `tags` (array<string>, derived from templates plus user edits).
  - `hash` (string, 12-char hex) — normalized front text digest used for deduplication tag.
  - `errorDetails` (string, optional) — populated on failure statuses.
- **Relationships**: Belongs to exactly one `SelectionCapture`. Links to zero or more `MediaAsset` records through `mediaRefs` in HTML.
- **Validation**: Front/Back must contain visible text after stripping HTML; tags limited to 64 chars each; deck/model IDs verified against AnkiConnect metadata before queueing.

### MediaAsset

Represents an external media file associated with a capture.
- **Identifier**: `mediaId` (SHA-1 of normalized URL or data URI).
- **Attributes**:
  - `sourceUrl` (string) — original URL or data URI.
  - `filename` (string) — normalized `qa_clip_<hash>_<index>.<ext>`.
  - `state` (enum: `pending`, `downloading`, `stored`, `failed`).
  - `failureReason` (string, optional) — e.g., `cors`, `timeout`, `unsupported-format`.
  - `retries` (integer ≥0, default 0, max 3).
  - `contentType` (string) — detected MIME type.
  - `sizeBytes` (integer, optional) — used for large-file hinting.
- **Relationships**: Associated with one or more `CandidateCard` instances via HTML references.
- **Storage**: `chrome.storage.local` until download completes; after success, only metadata retained (actual file stored via AnkiConnect `storeMediaFile`).

### UserPreferences

Persistent configuration for detection heuristics and defaults.
- **Identifier**: Singleton (namespace key `userPreferences`).
- **Attributes**:
  - `defaultDeck` (string, optional).
  - `defaultModel` (string, default `Basic`).
  - `tagTemplate` (string, default `from-clip, source:{domain}, date:{YYYY-MM-DD}`).
  - `heuristics` (object) — toggles for `explicitMarkers`, `structureHints`, `questionMarks`, `listTable`.
  - `htmlAllowlist` (object) — maps of allowed `tags` and `styles`.
  - `mediaPolicy` (object) — flags for `downloadExternal`, `convertWebP`, `concurrency`, `retryLimit`, `maxSizeMB`.
  - `shortcut` (string) — accelerator signature.
  - `clipboardEnabled` (boolean, default false).
  - `siteAllowlist` (array<string>) and `siteBlocklist` (array<string>).
- **Validation**: Ensure concurrency between 1–6; retry limit ≤5; shortcut conforms to Chrome command format; allowlist entries known safe tags/styles.
- **Storage**: `chrome.storage.sync` with schema guards; snapshot copied into `SelectionCapture` on session start.

### SyncStatus

Current state of AnkiConnect integration.
- **Identifier**: Singleton (in-memory, mirrored to `chrome.storage.local` for diagnostics).
- **Attributes**:
  - `availability` (enum: `reachable`, `unreachable`, `unauthorized`, `timeout`).
  - `version` (string, optional) — AnkiConnect version when reachable.
  - `lastChecked` (timestamp) — last health probe.
  - `retrySchedule` (object) — next retry timestamp and backoff exponent.
  - `whitelistMissing` (boolean).
  - `recentErrors` (array<{timestamp, message, context}>, capped at 20 entries).
- **Usage**: Drives overlay banners and retry buttons; referenced by health panel in options page.

## Derived Structures

### MediaAssetRef

Embedded within `SelectionCapture.mediaManifest` and card HTML annotations.
- `mediaId` (string, required).
- `tagName` (string, e.g., `img`).
- `attribute` (string, e.g., `src`).
- `original` (string) — original attribute value for traceability.

### UserPreferencesSnapshot

Captured during session start.
- Deep copy of `UserPreferences` plus resolved deck/model lists at capture time.
- Used to ensure deterministic replays even if preferences change before submission.

## Data Retention & Lifecycle

- Maintain rolling window of 10 `SelectionCapture` records; prune oldest when successful completion recorded or upon manual clear.
- `MediaAsset` entries removed once all referencing cards reach terminal status (`added`, `duplicate`, `skipped:user`).
- Diagnostic logs capped at 1 MB; older entries truncated with summary entry noting truncation.

## Validation & Integrity Rules

1. Deduplication hash must be unique per card submission; duplicates flagged before queueing.
2. Media downloads cannot transition to `stored` without recorded filename and checksum from AnkiConnect response.
3. Preference updates validated via Zod schema before persistence; invalid payloads rejected with UI feedback.
4. Queue enforces idempotency by tagging Anki notes with `hash:<digest>` and storing operation results in `SelectionCapture` history.
