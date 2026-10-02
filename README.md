# SPino: Smart Piano Notebook

A free, local piano companion for planning, practising and reviewing progress. **SPino: Smart Piano Notebook** is the full product name; **SPino** is used on the launcher and compact app headers. Built with JavaScript, Vite, VexFlow and Capacitor for Android. No account, application backend, subscription or telemetry is required.

## What you can do

- Start reading, technique, repertoire, theory or free practice; save reusable routines.
- Practise without a piano using explicit on-screen answers, with an unconnected piano using manual tracking, or with USB/Bluetooth LE MIDI for compatible generated exercises.
- Work on 43 major, natural minor, harmonic minor and Dorian targets, with short explanations and local exercise generation.
- See today's practice, saved feedback and a seven-day overview in **Today** (Spanish UI: **Hoy**).
- Plan with a weekly day-row agenda or a month grid; enable local Android reminders. A weekly assistant adds selected practice days, session minutes and an optional tutor class, with a preview and duplicate checks. Choose one week or repeat weekly for 4, 8, 12, 26 or 52 weeks. Each pending occurrence has an Edit practice action: apply a saved routine or add, remove and reorder exercise blocks, then review its date, time and reminder. A calendar grip supports touch/mouse dragging to another day in week or month view; left/right arrow keys move the focused grip by one day. Moving preserves the appointment ID, blocks, time and recurrence, and refreshes reminders. Active and completed practices cannot be moved or rewritten. Each occurrence can be edited separately; cancel this and future appointments from its detail screen without deleting practice history. Practice and tutor series are independent and stored locally, including in backups.
- Save session titles, a five-face self-assessment, comments, practised pieces and next steps. Review time, history, repertoire and routines directly from My piano.
- Browse 618 bundled repertoire records (563 canonical works and 55 candidate editions), with 1,462 optional accompaniment editions. Keep unavailable scores visible, acquire MXL/MusicXML explicitly and review independently analyzed excerpts.
- Download selected public-domain PDF editions, or import your own PDFs; practise and annotate them offline. PDFs support manual practice, not automatic note evaluation.
- Write text, draw lines/arrows/circles/rectangles, use a freehand pen, underline or highlight passages in several colours. Undo, redo and erase individual marks.
- Export and restore the complete notebook, including score attachments and their annotations.

The interface uses the original dark controls and ink-on-paper score. Phone/tablet and portrait/landscape layouts are separate. The reading clock follows tempo independently of answers; mistakes do not reposition the staff. White piano keys stay at least 44 CSS px wide, black keys at least 28 px. Pinch enlarges the keyboard up to 250%; two-finger movement pans it. A settings control provides the same zoom without gestures.

To plan a week, open **Calendario → Organizar semana**, choose the week and days, set minutes/context or select a saved routine, and optionally add a tutor class. Check the date/total preview and save. Existing practice dates and classes are preserved; past dates are skipped. The assistant creates one week of independent appointments. Open an appointment to reschedule it or enable a reminder. Adaptive plans for auditions, repertoire and passages are deferred.

To use your own score, open **Mi piano → Repertorio → Añadir obra** and select the optional **Partitura PDF** at the top of the form. **Importar PDF** and **Añadir PDF** inside an existing work lead to the same review form. Check the title/composer, expand **Detalles de estudio** for tempo and other optional fields, then save. Nothing is added until Save; the work and attachment are committed together. Open **Abrir y anotar PDF** to read or mark the score; **Practicar** starts a repertoire session with access to the same PDF and an in-viewer timer. Imports accept readable PDFs up to 20 MB; password-protected or invalid files are rejected before saving a work.

Import suggests a title, composer and explicit numeric tempo from the first-page header. It reads embedded PDF text first and falls back to local OCR for scans or incomplete headers. Suggestions fill untouched fields; existing/manual values stay unchanged unless **Usar sugerencias** is selected. **Omitir detección** keeps the validated attachment and allows manual entry. The printed tempo mark is editable and retained separately from practice BPM, so the beat symbol can be checked. Exact values within 30–160 BPM can prefill the current practice range; printed ranges and values outside it are shown without clamping or selecting a value. Words such as Andante never imply invented BPM. Recognition is basic: covers, unusual layouts, handwriting, poor scans and languages beyond the bundled English/Spanish models may need manual correction. This is header OCR, not musical-note recognition.

