# Beta 129 browser and native handoff

Responsive Chromium evidence uses disposable synthetic notebooks and scores. The shared-clock fix is based on stable 6.2.3; no unrelated application work is included.

The 50 score frames cover PDF/MusicXML running, paused, editing and minimized states in phone/tablet portrait/landscape, with a narrow PDF phone. The 15 website frames cover localized release notes in Spanish, English and Catalan across the same orientations plus a narrow phone. Source/build/signature, 687 matching packaged web files, 15 Android unit checks and eight retained emulator IndexedDB files are recorded in `../../../../releases/6.2.4-beta.1-validation.json`. Native evidence proves replacement/retention/foreground, not physical-device timing acceptance.

Eleven clock-related checks, eight website checks and ten isolated PDF checks pass. The historical preparation assertion still fails on both 6.2.3 and the candidate. The broad run reports 696 passed / 61 failed / three skipped; 45 named failures were already recorded, ten additional names reproduce on unchanged 6.2.3, and the PDF readiness timeout passes all ten isolated rechecks. This is not a clean full-suite claim. Raw results and comparison are retained under `docs/releases/6.2.4-beta.1-*`.

The computer-use browser bridge is unavailable. No owner Chrome session was used for release operations. Public publication proof is recorded separately after deploying the exact reviewed commit.
