# SPino / Sightreader — repertoire package handoff

## Integration follow-up, 30 September 2026

The runtime integration is now implemented; see [the app integration guide](../docs/repertoire-integration.md) for current modules, validation and counts. All enabled v2 manifests load by stable ID into separate snapshots/execution state. The original two reviewed PDF entries and download adapter are preserved; MusicXML/MXL has a separate opt-in pipeline, analysis, review and manual viewer. The package itself still contains zero downloaded/analyzed/approved scores; diagnostic files stay outside it. The observations below describe the handoff baseline, not the current runtime.

## Original requested next step

The user asked to synchronize the English-base public-repertoire package with the work in this repository. The package has been placed in the existing **`Exercises_Library/`** directory, preserving its actual capitalization. Use this directory; do not create a second lowercase directory on case-sensitive systems.

Start with [INTEGRATION_PROMPT.md](INTEGRATION_PROMPT.md) and [README.md](README.md). All new package documentation, editorial labels and operational text use English. Original musical titles, names, source paths and metadata retain their source language. Stable IDs are unchanged from the earlier v2 package.

## Observed repository state, 30 September 2026

- The package name is `spino`, version 5.0.0, with Vite, Capacitor and VexFlow. Sightreader is the earlier project/repertoire-package name.
- `src/companion/catalog.js` exports `CATALOG_VERSION = 1` and a static `CATALOG` containing two reviewed Mutopia PDFs: `mutopia-75` and `mutopia-1612`.
- `src/companion/downloads.js` imports that array and calls `platform.downloadPDF`. It checks PDF bytes and stores PDF assets. It is not a general MusicXML/MXL ingestion pipeline.
- The repository README describes opt-in, serial, foreground-only downloads, Wi-Fi policy, PDF annotation preservation and stable catalogue IDs. Preserve those established behaviors.
- Existing app code and documentation contain extensive uncommitted work. This synchronization adds catalogue material and this handoff; it does not implement runtime ingestion or replace app modules.

The concrete reason for seeing two entries here is the current two-item static app catalogue. Do not claim that the app is already reading the new manifests or merely needs a count setting changed.

## Entry points for the development agent

| File | Role |
|---|---|
| `Exercises_Library/library.json` | New v2 catalogue index; English base language; manifest hashes and counts |
| `src/companion/catalog.js` | Existing reviewed PDF catalogue; retain its IDs and revision semantics |
| `src/companion/downloads.js` | Existing PDF-specific queue and update behavior |
| `src/companion/platform.js` | Browser/Android file, PDF and network adapters |
| `src/companion/model.js`, `store.js` | Persisted data, validation, transactions and backup compatibility |
| `src/companion/app.js`, `views.js` | Catalogue/repertoire presentation and orchestration |
| `src/main.js`, `music.js`, `render.js` | Interactive generated-reading engine; general MusicXML support remains separate work |

Implement a catalogue adapter and distinct availability states before enabling playback for new content. Existing PDFs remain viewable/manual-practice content; they are not automatically score-analyzed interactive exercises. Do not send MXL to `downloadPDF`, a PDF renderer or the generated-note engine without appropriate format support.

The package contains **563 canonical piano/keyboard works**, **55 candidate piano MXL editions**, and **1,462 optional accompaniment editions**. Its default enabled manifests contain **618 records**, excluding existing app catalogue entries. Do not blindly add the two existing PDFs to claim a unique-work count; reconcile editions/works using evidence. The package itself contains **zero downloaded, analyzed or playable scores**.

The acquisition settings in `config/ingestion.json` are pipeline defaults, not authorization to weaken the app's established user download policy. Preserve the app's serial, opt-in, foreground and network requirements. If a separate offline/build ingestion tool uses different limits, keep that explicit and independent of interactive downloads. Any new native download host must be reviewed and added deliberately.

## Legacy v1 migration

`sightreader_public_domain_manifest_v1.json` has been retained unchanged as historical input. The new root index references only v2 manifests. Do not scan the whole directory and import v1, examples, reports and v2 together.

The observed v1 Chaulieu IDs are key-based, for example `chaulieu_op9_c_major`, with `work.number=null`. New v2 IDs are ordinal, for example `chaulieu_jr_op9_001`. **There is no verified key-to-ordinal mapping.** Do not infer one from array order, the circle of fifths or ID spelling. Preserve old progress and add explicit aliases only when an edition verifies the match. Likewise, do not propagate v1 composer birth/death years into the Jr. attribution without independent evidence.

## What this sync establishes

The English package is present, validated and discoverable from the repository guide. The legacy seed and current app implementation remain intact. No app runtime import, score acquisition, analysis, database migration, commit or APK build is implied by this file. The next development step is the implementation described in `INTEGRATION_PROMPT.md`, adapted to the actual modules and constraints above.

For package validation, run `npm ci --ignore-scripts` then `npm run validate` from `Exercises_Library/scripts`. The validator's dependencies are isolated from the app package. The original HTTP HEAD evidence remains in `reports/link-checks.json` with its original timestamps; language synchronization did not repeat those requests.