The PDF uses the whole screen, hiding app navigation and Android status/navigation bars. A single movable widget holds the timer, pause/resume and page controls. During practice, annotation tools and Back stay hidden; pause to annotate, adjust framing or leave. Android Back pauses a running session first and leaves on the next press. Bars return when leaving the viewer; a system edge swipe can reveal them temporarily. Browser fullscreen depends on support and user activation; **Encuadre → Pantalla completa** retries when available.

In reading mode, briefly tap the far right edge to advance or the far left edge to return. Each zone is only 3.5% of the visible page width, capped at 18 CSS pixels, including when zoomed. Interior taps, holds, drags, pinch gestures and annotation tools never turn pages. Previous/next buttons remain available. Pinch to enlarge up to 300%; drag to pan in reading mode or use two fingers while annotating. While paused, open **Encuadre** for +/− and fit controls. Adjust the zoom and position, then choose **Guardar encuadre** to restore that framing whenever the same PDF opens. Portrait and landscape have separate defaults; page turns preserve the current framing. **Restablecer** saves full-page fit for the current orientation.

While paused, **Anotar** offers visual tool buttons and a five-colour palette. Choose a number from **1–5**, then touch the score to add fingering; touching an existing fingering mark replaces its number/colour. Text, pen, highlight, underline, lines, arrows, circles and rectangles remain available, with erase and undo/redo. Touch a text annotation with **Texto** to edit it. Drag the widget by its grip to uncover the music or collapse the panel with its pencil button. Completed marks save automatically. If saving fails, the editor shows a retry action and remains open when you try to leave.

Annotations are a separate local layer attached to the exact PDF, with positions relative to each page. Rotation and zoom preserve their alignment. Notebook backups include the original PDF, annotations and saved framing; exporting a standalone annotated PDF is not implemented. The original file is unchanged. PDF.js, its worker, fonts and decoders ship with the app: reading and annotation do not call an API or require a server.

The OCR worker, WebAssembly engine and English/Spanish language data also ship in the app, with no runtime CDN or external API. They load only when needed, process a bounded crop of the first page, and release resources on completion/cancellation. Recognition can be skipped and times out after one minute. See [OCR dependency notices](public/licenses/ocr-notices.txt) and the [Tesseract.js local installation guide](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md). The initial dependency installation requires internet; building from installed dependencies and running the Android OCR do not.

## Release quality review and user manual

The [screen review workspace](docs/quality-review/README.md) tracks the preliminary-to-1.0 design and behavior review, starting with [Today](docs/quality-review/today.md). It includes a screen inventory, cross-screen decisions and reproducible phone/tablet portrait/landscape captures. The [English manual source](docs/manual/README.md) grows with verified screens and is structured for future offline in-app help. These review documents distinguish accepted objectives from proposed refinements; no release is implied.

## Prerequisites

- Node.js **22.13 or later** and npm (PDF.js supports Node 22.13+ or 24+). The checked-in lockfile fixes dependency versions.
- A recent Chromium, Chrome or Edge for browser tests. Set `BROWSER_PATH` when automatic discovery cannot find it.
- For Android: JDK **21**, Android SDK platform **36**, Android build tools and platform tools. Minimum supported Android API is **24**.
- Initial dependency/toolchain installation needs internet access. Runtime practice does not.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To test a production web build:

```sh
npm run build
npm run preview
```

To expose the development server to a phone on the same trusted network, run `npm run dev -- --host 0.0.0.0`. Browser MIDI needs a secure context and browser support; plain LAN HTTP may not offer it. Use the Android build for native USB/BLE MIDI, notifications and system file pickers. The integrated PDF editor is shared by Android and the browser. The browser's MIDI settings report its actual availability.

