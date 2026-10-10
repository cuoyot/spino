---
name: play-release
description: Prepare a new SPino version for Google Play — bump versionCode/versionName, run tests, write bilingual "What's new" notes, refresh screenshots and website if the UI changed, build the signed .aab and give the Play Console upload steps. Use when the user asks to publish, release, upload or ship a new version to Google Play (internal, closed or production track).
---

# Publish a new SPino version on Google Play

Reference: `docs/play-store/README.md` (full process), `docs/play-store/listing.md` (store texts and
release notes), `docs/play-store/play-console-forms.md` (App content answers).

Arguments (optional): bump type `patch` (default) | `minor` | `major` | `x.y.z`, and the target track
(`internal` default, `closed`, `production`).

## Rules

* Never create, read, print or commit the upload key, `android/keystore.properties`, `*.jks`, `*.aab` or APKs.
  If `android/keystore.properties` is missing, stop and tell the user to run
  `powershell -ExecutionPolicy Bypass -File scripts\create-upload-key.ps1` themselves (it asks for a password).
* Never upload to Play Console or press *Roll out* / *Send for review* on the user's behalf: give the steps and
  let the user do it. Ask before any commit, tag or push.
* The repo is LF; edit files without normalising line endings (see AGENTS.md and memory notes).
* Preserve uncommitted work from other agents (Codex). Do not stash or reset.

## Steps

1. **State check**
   * `git status --short` and `git log --oneline -15`; note uncommitted changes and tell the user what will
     ship. Find the previous release with `git tag --list "play/*" --sort=-creatordate | head -1`; with no tag,
     use the last 20 commits.
   * Read current `versionCode`/`versionName` in `android/app/build.gradle`.

2. **Tests**: `npm test` (builds `dist/` and runs every test). A failure in the keyboard touch-zoom browser test
   may be a flake: rerun that file alone before calling it a regression. Stop on real failures.

3. **Bump version**: `node scripts/store/bump-version.mjs <bump>`. It raises `versionCode` by one (Play
   rejects a code it has seen) and sets `versionName` in `build.gradle`, `package.json` and `package-lock.json`.

4. **Release notes**: from the commits/diff since the previous release, write user-facing notes in Spanish and
   English (what changed for the pianist, no internal refactors), 3–5 bullets, max. 500 characters each.
   Replace the bodies of `<!-- field:es:notes -->` and `<!-- field:en:notes -->` in
   `docs/play-store/listing.md`. If a feature changed, update the matching lines of the full descriptions too.
   Run `node scripts/store/check-listing.mjs` until every field is `ok`.

5. **Policy re-check**: if the diff adds permissions (`android/app/src/main/AndroidManifest.xml`), network
   calls, accounts, analytics, ads or data leaving the device, update `play-console-forms.md` and
   `privacy-policy.html` (new effective date) and tell the user which Play Console declaration to revise.

6. **Screenshots and website** (only if visible UI changed, or the user asks):
   ```
   npm run build && node scripts/store/capture-play-screenshots.mjs es en
   node scripts/site/build-site.mjs
   ```
   Look at a few regenerated screenshots before accepting them. The site redeploys on push to `master`.

7. **Build the bundle** (PowerShell, sandbox disabled — Gradle needs it):
   ```
   powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1
   ```
   Output: `SPino-<versionName>-<versionCode>.aab` in the repo root (~17 MB). Confirm the file exists and its
   size. Send it to the user with SendUserFile (`display: attach`).

8. **Upload instructions** for the user (Play Console → SPino):
   * *Test and release → Testing → Internal testing* (or *Closed testing* / *Production*) → **Create new
     release** → upload the `.aab`.
   * Release name: `<versionName> (<versionCode>)`.
   * Release notes: paste, keeping the language tags,
     ```
     <es-ES>
     …es notes…
     </es-ES>
     <en-US>
     …en notes…
     </en-US>
     ```
   * If screenshots or texts changed: *Grow → Store presence → Main store listing* (es-ES) and *Manage
     translations* (en-US), with files from `docs/play-store/screenshots/<lang>/`.
   * **Next → Save → Roll out** (production: start with a staged rollout, e.g. 20 %). Personal accounts need
     the 12-tester / 14-day closed test before the first production release.

9. **Wrap up**: offer to commit the version bump, notes and any screenshots/site changes
   (`Release <versionName> (<versionCode>)`) and, once the user confirms the upload was accepted, tag it
   `play/<versionCode>` and push. Do not do either without a yes.
