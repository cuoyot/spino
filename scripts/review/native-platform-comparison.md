# Native platform comparison runner

This testing tool replaces IndexedDB notebook/library/assets and legacy reader preferences on **disposable audit devices only**. It rejects Android AVDs not named `AuditPhone` / `AuditTablet` and iOS devices not named `SPino Audit …`. Never point it at an installed personal notebook. Stable fixture IDs are deliberately reused across layouts.

## Recorded run

The 2026-10-11 run uses the reviewed Android 5.2.7/code39 APK, API 34 / WebView 113, iPhone 18 Pro and iPad Air 11-inch M4 simulators on iOS 27. See `artifacts/platform-comparison/2026-10-11-native-01/manifest.json` for exact device IDs and hashes. The runner's target definitions identify those disposable devices.

Native screenshots include real system chrome. Android rotation uses the system setting; iOS rotation uses a test-only UIKit scene geometry request. DOM actions are automated in the actual WebViews. This is not a physical-device accessibility, keyboard, gesture, MIDI, provider or printing acceptance test.

## Temporary iOS container

1. Copy the repository's `ios` project into a temporary directory and preserve its native Capacitor configuration and local CloudBackup package reference. Symlink the repository's `plugins` directory where the copied project expects it.
2. Extract `assets/public/` from the verified Android APK into the temporary iOS project's `App/App/public/` folder. Compare hashes for every web file against the APK before building; this run verified 255/255 identical files.
3. Replace only the temporary project's `SceneDelegate.swift` with `platform-audit-ios.swift`. Add `NSAppTransportSecurity / NSAllowsLocalNetworking = true` to the temporary plist for the localhost command channel.
4. Build the temporary project for `iphonesimulator`, with a separate derived-data folder and `CODE_SIGNING_ALLOWED=NO`. Install it only on disposable audit simulators.
5. Launch with `SIMCTL_CHILD_SPINO_AUDIT_DEVICE=ios-phone` or `ios-tablet`. The simulator driver polls `http://127.0.0.1:8767`. Keep the production project and its startup workaround unchanged.

The driver leaves `isInspectable` disabled on the affected iOS 27 simulator, waits for startup, and then evaluates commands through WKWebView. It can cancel a document picker through its delegate; no cloud file is selected or saved by the runner.

## Capture and rebuild the gallery

Use Node 22 or newer, the SDK's `adb`, installed audit emulators and Xcode's `simctl`. Run one device per process when memory is limited. A different port can be used for Android while iOS retains port 8767.

```sh
AUDIT_TARGETS=ios-tablet AUDIT_RESUME=1 \
  AUDIT_FOLDER=artifacts/platform-comparison/2026-10-11-native-01 \
  node scripts/review/native-platform-comparison.mjs

python3 scripts/review/verify-platform-comparison.py \
  artifacts/platform-comparison/2026-10-11-native-01

node scripts/review/build-platform-comparison.mjs \
  artifacts/platform-comparison/2026-10-11-native-01
```

`AUDIT_CASES` is an optional scenario-ID regular expression; `AUDIT_ORIENTATIONS` accepts `portrait,landscape`; `AUDIT_PORT` changes the Android runner's local server port. `AUDIT_PROBE` evaluates a diagnostic expression without seeding a device. `AUDIT_RESUME` skips previously captured cells with nonempty PNG hashes; it retries blocked cells. Do not use resume when deliberately recapturing a scenario after changing its fixture or capture method.

The runner saves initial focus state, scroll frames, a top-of-content frame when a dialog initially scrolls down, and supplementary iOS frames after dismissing a keyboard/select popup. Native file pickers are photographed directly because the backgrounded Android WebView stops animation frames. Failure screenshots are retained and labelled separately from successful state capture.

The fixtures include a two-page PDF, independently generated MusicXML, saved generated-reader note streams, and explicitly mocked cloud-provider/transfer responses. Mock provider calls cannot reach real accounts. Compatibility cases ending in `-compat` inject a temporary `Promise.withResolvers` shim into the old Android page/worker; their blank PDF canvases are **not** a successful production fix.

Use the gallery, PNGs, control inventories, safe-area measurements, sampled PDF canvas pixels and paired measurements together. A valid PNG or completed render promise alone does not prove visible notation or functional acceptance. Keep prior dated baselines unchanged and record any remaining gaps in the quality review.

The runner refuses a pass whose actual viewport orientation does not match the requested orientation. For iPad on iOS 27, the audit-only container uses `UIRequiresFullScreen` for the landscape pass. Preserve raw framebuffer captures when normalizing their orientation for the gallery; record the transformation and both hashes.

The verifier requires Pillow, checks scenario completeness, actual viewport orientation, PNG dimensions and SHA-256 hashes, and preserves raw iPad landscape framebuffers under `diagnostics/raw-ipad-landscape/` before lossless clockwise rotation. `verification.json` reports errors explicitly.
