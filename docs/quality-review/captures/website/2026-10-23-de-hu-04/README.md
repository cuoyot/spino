# German and Hungarian language evidence — 23 October 2026

Status: verified in responsive browsers; prepared for the next release. This is not native-device acceptance or evidence of publication.

## Scope

The app and main website support English, Spanish, Catalan, German and Hungarian. The app language is retained after reload and also selects the reader language. New translations were authored directly. Original musical titles, stable record IDs and user-entered text are preserved. App About and backup copy describe stable releases without beta/trial branding. Technical backup compatibility identifiers remain intact.

## Evidence

- `capture.json`: 80 app frames across all five languages, with source and build hashes. Includes nine phone surfaces, three catalogue states and four reader orientations per language.
- `profile/`: ten German/Hungarian profile and About frames, including phone/tablet portrait/landscape.
- `site/`: eight German/Hungarian website frames at 390×844, 844×390, 768×1024 and 1024×768.
- `verification.json`: completed checks and publication boundaries.

All captures use disposable synthetic notebooks. Existing baselines and personal notebooks were preserved. Run 04 is the selected final evidence; earlier runs remain available for traceability.

## Validation

52 focused unit/site checks and two browser checks pass. The production app and website builds pass. Browser checks cover language selection and persistence, unchanged user text, reader language, responsive profile/site layouts, website language navigation and the explicitly English Arcade destination. The separate Arcade product retains its existing languages.

## Release handoff

See [the next-release handoff](../../../../play-store/2026-10-23-languages/README.md) for screenshot paths and tagged release notes. No version increment, Android package, Play Console upload or website deployment was performed for this evidence run. Refresh screenshots if the release build differs. Use the Codex in-app browser for release operations, not the owner's Chrome.
