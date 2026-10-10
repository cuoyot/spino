# SPino 5.2.0 — Practice UI update

Android versionCode: 32. Test APK version: 5.2.0-test.

## Release notes (English)

- Refined practice controls with integrated play/pause timers and cleaner mobile layouts.
- Dedicated free-practice workspace with audio/visual metronome, volume and tempo controls, and favorite tempos.
- Improved PDF annotation tools, sizing, moving/resizing simple marks and page-section alignment.
- Clearer MusicXML practice controls, editable zoom and note-linked fingering with color and size options.
- New startup spinner.

## Release notes (Spanish)

- Controles de práctica más claros, temporizador integrado y mejor diseño móvil.
- Práctica libre con metrónomo audiovisual, volumen, tempo y tempos favoritos.
- Mejoras en las anotaciones PDF, tamaños, movimiento de figuras y alineación de zonas.
- Visor MusicXML con zoom editable y digitación por nota con color y tamaño.
- Nuevo indicador de carga.

## Testing status

Testing candidate, not production acceptance. MusicXML zoom/rotation and reopening marks from disposable IndexedDB pass in four layouts. Full regression run: 254 passed, 14 failed, 1 skipped. PDF regression expectations include the previous editing exit flow and need reconciliation; do not claim all checks pass. Native MIDI/audio/touch, backup round-trip of MusicXML marks and remaining screen acceptance are open. MuseScore account integration and new repertoire MusicXML import are not included.
