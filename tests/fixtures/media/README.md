`two-minute-stream.webm` is a disposable synthetic 440 Hz tone, encoded as Opus
with no finalized WebM duration. It reproduces the MediaRecorder timeline issue
without using any personal recording. Generate it with:

```sh
ffmpeg -f lavfi -i 'sine=frequency=440:sample_rate=48000:duration=120' -c:a libopus -b:a 6k -application voip -live 1 two-minute-stream.webm
```

The browser regression opens it as a legacy local take, checks a 120-second
timeline before playback, verifies roughly 4.2% progress after five seconds,
seeks and resumes at one minute, reopens at zero, and checks stored take retention.
