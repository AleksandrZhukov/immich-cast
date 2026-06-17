# Exclude Photo from Slideshow — Design

**Date:** 2026-06-17
**Status:** Approved, pending implementation plan

## Problem

Alongside the existing "archive photo" action, we want a second action: **exclude a
photo from the slideshow**. This is for photos that are otherwise fine — we just don't
want them appearing on the Nest Hub. Archiving changes the photo's state in Immich
(`visibility: 'archive'`); exclusion must NOT — it's purely a local, app-specific
preference.

Immich has no custom flag for "show this in Immich but not in this slideshow", so we
need our own persisted list of excluded asset IDs plus a filter step in the slide
pipeline.

## Decisions

- **Trigger UX:** Keep the existing 700ms long-press gesture. The confirmation dialog
  becomes a two-action dialog: **Archive** and **Exclude from slideshow** (plus Cancel).
- **Reversibility:** No management UI. Exclusions persist to a human-editable JSON file;
  un-excluding is done by hand-editing the file. (Acceptable because excludes are rare.)
- **Storage:** A single JSON file, `data/excluded.json`, loaded into an in-memory `Set`
  at startup and rewritten on each change. Chosen over JSONL (clumsy to hand-edit for
  removal) and SQLite (overkill; project has no DB).
- **Immich:** Exclusion never calls Immich. No per-owner API key lookup needed (unlike
  archive).

## Architecture

### 1. Persistence module — `src/api/utils/excludedImages.ts`

New module mirroring the existing in-memory `imageHistory` pattern, but persisted.

- On first use / startup: read `data/excluded.json`. Expected shape:
  `[{ "id": "<assetId>", "excludedAt": "<ISO timestamp>" }, ...]`.
  Hydrate an in-memory `Set<string>` of ids.
- Missing or corrupt file → start with an empty set; do not crash (same resilience as the
  stats reader, which skips malformed JSONL lines).
- API:
  - `isExcluded(id: string): boolean` — set membership check.
  - `exclude(id: string): Promise<void>` — add to set (no-op if already present), then
    rewrite the whole file from the current set. Writes are rare (only on user action),
    so rewriting the full file is fine.
- The file is the source of truth on disk; the in-memory set is the read path so there is
  zero per-slide I/O.

### 2. Filter in the slide pipeline

The exclude filter runs **post-fetch**, in the same places `imageHistory` already
filters. Immich's `POST /search/random` does not support an exclusion list, so we drop
excluded assets after fetching.

- `src/api/services/slides.ts`, `fetchGeneralImages`: extend the existing filter from
  `!imageHistory.hasBeenShown(asset.id)` to also require `!isExcluded(asset.id)`.
- `src/api/utils/memoryDeck.ts`: skip excluded cards when dealing (filter the dealt
  cards by `!isExcluded(card.asset.id)`).

### 3. API endpoint — `src/api/routes/index.ts`

- `POST /api/images/:id/exclude` → `await exclude(id)`, return 200.
- No Immich call, no owner-key lookup, no error branches for Immich/Axios (unlike the
  archive route). Wrap the file write so a write failure returns 500.

### 4. Frontend

- `src/web/lib/ArchiveConfirmDialog.svelte` → generalize into a slide-action dialog with
  two action buttons (**Archive**, **Exclude from slideshow**) plus Cancel. Keep the
  component reusable; the parent decides what each button does.
- `src/web/lib/SlideItem.svelte`: the existing long-press emits the same "request action"
  event; the progress label "Hold to archive…" should be reworded to reflect the dialog
  now offers more than archive (e.g. "Hold for options…").
- `src/web/lib/ImageSlider.svelte`:
  - On "Exclude": `POST /api/images/:id/exclude`, then add the id to a local
    `excludedIds` set so the photo disappears immediately — mirroring how the existing
    flow adds to `archivedIds` after archiving.
  - Auto-advance pause/resume around the dialog stays as-is.

## Data flow

1. User long-presses a slide (700ms) → action dialog opens, auto-advance pauses.
2. User taps "Exclude from slideshow".
3. Frontend `POST /api/images/:id/exclude`.
4. Backend `exclude(id)` adds id to in-memory set and rewrites `data/excluded.json`.
5. Frontend adds id to local `excludedIds`, hides the slide, resumes auto-advance.
6. On subsequent `/api/slides` fetches, `isExcluded` drops the asset from both the
   general pool and the memory deck.

## Error handling

- Corrupt/missing `data/excluded.json` → empty set, log a warning, continue.
- File write failure on `exclude` → endpoint returns 500; frontend logs and leaves the
  slide visible (consistent with how archive failures are handled today — caught and
  logged, no local state change).

## Edge cases

- An excluded photo may still be fetched in a random batch and then dropped post-filter.
  Harmless — the batch is simply slightly smaller that round, identical to the existing
  `imageHistory` de-dup behavior.
- Excluding an already-excluded id is a no-op (set semantics).

## Testing

- `excludedImages`: hydrate from a valid file; tolerate missing file; tolerate corrupt
  file; `exclude` adds + persists; double-exclude is a no-op.
- Slide pipeline: excluded ids are filtered out of `fetchGeneralImages` and the memory
  deck deal.
- Endpoint: `POST /api/images/:id/exclude` persists and returns 200; write failure → 500.

## Out of scope

- Management/review UI for excluded photos.
- Undo toast.
- Syncing exclusions back to Immich.
