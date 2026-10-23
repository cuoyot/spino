# Repository collaboration

Preserve existing uncommitted work, stable record IDs, notebook progress, PDFs and annotations. Use English for new documentation, comments, default UI copy and operational messages; preserve existing translations, original musical titles and user-entered text.

## Shared saved-session design

Render every saved-session summary through `src/companion/saved-session-card.js` and its shared stylesheet. Progress, work history, Today, Calendar, completed lesson results and history/result dialogs must inherit design changes from this component. Keep contextual fields (worked passages, plan time and notes) within the shared card. Planned and active practice flows retain their own controls.

## Product review continuity

For screen-by-screen quality review work, start with:

- `docs/quality-review/README.md` for the current focus and next action.
- `docs/quality-review/decisions.md` for accepted and proposed decisions.
- `docs/quality-review/screen-inventory.md` for surface IDs, coverage and shared components.
- The active screen's review and `docs/manual/index.json`.

Keep the review state current across sessions. Distinguish an accepted screen objective from a proposed layout or unverified implementation. When a decision affects a shared component, check earlier reviewed screens and reopen their evidence where necessary. Reflect verified behavior in the manual; do not describe proposed features as available.

Capture representative states in phone/tablet portrait/landscape using disposable synthetic notebooks. Keep dated evidence runs, fixtures and build/source information. Do not overwrite previous baseline images or use the installed personal notebook as test data. Label responsive browser captures separately from native-device acceptance.

The user's current instructions and previously authorized actions govern the scope of each turn. These notes preserve continuity; they do not add a separate approval requirement.

## Review handoff

Whenever a new Android APK is built for review, install it on the existing emulator, launch the app and confirm that its activity is in the foreground. Preserve the emulator's notebook and other user data; use replacement installation rather than clearing application storage.

For changes that can be reviewed faithfully in the browser, open the current browser build for immediate feedback. State clearly whether the presented result is a responsive browser review or native-emulator evidence.

## Release handoff

For every release delivery, present these items first, in this order:

1. The version name and Android versionCode.
2. A direct link to the signed AAB.
3. Release notes ready to paste into Play Console, enclosed in locale tags such as `<es-ES>`, `<en-US>` and `<ca>`, with at most 500 characters per locale.

Provide the tagged release notes as a standalone text file and include that same file in the Play Console handoff ZIP. Separate per-language files may also be included, but do not replace the combined tagged block. Put APK links, screenshots, validation and other delivery details after these primary items.

## Website deployment

Follow `docs/website-deployment.md` for every requested website publication. Wrangler is authorized for the existing SPino account and Worker; reuse its stored session and do not request the same permission again. Deploy the exact reviewed commit from an isolated export, preserve concurrent work, and verify the current Cloudflare version and public content. A Git push alone does not prove publication. If a newer deployment already includes the changes, verify it instead of overwriting it.

For release operations, use the Codex in-app browser. Do not use the owner’s Chrome browser.