The browser stores data per origin in IndexedDB. Changing hostname or port opens a different notebook. Clearing site data or uninstalling the Android app removes local data; export a backup first. The web build has no service-worker installation/offline cache; the Android app bundles its core assets for offline launch.

## Build and run Android

With a standard Android toolchain, set `JAVA_HOME` and `ANDROID_HOME` (or configure `android/local.properties`), then:

```sh
npm run build
npx cap sync android
```

```powershell
cd android
.\gradlew.bat assembleDebug
```

On macOS/Linux, use `./gradlew assembleDebug`. The output is `android/app/build/outputs/apk/debug/app-debug.apk`. `npx cap open android` opens the project in Android Studio.

This workspace also supports a portable Windows toolchain:

```text
%USERPROFILE%\Android\jdk       JDK 21
%USERPROFILE%\Android\sdk       Android SDK
AVD name: SightReader
```

```powershell
.\scripts\build-apk.ps1       # Builds and copies SPino.apk to the repo root
.\scripts\run-emulator.ps1    # Starts the AVD if needed, installs and opens the app
```

Rebuild and rerun these commands to refresh the emulator after changes. Installation uses `adb install -r` to preserve app data. Native changes require a rebuild; `npm run dev` alone does not update an installed APK. Scripts assume one attached emulator/device.

The application ID remains `com.miguecoll.spino` so upgrades retain existing data. This candidate is version `5.0.0`, Android version code `29` (previous release: `4.0`, code `28`). Debug builds are for testing; public distribution needs the owner's production signing configuration and completed store listing.

The [SPino brand assets](assets/brand/README.md) include the generated source artwork, Google Play icon/feature graphic, web icons and Android adaptive/monochrome layers. Run `scripts/export-brand-assets.ps1` on Windows to regenerate size/format exports from the saved masters. The app and normal builds use the committed exports without calling an image service.

## Tests and visual checks

```sh
npm test
```

This builds the web app and runs Node tests plus real headless browser checks. Tests cover musical constraints, tempo and staff stability, keyboard gestures, persistence, feedback, calendar dates, download policy/update failures, backup restoration, MIDI disconnection and responsive layouts. PDF tests cover valid/invalid imports, every annotation tool, undo/redo/erase, escaped text, page isolation, rotated pages, pinch/cancelled gestures, narrow margin navigation, storage errors, session timing and backup contents. Physical USB/BLE communication still needs testing with a real instrument.

```powershell
$env:UI_SCREENSHOTS = '1'
npm test
node scripts/check-emulator.mjs
node scripts/check-score-alignment.mjs
node scripts/check-pdf-import.mjs
node scripts/check-pdf-practice.mjs
node scripts/verify-repertoire.mjs --download  # Explicit optional real-score diagnostic
node scripts/check-repertoire.mjs
```

Screenshots are written under `artifacts/`. The emulator smoke script checks the native app and network policy, downloads a reviewed PDF from Mutopia with progress, renders it in the shared editor, checks Android Back, turns a fixture page with a narrow margin tap and draws a temporary annotation. It reads notification permission state and captures screenshots. Temporary test marks stay in memory; it does not write practices, PDF assets or reminder schedules. It requires the portable SDK and an already-running debug app on unmetered Wi-Fi.

With practice paused, `check-score-alignment.mjs` checks the installed Android renderer against actual SVG staff and notehead bounds in page/scroll layouts, treble/bass/grand staff, and quarter/whole notes. It uses temporary in-memory reading settings, does not start playback or record practice, preserves saved preferences/results and returns to Today. Guide positioning is checked immediately after layout, without waiting for a separate cursor animation. Alignment screenshots are saved under `artifacts/emulator/`.

`check-pdf-import.mjs` exercises the installed Add work form with a text PDF and a JPEG-only scanned PDF. It checks title, composer and printed tempo using the actual bundled OCR engine, cancels the form and verifies that works/assets are unchanged. Pause practice and close any dialog before running it. OCR language data is unpacked at build time to `.traineddata`: Android's asset packager rewrites `.gz` filenames, so shipping compressed filenames would break model loading.

