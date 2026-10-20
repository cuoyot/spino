# Header controls after returning from practice

The owner reports MIDI, Record, Quick practice and Week/Month misplaced in the local build. The accepted shared primary-header layout is retained. The generated reader left a managed-practice class available while its session was paused; a global descendant-header rule with !important then changed the app header to one column. Scoping that rule to the reader’s direct header fixes every affected action without changing navigation or musical progress.

[Final responsive evidence](captures/themes/2026-10-20-beta613-return-header-03/README.md) passes 84 post-practice route/theme/layout states and retains 40 frames. The previous 384-state primary-header parity also passes. [Native release evidence](captures/releases/2026-10-20-beta613/README.md) separately verifies the actual installed header after Hanon practice. Notebook IDs, session state and original logical native stores are retained. Earlier navigation-test iterations remain preserved.

This correction is included in the owner-authorized 6.1.1-beta.3 (79) release alongside Hanon spacing and lesson score timing. Physical-device and owner visual acceptance remain separate.
