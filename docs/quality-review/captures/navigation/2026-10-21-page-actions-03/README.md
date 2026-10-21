# Page actions, subtle synchronization and Profile ring

2026-10-21. Owner approved the subtle sync proposal and asked to move Record, Quick practice and Calendar view choices into their pages. The later report identifies a broken selected Profile ring.

Production browser build verification passes 54 focused unit checks and four final browser regressions: page action routing/layout, continuous Calendar scroll, populated navigation palette and shared header parity. Sixty actual light/dark frames cover Today, Practice, Calendar Week/Month, Multimedia and Profile at 320×640, 390×844, 844×390, 768×1024 and 1024×768. Metadata records exact source/build hashes. The dedicated test connects a disposable synthetic Drive notebook; no personal data is used. Recorder open/close returns focus, Quick practice opens directly, Calendar arrows/current-week return work, and the planner occupies the same toolbar coordinates in both views.

The Profile selection outline now sits inside its circular avatar rather than outside a clipping header button; keyboard focus remains visible. The 19px synchronization symbol has no badge or filled background, retains a 44px target and localized state labels, and has separate light/dark state colors.

Previous candidate captures are retained in page-actions-01 and page-actions-02. Candidate02 had a narrow segmented-label clipping defect, corrected by retaining intrinsic button widths. Final populated palette and header regressions pass. These are responsive browser captures, not native acceptance. See the beta6 release for subsequent packaging, preserved-emulator installation and public website verification.
