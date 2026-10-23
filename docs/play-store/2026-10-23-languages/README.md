# German and Hungarian launch preparation

German (`de-DE`, app `de`) and Hungarian (`hu-HU`, app `hu`) are implemented alongside English, Spanish and Catalan. Website routes are `/de/` and `/hu/`. This is local source preparation; no version bump, Android package, Play submission or website publication is part of this change.

The directly authored UI source is `scripts/i18n/new-languages.txt`; compile it with `node scripts/i18n/build-locales.mjs`. No external translation service was used for these dictionaries. Notebook content, musical titles and record identifiers remain unchanged.

## Screenshots

The final run is `docs/quality-review/captures/website/2026-10-23-de-hu-04/`. Its `capture.json` records the source revision, current-source hashes, build identity and 80 frame hashes. All five languages have nine phone product screens, three catalogue states and reading captures in phone/tablet portrait/landscape. Phone images are 1080×1920. Additional `profile/` and `site/` images cover the new locales in four responsive layouts. All notebooks and demo audio are synthetic. These are responsive browser captures, not native-device acceptance.

`screenshots.json` identifies phone images ready for the next localized Play listing update. Original previous capture runs are retained. Runs 01–03 are superseded development evidence; use run 04.

## At the next authorized release

1. Keep English, Spanish and Catalan listings and add German and Hungarian listings. Use the locale mapping in `screenshots.json` and the dated phone screenshots; refresh them if the packaged UI differs.
2. Rebuild the app with the reviewed localization source. Run language persistence/reader checks, then perform native review. If building a review APK, replacement-install on the existing emulator, retain all app data, launch and confirm foreground activity.
3. Use `release-notes.txt` as the combined tagged localization notes, adapting them to the complete release scope. Include this same file in the Play handoff ZIP. Set the actual version name/code only when packaging.
4. Refresh the website release version, summaries and screenshot provenance to match the package. Follow `docs/website-deployment.md` and deploy the exact reviewed commit from an isolated export; verify Cloudflare and public pages. Do not publish five-language availability ahead of its app release.
5. Use the Codex in-app browser for release/Play Console operations, never the owner's Chrome browser.

This checklist is a handoff for a future release, not a scheduled or unattended publication.
