# SPino 5.2.6 — Annotated score printing

Publication completed on scheduled retry, 2026-10-07: commit 09a56f0 successfully pushed after server recovery. Public Spanish/English/Catalan download links verified; https://spinoapp.com/downloads/spino-5.2.6-38-test.apk matches the recorded size and SHA256 exactly. No rebuild or credential changes. The publication blocker below is historical.

Android versionCode: 38. Test APK only, requested 2026-10-07. No Play Store bundle or submission.

## Release notes (English)

- Print complete PDF scores with all annotations, preserving each page's format and rotation.
- Print complete MusicXML works on A4 portrait pages, including added fingering independently of screen zoom or the open excerpt.
- Preview output before printing; Android uses the system print service and its Save as PDF option.
- Preserves original scores, notebook history and annotation IDs. Includes the landscape keyboard from 5.2.5.

## Release notes (Spanish)

- Imprime partituras PDF completas con todas las anotaciones, conservando el formato y la orientación de cada página.
- Imprime obras MusicXML completas en páginas A4 verticales, con la digitación añadida, independientemente del zoom o fragmento abierto.
- Vista previa antes de imprimir; Android utiliza el servicio de impresión del sistema y su opción Guardar como PDF.
- Conserva los originales, el historial y los identificadores de anotación. Incluye el teclado apaisado de 5.2.5.

## Release notes (Catalan)

- Imprimeix partitures PDF completes amb totes les anotacions, conservant el format i l’orientació de cada pàgina.
- Imprimeix obres MusicXML completes en pàgines A4 verticals, amb la digitació afegida, independentment del zoom o fragment obert.
- Vista prèvia abans d’imprimir; Android utilitza el servei d’impressió del sistema i l’opció Desa com a PDF.
- Conserva els originals, l’historial i els identificadors d’anotació. Inclou el teclat apaïsat de 5.2.5.

## Verification and delivery

Build and Android bridge compilation pass. Printing checks cover original/rotated PDF page dimensions, annotation pixels, full-work A4 pagination and fingering outside the open excerpt. Release artifact/install/public-delivery details follow verification. Physical printer acceptance remains separate.

Artifact: SPino-5.2.6-38-test.apk, 22,393,905 bytes. SHA256: 87758AD7268D406BBCBF7DC3E34786D69CBAB0B069F7262755A5287ABCC9788C.

Verified package com.miguecoll.spino.test, versionName 5.2.6-test, versionCode 38. Replacement-installed on emulator-5554 without clearing storage and activity foreground confirmed. Multilingual website checks pass. Browser print tests also cover declaration-free MusicXML and rhythmically valid multi-page synthetic notation. No AAB generated; physical printer/system-dialog acceptance remains open.

Final full release-source regression: 287 passed, zero failed, one skipped (288 total), artifacts/regression-printing-release-5.2.6.log. Printing dependencies report zero production vulnerabilities; existing development-tool audit warnings were not upgraded in this task.

Publication blocked: website-only commit 09a56f0 is local. Three push attempts, including HTTP/1.1, were rejected by GitHub with Internal Server Error; GitHub check API also returned HTTP500. Read-only remote check confirms master remains a21dd3d (5.2.5). Existing Cloudflare CLI is unauthenticated, so direct deployment requires the user's login. No force push, temporary host or account change attempted. Public website/download remains 5.2.5; 5.2.6 APK is available locally and installed on the emulator.