`check-pdf-practice.mjs` verifies immersive Android viewport dimensions, Back-to-pause, paused fingering, zoom persistence across pages/reopening and restoration of the system bars. It uses a two-page fixture and an in-memory timer/annotation store, then checks that notebook works/assets are unchanged. Pause practice and close any dialog first. Build and install the current APK before running native checks; they load the matching modules from `dist/assets`.

## Repository guide

| Path | Responsibility |
|---|---|
| `src/companion/app.js` | Notebook navigation, plans, sessions, repertoire and orchestration |
| `src/companion/views.js`, `app.css` | Compact preparation, calendar, dashboard, feedback and responsive appearance |
| `src/companion/agenda.js`, `planner.js` | Today, weekly activity cards and the local weekly scheduling assistant |
| `src/companion/model.js`, `store.js` | Validated local data, IndexedDB transactions, session accounting and backups |
| `src/companion/curriculum.js` | Musical targets, explanations and constrained generation |
| `src/companion/catalog.js`, `downloads.js` | Existing reviewed PDF catalog and opt-in download queue |
| `src/companion/library*.js`, `score-transfer.js` | Manifest snapshots, execution states, catalogue UI, reviews and opt-in MusicXML acquisition |
| `src/companion/musicxml-*.js` | MXL/XML validation, worker analysis, independent excerpts and offline score rendering |
| `src/companion/platform.js` | Browser/Android adapters for files, PDFs, network policy and reminders |
| `src/companion/pdf-viewer.js`, `pdf-viewer.css`, `pdf-annotations.js`, `score-controls.js`, `score-view.js` | Immersive PDF.js editor, floating tools, touch gestures, annotations and saved framing |
| `src/companion/score-import.js`, `pdf-metadata.js`, `score-metadata.js`, `score-ocr.js` | Reviewed PDF import, local text/OCR header extraction and conservative title/composer/tempo suggestions |
| `src/main.js`, `music.js`, `render.js` | Existing interactive reading engine, note generation and VexFlow rendering |
| `src/layout.css`, `style.css` | Practice layout and ink-on-paper presentation |
| `android/app/src/main/java/com/miguecoll/spino/` | USB/BLE MIDI, local reminders, native file/download bridge and PDF viewer |
| `Exercises_Library/` | English-base v2 repertoire package, schemas and [Codex integration handoff](Exercises_Library/CODEX_HANDOFF.md); index-driven runtime import; legacy v1 retained only as historical input |
| `tests/`, `scripts/` | Regression checks, APK build and emulator tooling |
| `docs/vision-producto.md` | Product vision, screen responsibilities and future scope, in English |
| `docs/primera-version.md` | Implemented candidate scope and validation limits, in English |
| `docs/branding-review.md` | Selected identity and historical naming research |
| `assets/brand/`, `public/brand/` | SPino artwork, store exports, prompts and web assets |
| `public/pdfjs/` | Ignored PDF.js fonts/decoders/license, populated from dependencies by the Vite build/dev plugin |
| `public/ocr/` | Ignored OCR worker, LSTM engine variants, language data and licenses, copied from locked dependencies by Vite |

All documentation and source comments must be written in English. User-facing translations and original musical titles can retain their languages. Keep changes to UI labels separate from stable persisted IDs.

For package-only validation, run `npm --prefix Exercises_Library/scripts ci --ignore-scripts` and `npm --prefix Exercises_Library/scripts run validate`. `node scripts/verify-repertoire.mjs` imports metadata without downloading. The `--download` diagnostic acquires one real candidate into ignored artifacts; it never installs that file in the user notebook or approves its rights. The [integration guide](docs/repertoire-integration.md) documents states, review steps, metrics, formats, limits and blockers.

## Local data, downloads and reminders

Optional automatic backup is available through native system file providers: Google Drive on Android, and iCloud Drive or Google Drive through Files on iOS. Choose an independent backup with manual restoration, or a shared notebook that merges changes across devices using the same selected file. Shared synchronization runs while Today or Settings is open with no active practice or editor. Conflicting values require a choice; independent changes from both devices are preserved. See [cloud backup setup, provider limitations and iOS build instructions](docs/cloud-backup.md). Remote upload is managed by the selected provider, not SPino.

