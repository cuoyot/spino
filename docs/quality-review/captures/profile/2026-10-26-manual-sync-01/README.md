# Manual synchronization and stale recording activity — 26 October 2026

Unreleased source follow-up to beta 6.1.6-beta.1 (107). The installed APK and published website still contain beta.1. No personal notebook or Drive data was accessed.

The owner reports roughly 25 seconds of visible rotation after Sync now, without a matching counter, followed by a message that incoming changes wait for practice/editing. This is not a physical timing measurement by the test harness. That generic message alone does not identify the blocker.

## Reproduced failures and changes

The previous controller exported the complete local notebook and forced Drive inventory for every manual check. A healthy incremental manual check now uses the same changes cursor as polling and skips local export when its saved revision and verified remote hash are unchanged. Local edits, incoming changes and edits during I/O still reconcile. Manual retry after an error and conflict resolution retain full inventory. Joining retains initial discovery.

Recording checks could return after notebook activity or editing made them ineligible, leave their status at checking/copying and keep the shared spinner rotating despite an idle task. Finalization now clears only such transient states. Success, errors, offline policy and explicit pause are preserved. The same permitted account/folder/network client is reused rather than connecting twice for discovery and copies.

The Drive panel now uses the controller's actual practice/editor/dialog/score wait reason. A generic wait no longer claims that practice must finish when no such reason is known. This does not relax the guards on applying received data.

## Verification

Three new assertions failed before the changes. The focused protocol/controller/media/view/coordinator suite passes 115 checks. A production browser test clicks Sync now and observes one changes-feed request and zero asset exports, then overlaps a held recording check with notebook synchronization and verifies the activity indicator returns to saved. Two existing spinner browser regressions also pass, including progress/route rotation, focus, error navigation and reduced motion. Four responsive layouts use a disposable synthetic notebook; captures are browser evidence, not native acceptance. Existing score bytes and annotation identifiers are covered by protocol tests.

Physical Google timing and the exact cause of the owner's waiting state remain unverified. No APK was built or published for this follow-up. Preview: http://127.0.0.1:5220/ (explicitly labelled unreleased, simulated Drive).
