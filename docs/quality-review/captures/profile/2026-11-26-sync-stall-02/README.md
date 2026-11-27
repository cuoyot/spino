# Synchronization stall recovery — 26 November 2026

Base: published beta131, `935c26329661542beda90ffb4dd39714d6f26d3a`. Final package: 6.2.4-beta.4 (132). Run 01 retains the earlier candidate; this run does not overwrite those images.

The owner reports a week without phone updates, the same server error on Wi-Fi/cellular, an expected unauthenticated browser 401, and an operation that never finishes after force stop. A screenshot shows 7 request attempts and 26 KB received after 3 seconds. It proves partial access, not successful synchronization or the exact source of the stall. No owner notebook or real Google file was read by the fixtures.

Synthetic source regressions reproduce cyclic empty listing/change pages and a sequence of individually responsive requests without an operation budget. Cache waits are now bounded too. Other tests verify concurrent cancellation, expired operations requiring manual retry, retained phone edits/PDFs/annotations and accepted-but-timed-out uploads keeping their durable IDs.

The production-browser test accelerates the 180-second transport budget to 800 ms. Eight responsive captures cover stopped/recovered states in phone/tablet portrait/landscape. IndexedDB notebook and score records match before and after; late old responses cannot change the final state. These are responsive browser simulations, not native-device acceptance.

The Android package is replacement-installed on the existing emulator. Eight original IndexedDB files match before launch, and the updated activity is in the foreground. Private recovery archives remain in ignored output/native-review-backups. No original notebook is used as functional test data. Native visuals and real two-device Google synchronization remain unaccepted.

The existing manual-sync browser request-count failure is reproduced against unchanged beta131. Focused application checks, this regression, journal browser checks, Android tests and package parity are recorded separately; no clean broad suite is claimed.