The `cuaderno-piano` IndexedDB database stores preferences, plans, routines, sessions, repertoire, download jobs and PDF assets. Previous `sr.*` practice preferences remain local and are included in backups. Schema/version validation occurs before a restore; restore replaces the notebook after a review step, rather than merging histories. Backups are unencrypted JSON chosen by the user through the system file picker (browser: download/upload). Current limits are 20 MB per PDF, 60 MB per imported backup and 500 attachments; keep backups below the import limit.

The repertoire package ships through `Exercises_Library/library.json`, with stable IDs and hashed manifests; see the [integration guide and delivery counts](docs/repertoire-integration.md). The library opens on downloadable/local scores. Reference-only records remain under Research. The separate PDF tab offers ten verified download links; see [source evidence](docs/catalogue-sources.md). No score downloads run automatically. For the PDF catalogue, increment `CATALOG_VERSION` for editorial releases and an item's `revision` when its downloadable edition changes. Stable item IDs connect downloads and repertoire across app upgrades. Adding a source also requires reviewing its file/edition conditions and updating the native download allowlist deliberately. A computed SHA-256 identifies the downloaded bytes; it is not an independent publisher signature.

Downloads are opt-in and serial, display byte progress, support pause/retry and default to unmetered Wi-Fi. Android binds each transfer to the permitted network. The browser blocks Wi-Fi-only transfers when it cannot identify the network; users can explicitly permit any network. Transfers pause when the app leaves the foreground or a score editor opens. PDF retries restart from zero; MusicXML retries can resume validator-bound byte ranges when the source supports them. An existing unannotated edition is replaced only after the new asset and metadata can commit together. When bytes change, an annotated edition stays with its repertoire work and the catalog update uses a separate asset. An annotated catalog PDF without a work is retained as a repertoire entry so its marks remain accessible. Identical bytes preserve annotations and saved framing across metadata updates. Ordinary downloads do not automatically add repertoire entries. Removing a PDF explicitly removes its annotation layer, with confirmation, and preserves practice history and work notes.

Annotation validation accepts up to 2,000 marks and 100,000 points per PDF, 4,000 points per freehand stroke and 500 characters per text mark. Undo/redo retains up to 40 edits while the editor is open; saved marks persist between launches. Old backups without annotation fields remain compatible.

Reminders are scheduled locally 15 minutes before a timed plan/event when requested. Android 13+ asks for notification permission at that point. Android may delay these inexact alarms for battery management. Reboot/app updates restore future reminders; the calendar works without notification permission. There is no push service.

## Scope and licensing

Generated exercises, downloaded PDFs and reviewed MusicXML scores remain usable offline in Android. MusicXML/MXL support includes validation, versioned musical features, independently analyzed excerpts, review and manual score practice. No PDF-to-notes conversion or general MusicXML/MXL MIDI evaluation is implemented. MIDI accuracy describes supported note responses, not overall musicality. Manual sessions have no invented accuracy score.

The repository declares the ISC license in `package.json`; dependency and score licenses are separate. Each catalog entry preserves source, edition and stated conditions. A composer's age alone does not establish the rights of a particular scan or edition in every territory. See the release notes for the reviewed initial selection and the remaining device checks before publication.


Practice preparation includes **+ Catalogue** and a **Choose catalogue score** action on repertoire blocks. They open the catalogue in selection mode while preserving the draft and its planning/editing purpose. Choose **Use in this practice** on a downloaded PDF or a validated, analyzed MusicXML edition with identified piano parts. Personal full-score practice does not require a rights form or a separate preview first; the file and renderer are checked when opening it. Editorial/distribution approvals stay separate and unchanged. Invalid scores, stale analysis or unidentified piano parts retain explicit reasons. Selection adds or replaces one repertoire block, reuses its repertoire work, and never starts a session or downloads a score automatically. Catalogue scores use manual piano tracking; a mobile-only draft switches to the piano context as stated in the picker. Returning without selecting restores the draft unchanged.

