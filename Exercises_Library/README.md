# Public repertoire library for Sightreader · v2

A catalogue, data contract and integration package for the existing `Exercises_Library` directory. Research date: **30 September 2026**. JSON files use UTF-8 and JSON Schema 2020-12.

**Base language: English**, declared as `base_language: "en"` in `library.json`. Documentation, integration instructions, editorial labels, notes and operational text are in English. Composer names, original work/collection titles, source filenames, URLs and quoted source metadata retain their original language for accurate attribution. English display labels are editorial translations, not claims about original titles.

## What is actually included

| Group | Records | What they represent | Initial state |
|---|---:|---|---|
| Main piano/keyboard repertoire | 563 | Individually enumerated works or exercises | Catalogue; score acquisition pending |
| Piano MusicXML candidates | 55 | Actual MuseTrainer MXL editions/files | Asset located; identity, rights and analysis pending |
| Optional OpenScore Lieder | 1,462 | Song editions with accompaniment | MXL located; piano selection and analysis pending |
| Total | 2,080 | Explicit mixture of works and editions | **0 downloaded scores; 0 playable pieces** |

The 55 candidates may include multiple versions of the same work. The lieder are not 1,462 solo piano pieces. Do not add these records together to advertise a count of unique works. The root index contains exact counts by category.

There are 1,517 MXL paths verified against actual GitHub trees and pinned to specific revisions. HTTP HEAD checks also succeeded for all 55 piano candidates and a sample of 12 lieder: 67/67. No score payload was downloaded or analyzed. Individual results and original check timestamps are in `reports/link-checks.json`; this language revision did not repeat the network checks.

### Main repertoire

| Manifest | Entries |
|---|---:|
| Czerny Op.821 | 160 |
| Czerny Op.161 | 48 |
| Chaulieu **Jr.** Op.9 | 24 |
| Czerny Op.139 | 100 |
| Burgmüller Op.100 | 25 |
| Schumann Op.68 | 43 |
| Duvernoy Op.176 | 25 |
| Tchaikovsky Op.39 | 24 |
| Gurlitt Op.117 | 34 |
| Bach, Inventions and Sinfonias BWV 772–801 | 30 |
| Clementi Op.43, selection from the available contents list | 50 |

Every entry is a separate object in `pieces`, with a stable ID and bibliographic evidence. Numbered collections are enumerated from their documented contents/counts: **individual scores have not been inspected**. Generic labels such as “Study 12” are editorial labels, not invented original titles. Exercise numbers do not establish sight-reading difficulty.

Clementi requires special care: the consulted contents list is partial and includes **25 preludes, 24 exercises and one Grand Exercise**. These are not “24 prelude/exercise pairs”, and the package does not claim to cover all historical contents of Op.43. IDs combine key, type and ordinal within the section. `source_reported_key` preserves the bibliographic information; analyzed key remains `null`.

## Copying and integration

1. Copy **the contents of this folder** into the app's existing `Exercises_Library`. Avoid nesting `Exercises_Library/Exercises_Library`.
2. If names already exist, compare and merge; retain existing work and valid assets. Do not blindly replace app files.
3. Give `INTEGRATION_PROMPT.md` to the development agent. It contains the complete integration request.
4. Use `library.json` as the entry point. Resolve paths relative to this folder, load each enabled manifest and iterate through **all** its `pieces`.
5. Show the **618 records enabled by default**: 563 main works and 55 candidates. OpenScore is disabled by default; enable both its manifest descriptor and source configuration when adding it.
6. Importing catalogue records does not require a download URL, MusicXML, completed analysis or approved edition rights. Those requirements apply to acquisition, publication or practice, not to retaining bibliographic records.

Write pipeline outputs to `analysis/`, `assets/`, `segments/` and app storage. Keep input manifests as provenance snapshots. When updating a manifest, regenerate its hash and the counts in `library.json`.

### Replacing the earlier Spanish package

This English revision preserves all 2,080 record IDs, canonical-work links, assets, URLs, source metadata, analysis placeholders and availability states. It updates editorial text and manifest hashes and adds the explicit base language. Use IDs for updates; do not treat translated display labels as new records. Merge with any app-side work completed since the earlier package.

## Layout

```text
Exercises_Library/
  library.json                  # Index, language, paths, hashes and counts
  README.md
  INTEGRATION_PROMPT.md          # Development-agent instructions
  config/
    sources.json                # Sources and acquisition strategies
    ingestion.json              # Processing limits and options
  manifests/
    czerny_op821.json            # Plus ten other main-repertoire manifests
    musicxml_piano_candidates.json
    optional/openscore_lieder.json
  schemas/                      # Nine schemas; URN references, no network
  provenance/
    evidence.json               # Bibliographic and license evidence
    musetrainer.inventory.json   # Observed paths, revision, blobs and sizes
    openscore.inventory.json
    exclusions.json             # 14 excluded MuseTrainer files
    OpenScore-CC0-1.0.txt
  docs/
    DATA_CONTRACT.md
    PIPELINE.md
    SOURCES_AND_LICENSES.md
    ACCEPTANCE.md
  examples/
    piece.pending.json
    segment.pending.json        # Template, not an extracted segment
  assets/raw/                   # Reserved for original score files
  assets/normalized/            # Reserved for normalized MusicXML
  analysis/                     # Reserved for analyses by asset/hash
  segments/index.json           # Empty until actual segments are extracted
  reports/
    validation.json
    link-checks.json
  scripts/
    package.json
    package-lock.json
    validate.mjs
    check-links.mjs
```

## Reproducible validation

Requires Node.js 20 or later. From `Exercises_Library/scripts`:

```sh
npm ci --ignore-scripts
npm run validate
npm run check-links
# Optional: HTTP HEAD checks for all 1,517 assets; requires network access:
node check-links.mjs --all
```

Local validation checks JSON syntax, schemas, IDs, references, manifest hashes, paths against repository inventories, states and counts. Negative checks ensure that an empty record cannot claim to be playable and a pending segment cannot claim to be ready.

`check-links` uses HEAD: it does not download scores or certify content or rights. `git_blob_sha1` values identify repository blobs; they are not file SHA-256 checksums. Compute each score's SHA-256 when downloading it. Schema `$id` values are identifying URNs, not download URLs.

## Preventing the “only two pieces appear” problem

The interface must distinguish **catalogue**, **asset available**, **analysis pending** and **ready to practice**. Filtering the initial import by downloaded MXL or `playable=true` would make this package appear empty. The catalogue and playable library are views of the same records and their states. Display both counts and explain blocked states; never silently discard records.

The next stage is score acquisition and validation. This package provides the catalogue and pipeline contract; it does not pretend that hundreds of missing scores are already available.
