# Google Drive media feasibility check

October 16, 2026. The owner selected each user's own Drive with no additional SPino subscription, authorized implementation of the feasibility check, and requested website beta delivery for two-device testing.

Website beta7/build60 is published. [Public download verification](releases/6.1.0-beta.7-publication.json) and [native retention/foreground evidence](quality-review/captures/multimedia/2026-10-16-drive-poc-03/native.json) are separate from the still-pending real Google consent and physical two-device transfer test.

## OAuth registration

The owner supplied Android client ID `198855026005-vml3cg5tkolqib1lmaft4f5iscvvmel7.apps.googleusercontent.com`. It is a public application identifier, not an access token. The observed Console project was `wired-name-183215`; project ownership/configuration has not been independently verified. Android AuthorizationClient identifies the application from its installed package and signing certificate; this Android ID must not be passed as a web/server client ID or embedded with a client secret.

Beta package: `com.miguecoll.spino.beta`. Current local debug signing SHA-1: `73:76:4B:65:8E:94:CA:3D:75:D9:8B:EB:EC:D5:B7:90:AF:82:BD:23`. The new beta must retain this certificate. Required scope: `https://www.googleapis.com/auth/drive.file`. Enable Drive API and list each test Google account under External → Testing → Test users. The same Google account must be used on both devices for this check. The project is the app registration; it is not shared storage for users.

## Two-device test

1. Replacement-install website Android beta7/build60 on both devices. Finish any active practice/recording, then open Profile → Google Drive transfer check.
2. Keep the same default test notebook code on both devices. It is an isolation label, not a password or account authorization.
3. On device A, press Connect with Google and grant Drive access to your test account. Press Upload test recording. Only the bundled synthetic tone is selected; the notebook and personal media stores are not opened by the isolated page.
4. On device B, connect the same Google account, press Find test recordings, then Download and verify. Press Play. The recording should last two minutes and show a complete timeline.
5. To test interruption, turn off connectivity during a transfer and retry after reconnecting. The same take/file ID and native private transfer state are retained; if the final response was lost, retry checks the preallocated file ID before uploading again.
6. Use Return to SPino to leave the check. Synthetic Drive files remain in the selected account; there is no remote-delete operation in this prototype.

To launch the isolated page directly without initializing the installed notebook:

```sh
adb shell am force-stop com.miguecoll.spino.beta
adb shell am start -n com.miguecoll.spino.beta/com.miguecoll.spino.MainActivity --es spinoReview drive-media
```

Browser review: `/drive-media-review.html?demo=1` is an explicitly labeled in-memory simulation. Browser/iOS real authorization is not configured. Native connect/request/download methods reject non-debug builds. The normal profile entry is present only for Android beta versions; stable public use requires dedicated production integration.

## Implementation boundaries

The sidecar transport preserves a stable take ID and preallocated Drive file ID, uses account/notebook-scoped private resumable state, and publishes only completed objects with matching checksums and notebook identity. It uses an isolated `poc1` marker, not the production media store. Android stages source bytes in chunks of at most 256 KiB and hashes/streams private files; network uploads read ranges directly from these files. Downloads resume into a private partial file, verify size/checksum and become playable only after verification. Entire recordings and OAuth tokens do not travel through the Capacitor bridge as base64. Access tokens remain native memory; Google SDK handles consent/token caching. Session URLs are retained only in native private preferences. Existing local media and notebook schemas are unchanged.

Still required before real multimedia rollout: native two-device Google acceptance, near-limit transfers, actual authorization expiry/cancel/account-switch behavior, immutable metadata operations for concurrent edits/deletion, durable automatic scheduling, notebook binding and explicit legacy take migration, storage retention/cleanup policy, and production iOS/web authorization if those platforms are in scope. Personal recordings must not be silently uploaded by this prototype.

## Enable access for other users

After the native test succeeds, keep the Google Auth audience External and change Publishing status from Testing to In production. Complete Branding, verified website/domain ownership, current privacy policy and any required Google basic OAuth/brand verification. `drive.file` is non-sensitive and avoids restricted Drive access, but does not exempt the app from applicable verification. Do not request unrestricted `drive` access for this feature. Remove test-user-only instructions only after unrestricted consent is verified with an unrelated account.

Register the stable Android package `com.miguecoll.spino` with the actual distribution certificate. Google Play's app-signing certificate may differ from a sideloaded release or the upload key; create the appropriate OAuth registrations in the same project for each distributed package/certificate. Beta debug registration alone does not authorize a Play production build. Additional users sign in to their own accounts and consume their own Drive storage. Monitor project API quotas; do not enable billing or paid resources implicitly.

Official references: [Android authorization](https://developer.android.com/identity/authorization), [OAuth consent](https://developers.google.com/workspace/guides/configure-oauth-consent), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [resumable uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

## Proposed follow-up: tablet score with phone camera

The owner wants to read a score on a tablet while recording video with SPino on a nearby phone. This objective is requested; the following UX and transport remain proposals, not implemented beta7 features.

Use the tablet as session controller and the phone as an explicitly armed camera. Pair locally using a QR/session identifier plus authenticated connection confirmation. The phone selects its camera and framing and confirms readiness. The tablet sends idempotent start/stop commands with a unique take ID and notebook/work/session identity. Show Recording only after the phone acknowledges actual capture; a shared countdown follows camera readiness. Record locally at full quality on the phone. Confirm finalization and checksum before presenting the take as saved, then use the Drive transport for later availability and optional downloads. Reading the score should not require live video streaming or a cloud round trip for each command.

For nearby Android devices, evaluate Nearby Connections as the first native transport candidate. Its encrypted offline peer-to-peer channel supports small control messages, file transfers and authenticated pairing; Google documents Bluetooth/BLE/Wi-Fi transport underneath. A native feasibility test must check permissions, latency and reconnection on the target devices. The SDK's documented usage diagnostics must be assessed against SPino's privacy commitments before adoption; it is not yet an accepted dependency. [Overview and data collection](https://developers.google.com/nearby/connections/overview), [connection authentication](https://developers.google.com/nearby/connections/android/manage-connections).

Loss of the control link must not discard a take: keep recording locally on the phone, retain a manual Stop action there, show disconnected/recording-unknown on the tablet and reconcile the take/state on reconnection. Deduplicate repeated start/stop commands. Do not treat wall clocks as synchronized; map capture time and practice markers with an estimated monotonic-clock offset and record the actual capture-start acknowledgment. For initial delivery keep the phone in the foreground with explicit camera consent; locked/background capture needs a separate native lifecycle design. [Android camera foreground-service restrictions](https://developer.android.com/develop/background-work/services/fgs/service-types).
