# SPino 6.1.0 — Google Play submission

Prepared on 19 October 2026. This is an update to the existing application, not a new app registration. No Play Console upload or rollout has been performed.

## Upload and identity

- Bundle: `artifacts/releases/6.1.0/SPino-6.1.0-76.aab`.
- Package: `com.miguecoll.spino`; versionName `6.1.0`; versionCode `76`; target API `36`; minimum API `24`.
- Signed with the existing upload certificate, SHA-256 `d27604f0725c3040b3a476617e1e7bc4c6d31d7aabc36a65e8a2d5cb65fc7de7`.
- APK for the website: `spino-6.1.0-76-android.apk`. APK and AAB hashes are in `docs/releases/6.1.0-artifacts.json`.
- Complete local handoff: `artifacts/play-store/SPino-6.1.0-76-play-console.zip`.
- Next beta: `6.1.1-beta.1`, build 77 or greater; not yet released.

## Listing and artwork

Use the fields in [listing.md](listing.md); Spanish and English descriptions and release notes fit Console limits. Keep the current title and package identity. The application also supports Catalan.

Icon: `assets/brand/play-store-icon-512.png`. Feature graphic: `assets/brand/play-store-feature-1024x500.png`.

Fresh screenshots: [2026-10-19 stable 6.1](screenshots/2026-10-19-stable61/index.html). There are 96 opaque RGB PNGs: Spanish/English, light/dark and phone/7-inch/10-inch tablet. Use up to eight per language and device category; light and dark folders are alternatives. Optional phone multimedia images from the current website capture are included in the handoff; replace an image if selecting one, rather than exceeding eight. All screenshots use disposable synthetic notebooks and generated demo audio. They are responsive-browser captures, not physical-device acceptance evidence.

## Release notes (English)

Record audio and video, replay offline and share takes. Optionally synchronize your notebook and saved recording copies with your own Google Drive. Review a 12-week practice chart and filter time by activity and piece. Complete lessons with notes and recording links. Improved calendar, repertoire and saved-practice summaries. English, Spanish and Catalan.

## Release notes (Spanish)

Graba audio y vídeo, reproduce sin conexión y comparte tomas. Sincroniza opcionalmente el cuaderno y copias de grabaciones con tu Google Drive. Consulta 12 semanas de práctica y filtra el tiempo por actividad y obra. Completa clases con notas y enlaces a grabaciones. Mejoras en calendario, repertorio y resúmenes de práctica. Español, inglés y catalán.

## Release notes (Catalan)

Grava àudio i vídeo, reprodueix sense connexió i comparteix preses. Sincronitza opcionalment el quadern i còpies de gravacions amb el teu Google Drive. Consulta 12 setmanes de pràctica i filtra el temps per activitat i obra. Completa classes amb notes i enllaços a gravacions. Millores al calendari, repertori i resums de pràctica. Català, castellà i anglès.

## App content

Use the reviewed [form preparation](play-console-forms.md) and public privacy policy at https://spinoapp.com/privacy/. Declare camera and microphone purposes for optional recording. Local features require no login; optional Drive requires the user's Google consent. The app has no developer backend, ads or analytics. Assess direct user-owned Drive transfers against Google's Data safety exception; do not reuse the old statement that no data ever leaves the device.

Before rollout, verify production Google authorization with both relevant Android OAuth certificate identities: the website APK certificate and the Play App Signing certificate shown in Console. The beta certificate is different. Test a Play-installed production build on two devices, including notebook sync, recording copies and sharing. Review Console's pre-launch report, current App content forms and any signing/version-code warnings. The existing Google Play listing is recorded as 5.2.3 (35); this preparation does not change that public version.
