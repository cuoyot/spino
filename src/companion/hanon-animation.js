import { getAppLanguage, ui } from './locale.js';

const VIDEO_ASSETS = './warmups/hanon-video-v1/';
const indexRequests = new Map();
const exerciseRequests = new Map();
const readJson = async (assets, path) => {
  const response = await fetch(assets + path);
  if (!response.ok) throw Error('Hanon animation asset unavailable');
  return response.json();
};
const getIndex = assets => {
  if (!indexRequests.has(assets)) indexRequests.set(assets, readJson(assets, 'index.json').catch(error => { indexRequests.delete(assets); throw error; }));
  return indexRequests.get(assets);
};
const getExercise = (assets, id) => {
  const key = assets + id;
  if (!exerciseRequests.has(key)) exerciseRequests.set(key, readJson(assets, `exercises/${id}.json`).catch(error => { exerciseRequests.delete(key); throw error; }));
  return exerciseRequests.get(key);
};
const handsFor = hand => hand === 'left' ? ['left'] : hand === 'right' ? ['right'] : ['left', 'right'];
const safeHand = hand => ['left', 'right'].includes(hand) ? hand : 'both';
const safeId = exercise => /^hanon-(?:[1-9]|10)$/.test(exercise?.id) ? exercise.id : 'hanon-1';
const assetsFor = () => VIDEO_ASSETS;
export const hanonNoteName = (diatonic, octave = false) => {
  const pitch = ((diatonic % 7) + 7) % 7;
  return (getAppLanguage() === 'en' ? 'CDEFGAB'[pitch] : ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'][pitch]) + (octave ? Math.floor(diatonic / 7) : '');
};

export function warmupAnimationPosterMarkup(exercise, { hand = 'both' } = {}) {
  const id = safeId(exercise);
  return `<div class="ha-poster"><img src="${assetsFor(id)}posters/${id}-${safeHand(hand)}.webp" width="720" height="400" alt="${ui('Starting hand position on the Hanon keyboard', 'Posición inicial de las manos en el teclado de Hanon')}" draggable="false"></div>`;
}

export function warmupAnimationMarkup(exercise, { hand = 'both' } = {}) {
  return `<section class="hanon-animation" data-hanon-animation data-hand="${safeHand(hand)}" aria-label="${ui('Hand movement demonstration', 'Demostración del movimiento de las manos')}">
    <div class="ha-stage">${warmupAnimationPosterMarkup(exercise, { hand })}<video width="720" height="400" muted playsinline preload="auto" disablepictureinpicture role="img" aria-label="${ui('Hanon hand movement on a fixed keyboard. Blue keys: left hand. Orange keys: right hand.', 'Movimiento de Hanon sobre un teclado fijo. Teclas azules: mano izquierda. Teclas naranjas: mano derecha.')}" hidden></video></div>
    <div class="ha-reading">${handsFor(hand).map(h => `<span class="ha-${h}">${h === 'left' ? ui('Left hand', 'Mano izquierda') : ui('Right hand', 'Mano derecha')} <b data-ha-${h}></b></span>`).join('')}<span data-ha-section></span></div>
    <div class="ha-controls"><button type="button" data-ha-play disabled>${ui('Play', 'Reproducir')}</button><button type="button" data-ha-next disabled>${ui('Next note', 'Siguiente nota')}</button><label>${ui('Speed', 'Velocidad')}<select data-ha-speed><option value="0.5">${ui('Slow', 'Lenta')}</option><option value="1" selected>${ui('Normal', 'Normal')}</option></select></label></div>
    <input class="ha-timeline" data-ha-timeline type="range" min="0" max="1439" value="3" aria-label="${ui('Demonstration position', 'Posición de la demostración')}" disabled>
    <p class="ha-status" data-ha-status role="status">${ui('Loading demonstration…', 'Cargando demostración…')}</p><button type="button" data-ha-retry hidden>${ui('Retry', 'Reintentar')}</button>
  </section>`;
}

// Complete Blender motion is baked into each video. The same canonical frame
// table drives fingering, note stepping and score callbacks at both speeds.
export function bindHanonAnimation(root, exercise, { hand = 'both', onEvent = () => {} } = {}) {
  const id = safeId(exercise), assets = assetsFor(id), video = root.querySelector('video');
  const find = name => root.querySelector(`[data-ha-${name}]`);
  const play = find('play'), next = find('next'), timeline = find('timeline'), status = find('status'), retry = find('retry');
  const shownHands = handsFor(hand), listeners = new AbortController();
  let data, index, disposed = false, ready = false, current = 3, frameCallback = 0, raf = 0, generation = 0, transport = 0, playing = false, recovering = false, supportedEvent = -1, firstPressed = [], lastPressed = [];
  const listen = (node, event, fn) => node.addEventListener(event, fn, { signal: listeners.signal });
  const cancelTick = () => { if (frameCallback) video.cancelVideoFrameCallback?.(frameCallback); cancelAnimationFrame(raf); frameCallback = raf = 0; };
  const stop = () => { playing = false; transport++; video.pause(); cancelTick(); root.dataset.playing = 'false'; play.textContent = current === data?.frames.length - 1 ? ui('Replay', 'Repetir') : ui('Play', 'Reproducir'); };
  const fail = () => {
    if (disposed) return;
    ready = false; stop(); status.textContent = ui('Could not load the demonstration. Try again.', 'No se pudo cargar la demostración. Vuelve a intentarlo.');
    status.hidden = false; retry.hidden = false; play.disabled = next.disabled = timeline.disabled = true;
  };
  function present(frameNumber) {
    if (disposed || !data) return;
    current = Math.max(0, Math.min(data.frames.length - 1, frameNumber));
    const frame = data.frames[current], event = data.events[frame[0]];
    if (frame[1]) supportedEvent = frame[0];
    for (const h of shownHands) { const e = h === 'left' ? 0 : 2; find(h).textContent = `${event[e + 1]} · ${hanonNoteName(event[e], true)}`; }
    find('section').textContent = event[4] === 2 ? ui('Final C', 'Do final') : `${event[4] === 0 ? ui('Ascending', 'Ascenso') : ui('Descending', 'Descenso')} · ${event[5] % 7 + 1} / 7`;
    timeline.value = current; next.disabled = current === data.frames.length - 1;
    video.hidden = false; root.querySelector('.ha-poster').hidden = true;
    status.hidden = retry.hidden = true; play.disabled = timeline.disabled = false;
    root.dataset.ready = 'true'; root.dataset.frame = current; root.dataset.event = frame[0]; root.dataset.pressed = Boolean(frame[1]); root.dataset.assetRevision = index.revision;
    onEvent({ event, eventIndex: frame[0], pressed: Boolean(frame[1]), frame: current });
  }
  async function acceptFrame(frameNumber, ended = false) {
    if (disposed || !playing || recovering) return;
    const target = Math.max(0, Math.min(data.frames.length - 1, frameNumber));
    const incomingEvent = data.frames[target][0], expectedEvent = supportedEvent + 1;
    if (incomingEvent > expectedEvent || (incomingEvent === expectedEvent && target > lastPressed[expectedEvent])) {
      // Decoder playback can continue while Android's JS thread is busy. Rewind
      // to the first missed note and actually show it; never merely emit unseen
      // score callbacks or let the guide skip a complete teaching event.
      const epoch = transport;
      const missed = firstPressed[expectedEvent];
      recovering = true; video.pause(); cancelTick();
      try {
        await move(missed, true);
        if (!disposed && playing && epoch === transport) await video.play();
      } catch { fail(); }
      finally { recovering = false; }
      if (playing && !disposed && epoch === transport) tick();
      return;
    }
    present(target);
    if (ended) stop(); else tick();
  }
  function tick() {
    if (disposed || !playing || video.paused) return;
    const epoch = transport;
    const receive = time => { if (epoch === transport) void acceptFrame(Math.floor(time * data.fps + 1e-4)); };
    if (video.requestVideoFrameCallback) frameCallback = video.requestVideoFrameCallback((_, metadata) => receive(metadata.mediaTime));
    else raf = requestAnimationFrame(() => receive(video.currentTime));
  }
  async function move(frameNumber, preservePlayback = false) {
    const token = ++generation, target = Math.max(0, Math.min(data.frames.length - 1, Math.round(frameNumber)));
    const time = target / data.fps;
    if (Math.abs(video.currentTime - time) > 1e-6 || video.seeking) {
      await new Promise((resolve, reject) => {
        const clean = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', error); listeners.signal.removeEventListener('abort', done); };
        const done = () => { clean(); resolve(); }, error = () => { clean(); reject(Error('Hanon video seek failed')); };
        video.addEventListener('seeked', done); video.addEventListener('error', error); listeners.signal.addEventListener('abort', done, { once: true });
        video.currentTime = time;
      });
    }
    if (!disposed && token === generation) { present(target); if (!preservePlayback) { supportedEvent = target === 0 ? -1 : data.frames[target][0]; stop(); } }
  }
  async function seek(value) { stop(); if (ready && !disposed) try { await move(value); } catch { fail(); } }
  async function start() {
    if (!ready || disposed) return;
    if (playing) { stop(); return; }
    if (current === data.frames.length - 1) await seek(0);
    if (disposed) return;
    const epoch = ++transport; playing = true;
    try { await video.play(); if (disposed || !playing || epoch !== transport) { video.pause(); return; } root.dataset.playing = 'true'; play.textContent = ui('Pause', 'Pausar'); tick(); }
    catch { if (!disposed) fail(); }
  }
  async function init() {
    retry.hidden = true; status.hidden = false; status.textContent = ui('Loading demonstration…', 'Cargando demostración…');
    try {
      [index, data] = await Promise.all([getIndex(assets), getExercise(assets, id)]);
      if (disposed) return;
      firstPressed = data.events.map((_, event) => data.frames.findIndex(f => f[0] === event && f[1]));
      lastPressed = Array(data.events.length).fill(-1); data.frames.forEach((frame, n) => { if (frame[1]) lastPressed[frame[0]] = n; });
      if (firstPressed.some(f => f < 0)) throw Error('Incomplete Hanon pressure timeline');
      video.muted = true; video.playsInline = true; video.playbackRate = Number(find('speed').value) === .5 ? .5 : 1;
      const loaded = new Promise((resolve, reject) => {
        const clean = () => { video.removeEventListener('loadeddata', done); video.removeEventListener('error', error); listeners.signal.removeEventListener('abort', done); };
        const done = () => { clean(); resolve(); }, error = () => { clean(); reject(Error('Hanon video unavailable')); };
        video.addEventListener('loadeddata', done); video.addEventListener('error', error); listeners.signal.addEventListener('abort', done, { once: true });
      });
      video.src = assets + data.videos[safeHand(hand)].file; video.load(); await loaded;
      if (disposed) return;
      if (video.videoWidth !== index.width || video.videoHeight !== index.height) throw Error('Unexpected Hanon video size');
      ready = true; timeline.max = data.frames.length - 1; await move(current);
    } catch { fail(); }
  }
  listen(play, 'click', start);
  listen(next, 'click', () => { if (!ready) return; const note = data.frames[current][0] + 1; const target = data.frames.findIndex(f => f[0] === note && f[1]); if (target >= 0) seek(target); });
  listen(timeline, 'input', () => seek(Number(timeline.value)));
  listen(find('speed'), 'change', () => { video.playbackRate = Number(find('speed').value) === .5 ? .5 : 1; });
  listen(video, 'ended', () => { void acceptFrame(data.frames.length - 1, true); });
  listen(video, 'error', fail); listen(video, 'pause', () => { if (playing && !recovering && video.paused && !video.ended) stop(); });
  listen(retry, 'click', init); listen(document, 'visibilitychange', () => { if (document.hidden) stop(); });
  root.hanonPlayer = { seek, pause: stop }; init();
  return () => { disposed = true; generation++; ready = false; stop(); listeners.abort(); video.removeAttribute('src'); video.load(); delete root.hanonPlayer; };
}
