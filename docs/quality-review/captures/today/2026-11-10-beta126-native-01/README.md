# Beta126 Android installation and synthetic Today smoke check

Reviewed source: 300d4e9bd7cd312f80c034f8ea9d1cf07db43df7. Signed release packaging and replacement installation retain all 140 pre-launch IndexedDB files unchanged; the beta activity is confirmed in the foreground. See the release validation manifest.

The restored emulator snapshot showed an unrelated Digital Wellbeing ANR. After cold boot without clearing storage, reading an existing large IndexedDB value from the original emulator notebook failed. No original records, assets or files were cleared or repaired. This prevents claiming successful original-notebook visual acceptance.

The installed APK opens and renders Today with a separate disposable namespace (`spino-beta126-release-review-`) and the shared synthetic Today fixture, injected before bootstrap via DevTools. The screenshot and DOM check verify the weekly total and vertical blue-to-green bars in the actual Android WebView. The namespace is temporary instrumentation and is not included in the APK. Physical-device, original-notebook recovery and recipient-app acceptance remain open.
