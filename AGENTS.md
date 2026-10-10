# Repository collaboration

Preserve existing uncommitted work, stable record IDs, notebook progress, PDFs and annotations. Use English for new documentation, comments, default UI copy and operational messages; preserve existing translations, original musical titles and user-entered text.

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
