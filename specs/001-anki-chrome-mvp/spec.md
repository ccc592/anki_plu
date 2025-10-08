# Feature Specification: Anki Assistant Chrome Extension MVP

**Feature Branch**: `001-anki-chrome-mvp`  
**Created**: 2025-10-08  
**Status**: Draft  
**Input**: User description: "Anki Assistant Chrome plugin MVP v1.0 brief"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clip and Approve Cards (Priority: P1)

A knowledge worker highlights content on a webpage, triggers the extension, and reviews auto-generated question/answer cards before sending them to Anki.

**Why this priority**: This journey delivers the core value of turning web content into spaced-repetition material with minimal friction.

**Independent Test**: Select representative webpages, trigger the extension, and confirm cards can be reviewed, edited, and submitted entirely within the overlay.

**Acceptance Scenarios**:

1. **Given** a user selects content on a supported webpage, **When** they trigger the extension via context menu or hotkey, **Then** a preview overlay shows candidate cards with preserved formatting for review.
2. **Given** the overlay lists multiple candidate cards, **When** the user edits content, merges or splits cards, and confirms the deck/template/tags, **Then** the system applies the changes and queues the cards for Anki import.

---

### User Story 2 - Reliable Import with Assets (Priority: P2)

A user submits reviewed cards and expects media downloads, duplicate detection, and AnkiConnect synchronization to succeed or clearly signal issues.

**Why this priority**: Import reliability and transparency determine trust in the extension for daily study routines.

**Independent Test**: Use captured selections with linked images and previously added notes to verify download, deduplicate, and retry behaviors without relying on other stories.

**Acceptance Scenarios**:

1. **Given** submitted cards include external images, **When** the background process runs, **Then** required assets are stored locally and card references are updated before sending to Anki.
2. **Given** AnkiConnect is unreachable or a note is detected as duplicate, **When** the service worker processes the queue, **Then** the overlay surfaces per-card statuses with retry or override options.

---

### User Story 3 - Configure Recognition and Defaults (Priority: P3)

A power user adjusts detection heuristics, tagging templates, and shortcut preferences to match their workflow and privacy expectations.

**Why this priority**: Configurability lets a broad set of users succeed without manual editing on every capture, while respecting local-only processing expectations.

**Independent Test**: Open the options page, modify settings (regex rules, HTML allowlist, media policies), and confirm future clipping sessions honor the new defaults.

**Acceptance Scenarios**:

1. **Given** the user opens the options page, **When** they change detection toggles, default deck, tags, or shortcut keys, **Then** subsequent captures apply the updated configuration without requiring a restart.

---

### Edge Cases

- No DOM selection exists when the trigger fires, prompting the user to select content or import from the clipboard before proceeding.
- Selected content contains complex layouts or math notation, and the system must preserve readable structure while sanitizing unsafe markup.
- AnkiConnect is not running or rejects the extension ID, so the overlay shows a connection warning with guided recovery steps.
- Media downloads fail due to CORS or large files, and failed assets remain referenced with clear warnings and retry options.
- Duplicate detection matches existing notes, marking them as already stored while letting the user override if desired.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST provide at least a context-menu action, customizable keyboard shortcut, and clipboard-import entry point for initiating a capture session.
- **FR-002**: When the trigger fires, the system MUST capture the current DOM selection as cleaned HTML, and if nothing is selected MUST prompt the user to supply clipboard content before continuing.
- **FR-003**: The system MUST sanitize captured HTML using a predefined allowlist so that semantic formatting (headings, lists, tables, code, math) remains visible while active scripts and unsafe styles are removed.
- **FR-004**: The system MUST apply multi-pass question/answer detection (explicit markers, structural cues, question punctuation, optional list/table heuristics) and record a confidence score for each candidate card.
- **FR-005**: The preview overlay MUST let users enable or disable individual cards, edit front/back content with rich-text shortcuts, and merge or split segments before submission.
- **FR-006**: The preview overlay MUST expose deck, model, and tag selectors with auto-complete, remember the last used values, and display tag templates that expand dynamic placeholders such as domain and capture date.
- **FR-007**: Upon submission the system MUST queue card payloads, deduplicate them by hashing normalized front content, and mark duplicates in the UI with an option to bypass deduplication if the user chooses.
- **FR-008**: The background workflow MUST download referenced media assets (including relative URLs and data URIs), enforce a configurable concurrency limit, and rewrite card content to reference stored filenames, flagging any failures.
- **FR-009**: The system MUST detect AnkiConnect availability, guide users through whitelist setup when unauthorized, automatically create missing decks, and retry failed calls using exponential backoff bounded by configuration.
- **FR-010**: The system MUST return per-card results to the overlay showing added, duplicate, failed-image, failed-anki, or user-skipped statuses, and provide single-card retry and downloadable error reports.
- **FR-011**: The options page MUST let users adjust detection heuristics, HTML allowlists, media download policies, shortcut keys, clipboard access, and site-level permissions with immediate persistence.
- **FR-012**: User preferences and logs MUST be stored locally (sync or local storage as appropriate), and the feature MUST avoid transmitting captured content or metadata to remote services.
- **FR-013**: The system MUST retain an operation log for at least the last ten captures, including timestamps, source URLs, counts of added and skipped cards, and any unresolved errors for diagnostics.
- **FR-014**: When automated detection cannot produce a question/answer pair, the system MUST offer a manual selection tool so users can designate front and back content before submitting.

### Key Entities *(include if feature involves data)*

- **SelectionCapture**: Represents a single user-initiated capture, storing source URL, timestamp, cleaned HTML, media references, and active configuration snapshot.
- **CandidateCard**: Represents one potential Anki note with front/back content, confidence score, selection state, deduplication hash, and submission status.
- **MediaAsset**: Tracks a referenced media file with source URL, normalized filename, download state, and any error details.
- **UserPreferences**: Stores user-selected defaults such as deck, model, tag template, heuristic toggles, media policies, and shortcut assignments.
- **SyncStatus**: Captures the current AnkiConnect availability, whitelist status, retry counters, and last error surfaced to the user.

### Assumptions

- Users run the Anki desktop application with the AnkiConnect add-on enabled and are willing to whitelist the extension ID when prompted.
- Target environments are Chromium-based desktop browsers that support Manifest V3 service workers, context menus, and content scripts.
- Users accept granting host permissions required for media retrieval, and downloaded assets remain within Anki's local media directories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability tests across ten representative content sources, at least 90% of clipping sessions automatically surface a correct question/answer pair without manual segmentation.
- **SC-002**: For standard single-selection captures under 2,000 words, users can complete selection, review, and submission in under 30 seconds on average.
- **SC-003**: 95% of external images referenced in submitted cards are successfully stored and relinked locally on the first attempt, with the remainder clearly reported for retry.
- **SC-004**: 100% of failed AnkiConnect interactions or validation errors present actionable messages with retry guidance, and no capture session is lost without an offered recovery path.

