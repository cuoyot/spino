# Piano playback samples

`public/piano` contains offline playback samples rendered from the same FreePats YDP Grand Piano SoundFont used by the Hanon Blender video. The original credits, CC BY 3.0 attribution, TinySoundFont MIT notice and source hashes ship with the samples.

`render-piano.c` takes the original SoundFont path and an output directory. Compile with `clang -O2 -I<directory-containing-tsf.h> scripts/midi/render-piano.c -o render-piano`, then run `render-piano <soundfont.sf2> <output-directory>`. Encode each generated PCM file with `ffmpeg -f s16le -ar 32000 -ac 1 -i <note-velocity.pcm> -c:a libmp3lame -b:a 48k <note-velocity.mp3>`.

Each of the 88 piano keys has three velocity layers (40, 80, 120), rendered for 12 seconds. Web Audio applies recorded key releases and sustain. Extremely long held notes decay to the end of their sample; exported MIDI retains the original full durations and controller events. Samples outside the piano's range use pitch shifting of the nearest endpoint. No piano assets are required to record or export MIDI.

MIDI takes are stored directly as Standard MIDI Files (format 0, 500 PPQN, tempo 120 BPM). This fixed timebase represents capture milliseconds; it does not infer a performance tempo or quantize playing to a musical grid. All captured note and control-change channels are retained. Capture stops at 15 minutes, 100,000 events, app backgrounding or a MIDI connection change, appending pedal/key releases. Playback is piano-only; MIDI export can use other instruments in external programs.

Recording uses Android input timestamps (nanoseconds converted to milliseconds before the JavaScript bridge) or Web MIDI event timestamps, relative to the first note. Export rounds to the nearest millisecond. Playback renders PCM in bounded 20-second offline segments, then plays one buffer; UI timers only update transport labels. Rendered PCM timing does not establish hardware end-to-end latency. The 15-minute mono buffer at 32 kHz uses about 115 MB plus piano samples; preparation precedes playback.