Technique preparation exposes a **Hands** selector. In piano and MIDI contexts, **Both hands together** generates parallel one-octave scales on treble and bass staves, including on phones. Both hands share the tempo and move continuously up and down the selected scale. MIDI evaluates each pitch independently; manual piano practice only tracks time. The choice is retained in planned sessions, routines and backups. Mobile screen-input practice retains single-hand exercises. Physical USB/Bluetooth MIDI still needs device verification; automated coverage uses simulated MIDI.

Repertoire supports title/composer/tag search, favorites, stage and tag filters, sorting and pages of 40 works. Add comma-separated tags when creating or editing a work. **Delete work** in the work detail moves it to **Collection → Trash**, where it can be restored. This is recoverable deletion: files and annotations remain stored, history retains the original work identity, and existing plans/routines keep working. Trashed works are excluded from the main repertoire and new work selections. Tags, favorites and trash state are included in local backups. Deleting a work does not free score storage; the existing explicit PDF removal action is separate.

Android keeps the screen awake only while a practice is running and its session, exercise or score is visible. Pausing, leaving practice or backgrounding the app restores the device's normal screen timeout, including when a background practice timer continues. Browsing the catalogue, calendar, repertoire or a PDF outside practice does not disable automatic locking. This policy does not change the device's configured timeout.

The catalogue starts with scores that have local assets or enabled acquisition URLs. Bibliographic research and editorial tools are secondary views. Batch acquisition remains explicit and respects the existing network policy. The legacy personal-testing preference is preserved only for the stricter editorial workflow; ordinary manual practice no longer needs it. Excerpts are generated separately with **Analyze parts and excerpts**. See [repertoire integration](docs/repertoire-integration.md) for acquisition results and concrete content blockers, and [Musora integration assessment](docs/musora-integration.md) for the limits of account-linked downloads.

### Profile and two-hand sight-reading

Open the circular **Profile → Practice preferences** navigation item to set separate sight-reading and technique defaults (hands, note range and tempo; reading also includes rhythm). These defaults prefill new practices; existing routines, plans and sessions keep their settings. From **Today → Reading**, choose **Con piano** or **Piano MIDI**, then **Hands → Both hands together**. The hand selector is visible in preparation. Session-specific range and rhythm adjustments are under **Opciones**. Mobile screen-input practice uses one hand. Two-hand reading generates separate melodies and rhythms on treble and bass staves; technique uses parallel one-octave quarter-note scales. Note-range levels describe pitch span, not a certified musical difficulty grade.

Cloud destination configuration is also in Profile. Select the account and location through the system provider (Drive on Android; Files providers on iOS); SPino does not store account passwords. Android stages backup content privately before opening the picker, so PDFs are not serialized into activity-state Bundles. A persistent native setup receipt lets configuration recover when the activity is recreated.

### MIDI connection and activity

A compact keyboard indicator has its own **MIDI** navigation item, the reading toolbar and the PDF/MusicXML floating controls. Gray means no open MIDI input; green means connected; amber means connected while the practice uses a non-MIDI input mode. The upper light pulses on every received note-on, even while paused or outside a reader. Its accessible label includes the last MIDI note number. A pulse confirms incoming data, not a correct answer.

For evaluated reading, select **Piano MIDI** when preparing the practice. If a connected instrument is detected during a manual reading/technique session, **Use MIDI for this session** switches the remaining practice to MIDI while retaining the previous block result. PDFs remain manual practice; their MIDI light reports input activity without grading printed notes.

Before opening a MIDI reading exercise, SPino refreshes input bindings. Android retains output ports for each input device and reports a device only after opening a usable port; duplicate device attachment cannot replace a working connection. Web MIDI explicitly opens connected input ports and rebinds messages between sessions. Initialization is shared to avoid duplicate listeners. Native plugin destruction closes ports and unregisters its device callback.

Validation: all 154 tests passed, including consecutive reading sessions through a mocked Web MIDI port, channel messages, activity while paused, manual-to-MIDI switching and floating PDF activity. Physical USB/Bluetooth instrument acceptance remains required.

