# iOS parity follow-up — 2026-10-11

The owner requires iOS MIDI and notifications, approves corrections to PLATFORM-04 and PLATFORM-13, and chooses no Wi-Fi/metered-network restriction on iOS for PLATFORM-12. The dated comparison remains historical evidence; these changes are local source work, not a published release.

## Implemented changes

- **PLATFORM-04:** date/time controls explicitly fit their form column. WebKit's native appearance forces content-box sizing despite the author rule; an iOS WebKit appearance reset makes border-box sizing effective while retaining `type=date/time` ; native picker touch acceptance remains part of the device check.
- **PLATFORM-13:** landscape on-screen-keyboard practice offsets both sidebars, title, score and keyboard by the corresponding safe-area insets. Zero-inset Android geometry is preserved. The accepted sidebar objective remains unchanged.
- **PLATFORM-12:** iOS ignores the saved Wi-Fi-only preference in both download queues and both PDF/MusicXML transfer implementations. Downloads still require an internet connection. The toggle is hidden on iOS; the saved preference remains available on Android and is not rewritten.
- **PLATFORM-02/03:** the official `@capacitor/local-notifications` 8.3.1 plugin is registered on iOS. Appointment reminders use local time minus 15 minutes, request permission only through an explicit action, refresh on launch/resume, and update/cancel notifications when records change or are removed. Record IDs remain unchanged. Scheduling is serialized, unrelated local notifications are preserved, and the closest reminders use a conservative 64-pending-notification budget. Later reminders refresh when the app opens. Forms no longer label reminders as Android-only. Android retains its existing native scheduler.

## Validation and limits

- Production web build, Capacitor iOS sync, and the real iOS simulator build pass.
- 27 focused reminder/download/notebook checks, 24 profile/locale/library regression checks, and one isolated browser geometry check pass (52 total).
- The real iOS notification bridge reports `available=true`, permission `prompt`, and no pending notifications on the disposable iPhone. The Profile exposes Enable reminders. Permission acceptance and actual notification delivery while backgrounded/closed remain an explicit device test; no notification was sent to a personal device.
- Native phone captures verify planner/date geometry, safe-area controls, the removed Wi-Fi toggle, reminder controls and successful synthetic MusicXML acquisition with the saved Wi-Fi-only preference still enabled. Tablet captures verify date/time geometry in both orientations.
- [Targeted before/after evidence](../../artifacts/platform-comparison/2026-10-11-ios-fixes-01/index.html) and [verification metadata](../../artifacts/platform-comparison/2026-10-11-ios-fixes-01/verification.json). The iOS screenshots use the disposable instrumented container and current built web assets. The iPad landscape audit-only full-screen configuration and raw-framebuffer normalization are retained. This is not physical-device or release acceptance.

## MIDI options — PLATFORM-01

**Recommended: implement the iOS side of the existing `Midi` bridge in Swift using [Core MIDI](https://developer.apple.com/documentation/coremidi).** Keep the existing JavaScript events (`noteOn`, `noteOff`, `controlChange`, `devicesChanged`) and connection API so practice evaluation and pedal handling remain shared. USB MIDI and Bluetooth LE MIDI can use Apple's MIDI stack; Bluetooth discovery/connection can use [CABTMIDICentralViewController](https://developer.apple.com/documentation/coreaudiokit/cabtmidicentralviewcontroller). This needs hardware acceptance for hot-plugging, reconnecting, running-status/packet decoding, simultaneous notes, sustain and page pedals, timestamps and background interruption. A sensible delivery sequence is USB input/CC first, then the BLE connection flow, with the same final parity objective.

**Alternative: adapt a third-party bridge.** [MuseTrainer's Capacitor MIDI plugin](https://github.com/musetrainer/capacitor-musetrainer-midi) declares input support for iOS, Android and Web. Before adopting it, verify Capacitor 8 compatibility, its BLE connection flow, event parsing/lifecycle and maintenance/license requirements. Its API differs from SPino's existing native bridge, so it needs an adapter. No third-party MIDI dependency has been added and no MIDI implementation is claimed by this follow-up.

The MIDI requirement is accepted; the native implementation remains pending. The Core MIDI bridge is the proposed technical approach.

## Remaining review work

- PLATFORM-15: preserve the warm-up dialog's introductory scroll position when focus is set.
- PLATFORM-09/10: PDF compatibility and failure cleanup on the old Android WebView; repeat with the supported engine before attributing layout failures to the platform.
- PLATFORM-14: verify vertical metronome faders on supported Android engines.
- PLATFORM-11: verify the real iOS print sheet; source inspection of the fallback alone is not functional acceptance.
- PLATFORM-05: keyboard-aware form behavior with software keyboards on both systems.
- PLATFORM-06/07/08: optional presentation choices for icons, native controls and usable content density.

No personal notebook, score, annotation or earlier screenshot baseline was changed.


## 2026-10-12 major beta follow-up

Core MIDI is now implemented and simulator-compiled, with packet-parser checks passing. The warm-up scroll/focus repair is implemented and verified on iPhone portrait/landscape. Themes, rating/share and walkthrough are implemented with responsive-browser evidence across six screens and four layouts. Notification delivery remains an explicit acceptance gate because the Mac is locked and the iOS permission cannot be accepted. See [beta release evidence and limits](../releases/6.0.0-beta.1.md). Previous records above remain historical.
