# Sources, licenses and selection decisions

Structured evidence is in `provenance/evidence.json`; individual records reference it. No scores are redistributed in this package. Catalogue links document works; repository inventories document specific assets. This English revision preserves original names, titles, paths, URLs and license text.

## IMSLP: main repertoire

IMSLP provides bibliographic references for composers, collections and enumeration. Linked pages include editions labeled public domain, but may also contain modern arrangements, restricted editions or recordings with different licenses. `composition_status=public_domain_reported` records the source's claim; **it does not approve every file linked on the page**.

Each future asset needs edition, editor/transcriber, date and jurisdiction information where relevant. Do not apply a wiki page's license to a score or a recording's license to a PDF. Bibliographic facts and numbering are normalized; generic English display labels are editorial.

Corrections to the earlier approach:

- Chaulieu Op.9 follows IMSLP's attribution to **Charles Chaulieu Jr.**, without automatically identifying him as Charles Chaulieu senior.
- Czerny Op.821 has 160 entries. Its collection name refers to eight-measure exercises, but every edition's `measure_count` stays null until analyzed.
- Gurlitt Op.117 contains 34 pieces, not 20.
- Clementi Op.43 includes 50 elements from the available partial contents list. Bibliographic keys identify sections; no global numbering is invented.
- No Bach Notebook is claimed to be complete, and minuets from mixed-composer collections are not automatically attributed to Bach.

## MuseTrainer

[Repository](https://github.com/musetrainer/library). Its description states “Public domain MusicXML files”, but does not individually establish the rights of every arrangement. The package retains 55 files as **candidates requiring review**, with edition licenses set to null.

Fourteen files with especially uncertain identities, arrangements or attributions are excluded from the manifest; paths and reasons are retained in `provenance/exclusions.json`. These include titles related to Mariage d'Amour/Spring Waltz, G Minor Bach and others whose labels do not establish a freely usable work. This selection does not certify the remaining 55: per-asset review remains necessary.

Composer and key are not inferred from filenames as verified facts. Published titles remain source titles. Multiple versions of Für Elise, Clair de lune and other works remain separate editions pending reconciliation.

## OpenScore Lieder

[Repository](https://github.com/OpenScore/Lieder). Its README and LICENSE.txt declare CC0 for corpus transcriptions. A copy is included in `provenance/OpenScore-CC0-1.0.txt`. Preserve the requested credit: **OpenScore Lieder and contributors**.

The recorded revision contains 1,462 MXL files, individually enumerated by `lc…` ID. Although the README also discusses conversion from MSCX, this package links to **MXL files actually present in the observed tree**, not assumed future conversion outputs.

CC0 documents publication of these transcriptions; preserve any work, lyrics, arrangement or conflicting rights information found during acquisition. Do not automatically incorporate vocal parts into piano exercises. `edition_status=license_declared` does not mean `distribution_status=approved` for all countries and uses.

## PDMX: pending expansion

[Project and documentation](https://github.com/pnlong/PDMX). The project documents conflicts between internal licenses and public metadata and recommends `no_license_conflict`. It is a disabled future source with no invented individual paths. When incorporating it, record release version, original index row, license, conflicts and actual file; also filter for piano and duplicates.

## Verification scope

`repository_path_verified` means that path, size and Git blob SHA-1 appeared in a complete, non-truncated tree. Raw URLs were constructed only from those observed paths and commits. `reports/link-checks.json` adds HTTP HEAD evidence for 67 assets at the recorded timestamps. HTTP results alone do not establish rights or parseable MusicXML.

Third-party licenses retain their own scope. The package's schemas, tools and integration documentation grant no additional rights over compositions, arrangements, editions or corpora. Preserve these attributions alongside any derived library and record transformations and excerpts.