The Learn mode is currently deferred and is not offered in navigation or new practice setup. Existing learning blocks and history remain compatible with backups. Reading and technique still support scales and modes.

### Total practice duration

New practices, repertoire practice and simple weekly plans default to 40 minutes. Preparation starts with a total-duration slider; moving it redistributes whole minutes proportionally across blocks, with a minimum of one minute per block. Adding or removing a block preserves the chosen total. Individual block durations remain editable and update the total. Existing routines, plans and repeated sessions retain their saved durations until explicitly adjusted. For a single block, activity and precise minute fields are under Options to keep the start action visible on small phones. Duration remains a practice target; changing it does not change tempo.

### Profile and instrument navigation

Profile is a circular avatar at the right of the phone bar and the bottom of the tablet rail. MIDI has a separate persistent indicator and instrument screen. Profile opens a compact summary; practice defaults, backup/sync, saved scores and reminders each have their own screen. Name, weekly goal and app language are edited in a short dialog. Choose **Profile → Edit profile → Language** (English or Español). The choice applies to the notebook, practice, score annotations, catalogue, transfer messages and MIDI controls, and is saved with the notebook. New installations follow the device language (Spanish, Catalan and Galician use Spanish; other locales use English). Existing notebooks without this preference retain Spanish. Original musical titles, imported metadata, source credits and personal text are preserved. The standalone legacy reader retains its additional language resources; managed practice uses the profile preference.

**Backup & sync** combines automatic backup and multi-device sync under one connection flow. Choose a new sync file or an existing one; a one-device backup remains available as an advanced option. Connection management, conflict resolution and recovery are progressively disclosed. Export/restore remain available as manual transfers. Provider writes are not claims of completed cloud upload; the help dialog explains this distinction. Sync policies and existing links are preserved.

**Saved scores** indexes actual local assets, including PDF and MusicXML/MXL, with format, file size, search and paginated rows. Titles never imply playability. File details retain existing score, catalogue and PDF removal actions. Indexing does not change asset IDs, files, annotations or history.

**MIDI** shows the connection and received-note activity, with a Connect action and saved Bluetooth instruments on Android. Optional reconnect runs when SPino opens. Bluetooth preferences stay on this device and are excluded from notebook synchronization; USB inputs continue to be detected automatically. A disconnect pauses an exercise without dismissing the instrument setup screen. Physical MIDI testing is still required.

Validation of the Profile redesign: 164 tests pass. Responsive checks cover 320×568, 390×844, 844×390, 768×1024 and 1180×820. The installed Android smoke check covers six screens, native Back navigation, separate MIDI/Profile controls and unchanged notebook/asset hashes. Run node scripts/check-profile-design.mjs with the emulator open and practice paused to repeat it. Physical Bluetooth reconnect and actual cloud-provider uploads are outside this UI verification.

### Self-paced mobile practice

In mobile sight-reading or technique preparation, choose **Ritmo → Sin tempo**. Answer with the on-screen piano or note names. The current line remains fixed while the cursor advances after correct answers; incorrect answers count as attempts and leave the same note selected. Completing every note in the line reveals the next line. There is no count-in, metronome or missed-note deadline. The practice timer still records time spent practicing.

Self-paced reading uses a single fixed system (two bars on narrow screens, four on wider screens). Rotation preserves the current notes and line boundary. Pause, return to the session and recovery retain progress. The selected timing mode is saved with routines, plans and sessions; older blocks default to timed practice. Piano and MIDI contexts retain timed behavior. Results explicitly identify self-paced input and do not report a practice BPM or timing tolerance.

In mobile practice with the on-screen piano, deliberately moving its range pauses practice while the keys move. Releasing the range slider or a two-finger pan/pinch prepares a new line using only playable visible keys, including the correct scale accidentals. The horizontal mouse wheel applies its range after scrolling stops; recentering uses the same behavior. The score stays unchanged during the adjustment. Press Continue to read the new line. Scale, chosen clef, tempo, elapsed practice time and accumulated answers are retained, and the new paused material is saved for recovery. Releasing an unchanged range does not replace the exercise. Physical piano/MIDI and note-name practice are unaffected.
