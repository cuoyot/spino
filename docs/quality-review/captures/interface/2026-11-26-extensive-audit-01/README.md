# Extensive interface audit — responsive browser evidence

Date: 26 November 2026. Status: review evidence supporting **unaccepted proposals**; no application implementation change.

See the [32-proposal report](../../../interface-audit-2026-11-26.md) for findings, accepted-design constraints, priorities and acceptance tasks.

## Provenance and isolation

Reference: SPino **6.2.4-beta.1 / versionCode 129**, source `559c7949a0f180e36c826468daf59d2709b68f3c`. An isolated Git archive at `/private/tmp/spino-ui-audit-20261126` was built with the installed dependencies and bundled Node 24. The final [production build log](build.log) records success. This does not claim binary equality with a distributed APK/AAB or a fresh remote-publication verification.

The preview server listens on `127.0.0.1:5376`; its [source](review-server.mjs) and [synthetic fixtures](fixtures.json) are retained. The browser uses a dedicated origin and `ui-audit-20261126-` IndexedDB prefix, with a fixed browser date of 26 November 2026. The populated fixture contains synthetic works, two synthetic score assets, saved sessions and events. Empty and older unfinished-practice fixtures exercise first use and recovery. No installed notebook or personal media is used.

The original main checkout is older and dirty. Its pre-existing edits/deletions and the active repertoire worktree were preserved. Application source was reviewed from the isolated beta129 export. Only the new audit/evidence and review-index additions belong to this task.

## Capture inventory

**104 PNGs retained; 101 match requested viewport dimensions.**

- [baseline.json](baseline.json): 48 main-screen captures and page geometry/compact-target measurements. Six routes × two themes × four layouts. Phone portrait 390×844; phone landscape 844×390; tablet portrait 768×1024; tablet landscape 1024×768.
- [flows.json](flows.json): 55 further captures including empty, narrow 320×640, pending, forms and child flows. These are representative states, not an exhaustive test of every branch. One additional initial Today capture is retained.
- [manifest.json](manifest.json): source/build/fixture hashes, screenshot dimensions/hashes and explicit exclusions.
- `*.ax.txt` and `*.dom.txt`: captured accessibility/DOM observations. Some immediate native accessibility snapshots lagged a dialog transition; later DOM snapshots and the corresponding screenshot provide the final state. Do not treat a transient tree as a completed interaction.
- [browser-warnings.json](browser-warnings.json): observed browser warnings, including unavailable Web MIDI permission and the initial score-worker review-server setup issue. No clean-console certification is claimed.

No page-level horizontal overflow was measured in the **48 main-screen baselines**. Intentional internal horizontal stand/appointment strips remain; this result does not establish that every dialog or larger-text state is free of overflow. Small-target measurements are observations using a project inspection threshold, not an accessibility-standard compliance verdict.

## Visual contact sheets

- [Light phone portrait](contact-light-phone-portrait.jpg), [dark phone portrait](contact-dark-phone-portrait.jpg).
- [Light phone landscape](contact-light-phone-landscape.jpg), [dark phone landscape](contact-dark-phone-landscape.jpg).
- [Light tablet portrait](contact-light-tablet-portrait.jpg), [dark tablet portrait](contact-dark-tablet-portrait.jpg).
- [Light tablet landscape](contact-light-tablet-landscape.jpg), [dark tablet landscape](contact-dark-tablet-landscape.jpg).
- [Preparation, piece selection and forms](contact-flows-setup.jpg).
- [Work, catalogue, multimedia, Progress and preferences](contact-flows-information.jpg).
- [Empty and pending states](contact-flows-empty.jpg).

Contact sheets are scaled for comparison; use original PNGs for text size and detailed visual assessment.

## Limitations and preserved diagnostic frames

The following files do not match the requested viewport and are **excluded from responsive visual acceptance**:

- `flow-session-overview.png`: 390×219, captured while automatically entering the score overlay; `flow-session-overview-ready.png` is the subsequent ordinary overview.
- `flow-pdf-reader.png`: 390×219, browser score/fullscreen capture mismatch despite reported 390×844 DOM viewport.
- `flow-generated-paused-phone-landscape.png`: 180×390, orientation/capture mismatch during the generated reader's orientation handling.

An initial PDF read error came from the review server omitting the `.mjs` JavaScript content type. The server was corrected; the synthetic score then reported page 1 of 2. Preserve the earlier snapshots as diagnostic history. They do not establish a production PDF defect. A later score-tool click also hit a browser input timeout; annotation editing is not newly accepted by this run.

Other generated-reader portrait/tablet observations and their DOM snapshots remain useful, but this run does not establish complete native score/orientation behavior. Runtime accessibility text revealed unnamed playable keys; the beta129 `src/main.js` keyboard renderer confirms that names are absent except for visible C labels.

The fixed synthetic browser date is appropriate for layout/date consistency; it is not a timing test. No conclusions about timer accuracy, MIDI latency, audio rendering or synchronization timing derive from it.

## Reproduction

Export the recorded commit into an isolated writable directory, including `src`, `public`, `Exercises_Library`, `plugins`, `assets/brand`, package/build files and the documentation imported by `about-view.js`. Use compatible installed dependencies and a current Node runtime, then run the normal Vite production build. Copy this run's `review-server.mjs` to the export root and start it from there. It imports fixture helpers from that commit's `tests` and `scripts/review` trees.

Open `http://127.0.0.1:5376/?route=home` in the Codex in-app browser. `route` supports the existing action names used by the harness: `home`, `practice`, `calendar`, `piano`, `progress`, `settings`; `fixture=empty` or `fixture=pending` changes synthetic state; `theme=dark` changes the fixture theme; `lang` selects the UI language. Navigation to a harness URL intentionally reseeds only this disposable namespace. Interact through the visible UI for child states. `/review?w=390&h=844` is an optional iframe wrapper; the saved matrix uses direct pages and the documented browser viewport capability.

Application source, UI behavior, stable notebook IDs and saved-session rendering were not modified. No APK was built, no emulator data was touched, and no publication or native-device acceptance is claimed. The manual remains unchanged because the proposed improvements are not available features.
