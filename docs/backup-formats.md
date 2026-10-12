# Portable notebook copies

The installed notebook schema remains version 1. Shared cloud synchronization uses `cuaderno-piano` JSON version 1. QR identity is additive `cloudBackup.sharedNotebookId` metadata; it is not cloud authentication. Record/asset/annotation IDs are never regenerated during linking or conversion.

Manual copy format 1 is the existing self-contained JSON with `data`, `assets`, `legacy` and optional `library`. Format 2 is a `spino-backup` JSON container with `version: 2`, `dataVersion: 1` and `minimumReader: 6.0.0-beta.3`:

- `notebook`: preferences, practice history, plans, routines, events and retained session state.
- `repertoire`: original works and downloads, including their stable asset references.
- `scores`: asset metadata and complete base64 score bytes.
- `annotations`: annotation payloads indexed by the original `assetId`.
- `scoreViews`: orientation-specific score views indexed by the original `assetId`.
- `legacy` and optional `library`: preserved reader/catalogue state.

One JSON file is deliberate: users do not have to transfer an adjacent directory or missing attachment files. No files are extracted to a filesystem path during restoration. A separate-folder/ZIP package is not implemented or advertised.

The compatible copy is the default. Writing format 2 requires an explicit acknowledgement that earlier apps cannot read it. Conversion is a new file, never an in-place rewrite. Both representations validate against the same supported notebook model before export or restoration, with a 60 MB limit, stable references and unique annotations/view associations. Restoration previews counts and conversion before the existing explicit replacement confirmation. Unsupported future container/data versions are refused before data mutation.

When changing notebook schema or cloud format in future, introduce an explicit supported-version contract and reviewed migration, preserve the original recovery copy, and show the old-client incompatibility warning before changing a shared file. Do not infer a migration for unknown future formats. This release does not upgrade the shared file/data format; choosing a manual format 2 copy does not disable older clients' format 1 synchronization. An older client may remove additive QR identity metadata; the next current-client sync restores its retained identity, and the new device must select the updated uploaded file.
