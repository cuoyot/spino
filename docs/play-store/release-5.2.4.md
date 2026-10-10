# SPino 5.2.4 — Catalan and premium keyboard

Android versionCode: 36. Test APK only, requested 2026-10-07. No Play Store bundle or submission.

## Release notes (English)

- Catalan interface, selectable in Profile and retained across sessions, including practice and score controls.
- Piano-style keyboard: subtle ivory bevels, textured black keys, red felt and visible neutral key depression.
- Clearer octave labels with more bottom spacing. Side case cheeks appear only at the physical A0 and C8 endpoints, not cropped window edges.
- Preserves the 88-key layout, touch/zoom behavior, notebook history, scores and annotations.
- Includes quick-practice points, personal records and the shared finish/continue-later choice from the latest test build.

## Release notes (Spanish)

- Interfaz en catalán, seleccionable en Perfil y conservada entre sesiones, también en los controles de práctica y partituras.
- Teclado con relieve suave, textura en las negras, fieltro rojo y pulsación visible sin azul.
- Nombres de octava más legibles y elevados. El marco lateral solo aparece en La0 y Do8, no en los bordes de una ventana parcial.
- Conserva la distribución de 88 teclas, los gestos y el historial, las partituras y las anotaciones.
- Incluye puntos y récords de práctica rápida y la opción de finalizar o continuar más tarde del último APK de prueba.

## Release notes (Catalan)

- Interfície en català, seleccionable a Perfil i conservada entre sessions, també als controls de pràctica i partitures.
- Teclat amb relleu suau, textura a les tecles negres, feltre vermell i pulsació visible sense blau.
- Noms d’octava més llegibles i elevats. El marc lateral només apareix a La0 i Do8, no a les vores d’una finestra parcial.
- Conserva la distribució de 88 tecles, els gestos i l’historial, les partitures i les anotacions.
- Inclou punts i rècords de pràctica ràpida i l’opció de finalitzar o continuar més tard de l’últim APK de prova.

## Verification and delivery

Test APK: SPino-5.2.4-36-test.apk, 22,192,635 bytes. SHA256: 36F62D24199A1ECDB94B33A20BC6F2632ABD22EB313CC36CE6AF03F7490B2E75.

Verified package com.miguecoll.spino.test, versionName 5.2.4-test, versionCode 36. Replacement-installed on emulator-5554 without clearing storage, launched and topResumedActivity confirmed. Build and scoped Catalan/resource, keyboard endpoint/gesture/range, quick-score, navigation and multilingual website checks pass. No full regression or blanket native, accessibility, physical MIDI or audio acceptance is claimed.

Website-only commit ddf0942 pushed to master for the existing Cloudflare Workers integration. Includes updated Spanish/English/Catalan pages, 21 reviewed language-matched screenshots and both versioned/compatibility test downloads. App source and unrelated changes remain uncommitted. Public deployment/content verification recorded in the review handoff after completion. No AAB generated; previous bundles untouched.

Published and verified 2026-10-07: Cloudflare Workers build for final website commit 08a8984 completed successfully. All three public language pages reference the versioned APK and refreshed image URLs. The 21 public screenshot SHA256 values match local reviewed images; the public APK matches the package checksum and is served as application/vnd.android.package-archive. Download: https://spinoapp.com/downloads/spino-5.2.4-36-test.apk. The second website-only commit refreshes cached screenshot URLs; it does not regenerate images.
