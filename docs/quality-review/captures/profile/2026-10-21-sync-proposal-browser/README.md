# Subtle synchronization indicator proposal

2026-10-21. Owner requested a less prominent design, without redundant red background plus exclamation, with healthy/error comparisons across screens.

Visual proposal only: injected CSS uses a 19px symbol, no badge/background, muted green-grey for connected state, soft red for errors, retaining a 44px touch target. Phone header spacing is reduced to preserve the Calendar title. Production application source remains unchanged by this proposal.

32 responsive Chromium screenshots: Today, Practice, Calendar and Profile; saved/error states; 390×844, 844×390, 768×1024 and 1024×768. A disposable synthetic Drive notebook is connected using the existing fixture. Indicator states and Profile status text are injected for visual comparison. These are design mockups on real browser screens, not synchronization failure validation or native acceptance. Capture script is included; it uses the local workspace paths and modern bundled Node with BROWSER_PATH set to Chrome. Base package is 6.1.1-beta.5 with uncommitted working-tree changes from the previous implementation.

Open proposal.html for full screenshots at all sizes. overview-saved.png and overview-error.png compare phone portrait screens. Owner acceptance is pending.
