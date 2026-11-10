# Saved recording Close and Back — 2026-11-10

The owner's screenshot shows a saved recording whose Share remains busy while Close does nothing and Android Back changes the underlying route. The repair separates share cancellation from local writes, handles floating media in Back navigation, and completes native sharing when its chooser launches rather than waiting for a receiving app to return.

Source: `/Users/migue/.codex/worktrees/repertoire-multiselect/spino`, branch `codex/repertoire-multiselect`, published beta125 base `b8e8947bd3b436d56b2112cc599f4c7dc4b5420b`. Accepted multiple-repertoire selection and prior recording/export improvements remain. Source/build hashes are in `build.json`.

`verification.json` contains the synthetic saved-video hash and ten responsive light/dark frames at phone/tablet portrait/landscape and 320 px. Tests hold sharing and native staging unresolved, exercise Close and Android Back without changing the underlying route, resolve/reject old calls after a retry, and verify a failed local draft write retains the edited title for a successful retry. The original video ID/title/draft state and SHA-256 are retained. No personal notebook, score, annotation or recording was used.

Native Java compilation and 15 Android unit tests pass (`android-checks.log`). No APK was built and no installed emulator/personal data was touched. Native recipient/Back behavior still needs physical acceptance after packaging. The native change confirms chooser launch only, not file delivery; staged FileProvider bytes retain their existing lifetime.

Final focused browser/unit results are in `checks.log`; preview smoke results are in `preview-checks.log`. Earlier runs 01–03 retain intermediate evidence, including an initial fixture-only web/native mismatch. The existing decorated-video test had one parallel progress-dialog timeout; its isolated retry passed, and the final gate runs serially. Earlier unrelated published-baseline caption/calendar failures remain documented in recording-stop-export-05 rather than being claimed fixed here.

Preview: http://127.0.0.1:5342/?review=share. The dedicated script uses namespaced disposable databases and a synthetic video; sharing is deliberately held pending, so Close can be reviewed without sending anything. Both earlier recording/export preview modes remain available. In-app browser opening returned unavailable.

No new APK, deployment or release. Next: owner responsive review, then native Android recipient/cancellation/Back acceptance when packaged.
