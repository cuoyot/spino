# SPino 5.2.7 — Direct score printing

Android versionCode: 39. Test APK only. No Play Store bundle or submission.

## Release notes (English)

- Print downloaded scores directly from Repertoire and Catalogue using compact printer icons.
- Opens system printing immediately, without an app-owned preview.
- Smaller printing controls in PDF/MusicXML editing; retains annotations, original PDF formats and full-work A4 XML pagination.

## Release notes (Spanish)

- Imprime partituras descargadas directamente desde Repertorio y Catálogo con iconos compactos de impresora.
- Abre la impresión del sistema sin una vista previa propia de la app.
- Controles de impresión más discretos en edición PDF/MusicXML; conserva las anotaciones, los formatos PDF y la obra XML completa en A4.

## Release notes (Catalan)

- Imprimeix partitures descarregades directament des de Repertori i Catàleg amb icones compactes d’impressora.
- Obre la impressió del sistema sense una vista prèvia pròpia de l’app.
- Controls d’impressió més discrets a l’edició PDF/MusicXML; conserva les anotacions, els formats PDF i l’obra XML completa en A4.

## Verification and delivery

Pre-release regression: 288 passed, zero failed, one skipped. Direct print calls and responsive management controls browser-verified using disposable synthetic notebooks. Physical printer acceptance remains separate.

Test APK: SPino-5.2.7-39-test.apk, 22,397,965 bytes. SHA256: 0359D74917A9B6041599FEB3BAF1D00AA1E057050B8B8CCE6828B211A1A94A22.

Verified com.miguecoll.spino.test, versionName 5.2.7-test/code39. Replacement-installed on emulator-5554 without clearing data; foreground activity confirmed. Build, final packaged-source printing/management checks and three-language website checks pass. Website-only commit 5cbabfc publishes the APK and updated download links; unrelated dirty app work preserved. No AAB or Play submission.

Public delivery verified: Cloudflare Workers build completed successfully. Spanish/English/Catalan pages expose the 5.2.7 link; public APK HTTP200 and downloaded size/hash match exactly. Download https://spinoapp.com/downloads/spino-5.2.7-39-test.apk. Older negative/stale cache responses disappeared after propagation; cache-bypassed verification also passes.
