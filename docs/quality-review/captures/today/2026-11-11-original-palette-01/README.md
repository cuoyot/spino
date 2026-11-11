# Today: restore the 9 November weekly palette

2026-11-11. Owner requests an APK and website publication following the historical Today audit. Only the weekly module receives local historical palette variables and gradients; global appearance and other Today surfaces stay current. The module's markup, calculations and interactions are unchanged.

The reference is published beta124 (`d0cdbf01`): white light card, dark `#282e38` card, vivid blue/green daily and weekly fills, blue current-day circle with white text, original text/track/marker colors and card shadow. `palette.json` records the effective computed CSS in both themes, including the unchanged outside practice button palette. Forty responsive browser frames cover four states and five layouts across light/dark themes. The three Today cases and four update-notice checks pass; Android's 15 checks pass.

Replacement installation retains 141 pre-launch IndexedDB files byte-for-byte and launches the beta activity in the foreground. The installed APK is visually checked in an isolated synthetic namespace: the original emulator notebook has the previously recorded large-value read failure and is neither cleared nor repaired. Native synthetic screenshot/DOM evidence distinguishes this from original-notebook and physical-device acceptance.

Packaging and public verification are recorded in the beta127 release manifests. The source revision and build hashes are in verification.json and package validation. Earlier browser baselines remain intact.
