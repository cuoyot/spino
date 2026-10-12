# Profile and the beta introduction

In the 6.0.0 beta, open Profile and choose Appearance to select Light theme, Dark theme or Match device theme. The selection is saved with notebook preferences. Existing notebooks keep their previous dark appearance until you change it. New notebooks follow the device theme.

The first launch offers a six-screen introduction: Today, Practice, Calendar, Library, Progress and Profile. Choose Skip to exit, or Back and Next to explore. Finish returns to the previous screen. Profile → App tour starts it again. The completion marker belongs to this device; it does not change practice records.

Rate app opens Google Play on Android or requests Apple's in-app review on iOS. Apple decides whether to display its review panel. Share app opens the system sharing sheet with the public SPino website; notebook contents are not included.

The warm-up introduction opens at its heading and initial scroll position. Targeted iPhone and iPad simulator portrait/landscape checks verified this in the beta.

The beta includes iOS Core MIDI and the Apple Bluetooth MIDI connection panel. USB/Bluetooth instrument and pedal acceptance still requires physical hardware. Local reminder integration is implemented; notification delivery acceptance is recorded separately in the release verification document.


In beta 2, Profile is at the top left of the fixed app header. The page title, relevant library/calendar/Quick practice controls and MIDI stay visible while the middle content scrolls. Main navigation remains at the bottom on portrait phones and at the side in existing tablet/landscape layouts. Fullscreen practice and scores hide or cover both sets of app chrome. MIDI has a pale background in light mode; hold it for instrument settings, or tap while disconnected to attempt reconnection.

The beta header keeps at least 68 px of usable height, plus device safe-area insets. Notch-specific responsive browser checks cover portrait and landscape; these are distinct from physical-device acceptance.

## Connect another device

On the connected device, open Profile → Connect another device → Show my notebook QR. On the new device, open the same Profile option and choose Scan a notebook QR, or Enter a connection code. After reading the QR/code, select the indicated sync file in the same Google Drive/iCloud account. The QR does not sign you into that account or carry its credentials. SPino checks the notebook identity before retaining file access. Wait for your provider's upload to finish before connecting the other device. Camera/provider behavior still requires native-device acceptance.

## Backup formats and conversion

Both formats contain repertoire, practice history, scores and annotations. The default compatible JSON copy retains format 1. An organized format 2 copy separates notebook state, repertoire, scores, annotations and score views into sections inside one file; beta 3 or later can restore it. Older apps cannot open format 2. The export dialog requires acknowledging this before writing a format 2 copy.

Convert a backup creates a separate compatible or organized copy without restoring it or modifying its source. Restore previews the format conversion and annotation count before asking permission to replace the local notebook. Future unsupported formats require updating SPino; no data is changed. Cloud synchronization still uses format 1, so choosing an organized manual copy does not change the shared file format.
