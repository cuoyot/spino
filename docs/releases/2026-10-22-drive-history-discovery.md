# Drive history discovery follow-up

The owner's screenshots show Android 6.1.1-beta.8 on the original tablet with 127 minutes of practice for the current week and a 240-minute weekly target. The new Play installation shows zero minutes and a 90-minute target. Both display the same Google account and notebook name, `2_SPino-shared`, with successful recent checks. Display names alone do not establish identical Drive root IDs. No personal notebook was accessed or changed during this investigation.

## Reproduced failure and source correction

An isolated synthetic test suppresses change-feed entries while existing immutable commits remain available through file listing. Previously, a new device could reconstruct only the descriptor's original heads, missing later saved history without reporting an error. This is a demonstrated failure mode, not confirmation of the owner's underlying Drive state.

First connection now inventories the selected root's immutable notebook objects. Explicit synchronization also requests this inventory, allowing already-connected devices to discover missing commits. Background polling retains its small change-feed requests. The inventory is scoped by root and notebook identity and uses the existing checksum validation and graph merge; it does not restore old snapshots or create duplicate sessions. A failed inventory prevents a successful explicit check.

## Verification and delivery boundary

All 74 focused incremental notebook, cloud synchronization and legacy Drive adapter tests pass. The regression covers a saved 127-minute practice with unchanged stable ID, preserved score assets, an already-connected client's recovery, no duplicate commits, and inventory failure retaining cached history. The new test failed against the preceding implementation before the source correction.

No APK/AAB has been built or installed for this change, and no Play rollout or website deployment has occurred. The owner's devices still need a version containing the correction before this path can be tested against real Google Drive. Recording MIME validation is a separate unresolved issue and was not changed.
