# Sight Reader

Android sight-reading trainer (Capacitor + VexFlow). Answer with a USB/Bluetooth MIDI keyboard, the on-screen piano, or note-name buttons.

- **Modes:** single notes, or short 2-bar melodies (quarters/halves, optionally eighths)
- **Staves:** treble, bass, or grand staff (grand staff on tablets only)
- **Timing:** *Wait* (the cursor waits for you) or *Timed* (metronome + playhead), with optional *stop on mistakes*
- **Keyboard:** fits the screen width (min 34 px per key); the slider moves it and notes are only drawn from visible keys
- **Weak notes:** tracked locally; the notes you miss show up more often

## Develop

```bash
npm install
npm run dev
```

In a desktop browser, Web MIDI and the computer keyboard (C–G, A, B; Shift = ♯, Alt = ♭) also work.

## Build the APK / run on the emulator

Toolchain is portable in `%USERPROFILE%\Android` (JDK 21, SDK, AVD `SightReader`).

```powershell
.\scripts\build-apk.ps1      # -> SightReader.apk
.\scripts\run-emulator.ps1   # boots emulator, installs, launches
```

Native MIDI (USB + Bluetooth LE) lives in `android/app/src/main/java/com/miguelcoll/sightreader/MidiPlugin.java`.
