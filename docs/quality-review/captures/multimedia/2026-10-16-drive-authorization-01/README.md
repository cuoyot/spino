# Drive authorization correction — local review

October 16, 2026. Native Android emulator evidence, using disposable namespaced notebooks; no real Google account is authorized. This is a same-version beta8/build61 correction and has not been published.

The native bridge now checks the scope URI string returned by Google rather than a Scope object. Three tests construct actual SDK AuthorizationResult objects and cover accepted grants, missing/different scopes, and missing/empty tokens. Ten synthetic transfer protocol tests pass.

[Native checks](native.json) verify replacement installation, Profile navigation, original logical-store retention, 13 unchanged immutable media blobs and bounded transfer operations. [Build/source verification](verification.json) records the APK/source hashes, packaged-web comparison and foreground after the final relaunch. The screenshots show the emulator review screen, not successful Google consent. No responsive-browser evidence is added for this native-only fix. Real consent and physical two-device transfer/playback remain open.
