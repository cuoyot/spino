# Practice clock — 2026-10-19

The owner requests regular clock updates and a clock action that ends score editing while keeping practice paused. This supersedes the earlier disabled-clock editing rule for PDF and MusicXML. The separate Done editing action and Back continue saving and resuming practice.

Implemented for 6.1.1-beta.1 (77): second changes repaint independently of checkpoint saving; unchanged clock text is retained; score digits have fixed width. The editing clock is enabled, displays a checkmark and has a localized finish-editing label. It waits for pending annotation/framing writes before hiding tools, and remains in editing on save failure. A second tap from pause resumes practice.

Fourteen focused browser checks pass with synthetic notebooks/scores. [Dated evidence](captures/session/2026-10-19-clock-edit-pause-01/review.json) covers both themes, phone/tablet portrait/landscape, a narrow phone, clock cadence, delayed frames, pause/resume, geometry and retained annotations. [Earlier cadence evidence](captures/session/2026-10-19-clock-cadence-01/review.json) is retained separately.

[Native handoff](captures/releases/2026-10-19-beta611/native-handoff.json) records replacement installation, foreground and 119 unchanged original IndexedDB files before launch. Browser screenshots are responsive evidence; physical-device acceptance remains separate. Public delivery is recorded in the release publication manifest.

[Native MusicXML clock checks](captures/releases/2026-10-19-beta611/native-clock.json) pass on the installed emulator WebView using a direct synthetic session, without compatibility shims or notebook writes. They verify the enabled editing clock, exit into pause, stable paused time and second-tap resume. Native PDF/physical-device acceptance remains separate.
