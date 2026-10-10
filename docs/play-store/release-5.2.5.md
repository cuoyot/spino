# SPino 5.2.5 — Landscape keyboard practice

Android versionCode: 37. Test APK only, requested 2026-10-07. No Play Store bundle or submission.

## Release notes (English)

- Taller on-screen keyboard in phone landscape, with pause and tools on the right and points/statistics on the left.
- Session and Feedback aligned at the top; timed practice retains tempo controls.
- Moving the keyboard into low/high registers switches generated mobile exercises to bass/treble clef while preserving accumulated results.
- Includes the Catalan interface and premium keyboard from the previous test version.

## Release notes (Spanish)

- Teclado más alto en móvil apaisado, con pausa y herramientas a la derecha y puntos e indicadores a la izquierda.
- Sesión y Valoración alineados arriba; la práctica con tempo conserva sus controles.
- Al desplazar el teclado hacia graves o agudos, los ejercicios móviles generados cambian a clave de fa o sol sin perder los resultados acumulados.
- Incluye la interfaz en catalán y el teclado premium del APK anterior.

## Release notes (Catalan)

- Teclat més alt al mòbil apaïsat, amb pausa i eines a la dreta i punts i indicadors a l’esquerra.
- Sessió i Valoració alineades a dalt; la pràctica amb tempo conserva els controls.
- En desplaçar el teclat cap als greus o aguts, els exercicis mòbils generats canvien a clau de fa o sol sense perdre els resultats acumulats.
- Inclou la interfície en català i el teclat prèmium de l’APK anterior.

## Verification and delivery

Production browser build passed. Full regression: 286 passed, zero failed, one skipped. Focused timed/self-paced landscape, rotation, settings and pause checks pass. Native installation and public delivery are recorded after verification; physical MIDI, audio and broader native/accessibility acceptance remain separate.

Test APK: SPino-5.2.5-37-test.apk, 22,194,823 bytes. SHA256: 564F08790ABD12C1294F207862A3A5AF2BC80ECDC31EC200AF186E4A5356BC0C.

Package com.miguecoll.spino.test, versionName 5.2.5-test, versionCode 37 verified. Replacement-installed on emulator-5554 without clearing storage; launch and topResumedActivity confirmed. Website language/image/overflow tests pass. Website-only commit a21dd3d publishes three localized landscape screenshots, pages and versioned/compatibility APK downloads through the existing Cloudflare integration. Source app changes and unrelated work remain uncommitted. No AAB generated.

Cloudflare Workers build completed successfully. Public Spanish/English/Catalan pages expose the new versioned download and snapshot; all three snapshot hashes match the local reviewed files. Download: https://spinoapp.com/downloads/spino-5.2.5-37-test.apk.
