# SPino 5.2.2 — Library, routines and progress

Android versionCode: 34. Testing candidate; native acceptance is separate from browser verification. Not published by this build.

## Release notes (English)

Simplified repertoire with a music stand and Library tabs. Dedicated routine builder with optional warm-up, editable block order and durations, and calendar scheduling from saved routines. New Progress navigation with weekly streaks and four-week goal comparisons. Profile now shows the app version, credits and archived release notes.

## Release notes (Spanish)

Repertorio simplificado con atril y pestañas de Biblioteca. Editor de rutinas con calentamiento opcional, orden y duración de bloques y planificación desde el calendario. Nueva sección Progreso con rachas semanales y comparación de cuatro semanas con el objetivo. Versión, créditos e historial de novedades en Perfil.

## Remaining review

Direct repertoire MusicXML/MXL import remains deferred. Catalogue, backup/sync, device permissions, physical MIDI/audio/touch and accessibility acceptance remain open. Hanon snapshots remain parked. Current weekly goal is used for historical comparisons; historical goal changes are not stored.

## Build and verification handoff

- Signed bundle: SPino-5.2.2-34.aab; jarsigner verifies its signature. SHA256: 14AC9D919AC82B35FECDB3B3A554602054F030E4BD41B327D6B760F709535F5B.
- Test APK: SPino-5.2.2-34-test.apk (also SPino-Test.apk). SHA256: C047ABCA613D5DB6032869C12F79D6B3F4A9323DD0C8522DC25C01D6460D4CAF.
- Replacement-installed on existing emulator-5554 without clearing storage. Installed versionName 5.2.2-test, versionCode 34. Resumed/top-resumed activity confirmed com.miguecoll.spino.test/com.miguecoll.spino.MainActivity.
- Last full limited-concurrency suite: 273 tests, 270 passed, 2 failed, 1 skipped. Both failing tests were stale Profile/navigation and repertoire/favorite expectations; after alignment with the approved Progress/music-stand UI, both pass individually. Other stale language/title/navigation expectations were similarly updated and pass. No final complete suite rerun after those last test-only changes; do not present a fresh blanket 273-test green run.
- Fixed Node test imports by separating package version metadata from Vite raw-document imports; final APK and bundle contain the corrected source.
- Native installation/foreground smoke only, not full native product acceptance. No Play upload performed. UI review paused at the owner's request; resume with repertoire add/import and deferred MusicXML/MXL.
