import { getAppLanguage, ui } from './locale.js';

const COMPLETE_ASSETS = './warmups/hanon-frames-v3/';
const REVIEWED_ASSETS = './warmups/hanon-frames-v2/';
const MAX_PACKS = 8;
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
const assetsFor = id => id === 'hanon-1' ? REVIEWED_ASSETS : COMPLETE_ASSETS;
export const hanonNoteName = (diatonic, octave = false) => {
  const pitch = ((diatonic % 7) + 7) % 7;
  return (getAppLanguage() === 'en' ? 'CDEFGAB'[pitch] : ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'][pitch]) + (octave ? Math.floor(diatonic / 7) : '');
};

export function warmupAnimationPosterMarkup(exercise, { hand = 'both' } = {}) {
  const id = safeId(exercise);
  return `<div class="ha-poster"><img src="${assetsFor(id)}posters/${id}-${safeHand(hand)}.webp" width="1080" height="600" alt="${ui('Starting hand position on the Hanon keyboard', 'Posición inicial de las manos en el teclado de Hanon')}" draggable="false"></div>`;
}

export function warmupAnimationMarkup(exercise, { hand = 'both' } = {}) {
  return `<section class="hanon-animation" data-hanon-animation data-hand="${safeHand(hand)}" aria-label="${ui('Hand movement demonstration', 'Demostración del movimiento de las manos')}">
    <div class="ha-stage">${warmupAnimationPosterMarkup(exercise, { hand })}<canvas width="1080" height="600" role="img" aria-label="${ui('Hanon hand movement on a fixed keyboard. Blue keys: left hand. Orange keys: right hand.', 'Movimiento de Hanon sobre un teclado fijo. Teclas azules: mano izquierda. Teclas naranjas: mano derecha.')}" hidden></canvas></div>
    <div class="ha-reading">${handsFor(hand).map(h => `<span class="ha-${h}">${h === 'left' ? ui('Left hand', 'Mano izquierda') : ui('Right hand', 'Mano derecha')} <b data-ha-${h}></b></span>`).join('')}<span data-ha-section></span></div>
    <div class="ha-controls"><button type="button" data-ha-play disabled>${ui('Play', 'Reproducir')}</button><button type="button" data-ha-next disabled>${ui('Next note', 'Siguiente nota')}</button><label>${ui('Speed', 'Velocidad')}<select data-ha-speed><option value="0.5">${ui('Slow', 'Lenta')}</option><option value="1" selected>${ui('Normal', 'Normal')}</option></select></label></div>
    <input class="ha-timeline" data-ha-timeline type="range" min="0" max="1439" value="3" aria-label="${ui('Demonstration position', 'Posición de la demostración')}" disabled>
    <p class="ha-status" data-ha-status role="status">${ui('Loading demonstration…', 'Cargando demostración…')}</p><button type="button" data-ha-retry hidden>${ui('Retry', 'Reintentar')}</button>
  </section>`;
}

async function loadBitmap(assets, path) {
  const response = await fetch(assets + path);
  if (!response.ok) throw Error('Hanon image unavailable');
  const blob = await response.blob();
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  const image = new Image(), url = URL.createObjectURL(blob);
  try { image.src = url; await image.decode(); return image; }
  finally { URL.revokeObjectURL(url); }
}

// All geometry and articulation are baked into the source frames. The player only
// composes fixed-size sprites over one keyboard, with a bounded decoded cache.
export function bindHanonAnimation(root, exercise, { hand = 'both', onEvent = () => {} } = {}) {
  const id = safeId(exercise), assets = assetsFor(id);
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const find = name => root.querySelector(`[data-ha-${name}]`);
  const play = find('play'), next = find('next'), timeline = find('timeline'), status = find('status'), retry = find('retry');
  const shownHands = handsFor(hand), packs = new Map(), pending = new Map(), listeners = new AbortController();
  let requestedPacks = new Set();
  let data, index, keyboard, disposed = false, ready = false, playing = false, current = 3, speed = 1, raf = 0, generation = 0, lastTime = 0, carry = 0;
  const listen = (node, event, fn) => node.addEventListener(event, fn, { signal: listeners.signal });
  const stop = () => { playing = false; carry = 0; cancelAnimationFrame(raf); root.dataset.playing = 'false'; play.textContent = current === data?.frames.length - 1 ? ui('Replay', 'Repetir') : ui('Play', 'Reproducir'); };
  const fail = () => {
    if (disposed) return;
    stop(); status.textContent = ui('Could not load the demonstration. Try again.', 'No se pudo cargar la demostración. Vuelve a intentarlo.');
    status.hidden = false; retry.hidden = false; play.disabled = true; next.disabled = true; timeline.disabled = true;
  };
  const touch = id => { const bitmap = packs.get(id); if (bitmap) { packs.delete(id); packs.set(id, bitmap); } return bitmap; };
  const loadPack = id => {
    const cached = touch(id);
    if (cached) return Promise.resolve(cached);
    if (!pending.has(id)) pending.set(id, loadBitmap(assets, index.packs[id].file).then(bitmap => {
      if (disposed) { bitmap.close?.(); return null; }
      packs.set(id, bitmap);
      while (packs.size > MAX_PACKS) {
        const oldest = [...packs.keys()].find(key => !requestedPacks.has(key));
        packs.get(oldest).close?.(); packs.delete(oldest);
      }
      return bitmap;
    }).finally(() => pending.delete(id)));
    return pending.get(id);
  };
  const singleMode = () => data.composition === 'single-mode-sprite' && shownHands.length === 2;
  const spriteIds = (frame, number) => singleMode()
    ? [index.sprites[data.both[number]][0]]
    : shownHands.map(h => index.sprites[frame[h === 'left' ? 2 : 5]][0]);
  const hasBlackAfter = d => ((d % 7) + 7) % 7 !== 2 && ((d % 7) + 7) % 7 !== 6;
  function heldKey(d, h) {
    const b = index.board, x = b.left + (d - b.firstDiatonic) * b.keyWidth + 1, w = b.keyWidth - 2;
    const top = b.top + 1, bottom = b.bottom - 1, neck = b.blackBottom + 1;
    const li = hasBlackAfter(d - 1) ? 14 : 0, ri = hasBlackAfter(d) ? 14 : 0;
    const fill = ctx.createLinearGradient(0, top, 0, bottom);
    fill.addColorStop(0, h === 'left' ? '#b5d5fa' : '#f8d2a1'); fill.addColorStop(1, h === 'left' ? '#6ca7ed' : '#f1aa61'); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(x + li, top); ctx.lineTo(x + w - ri, top); ctx.lineTo(x + w - ri, neck); ctx.lineTo(x + w, neck); ctx.lineTo(x + w, bottom); ctx.lineTo(x, bottom); ctx.lineTo(x, neck); ctx.lineTo(x + li, neck); ctx.closePath(); ctx.fill();
  }
  async function draw(frameNumber) {
    const token = ++generation, frame = data.frames[frameNumber];
    requestedPacks = new Set(spriteIds(frame, frameNumber));
    await Promise.all([...requestedPacks].map(loadPack));
    if (disposed || token !== generation) return false;
    current = frameNumber;
    const event = data.events[frame[0]];
    ctx.clearRect(0, 0, index.width, index.height); ctx.drawImage(keyboard, 0, 0);
    if (frame[1] && !index.bakedKeys) for (const h of shownHands) heldKey(event[h === 'left' ? 0 : 2], h);
    const layers = singleMode() ? ['both'] : shownHands;
    for (const h of layers) {
      const k = h === 'left' ? 2 : 5;
      const [id, sx, sy, sw, sh, x, y, w, height] = index.sprites[h === 'both' ? data.both[frameNumber] : frame[k]];
      ctx.drawImage(touch(id), sx, sy, sw, sh, x + (h === 'both' ? 0 : frame[k + 1]), y + (h === 'both' ? 0 : frame[k + 2]), w, height);
    }
    for (const h of shownHands) {
      const e = h === 'left' ? 0 : 2;
      find(h).textContent = `${event[e + 1]} · ${hanonNoteName(event[e], true)}`;
    }
    find('section').textContent = event[4] === 2 ? ui('Final C', 'Do final') : `${event[4] === 0 ? ui('Ascending', 'Ascenso') : ui('Descending', 'Descenso')} · ${event[5] % 7 + 1} / 7`;
    timeline.value = current; next.disabled = current === data.frames.length - 1;
    if (!playing) play.textContent = current === data.frames.length - 1 ? ui('Replay', 'Repetir') : ui('Play', 'Reproducir');
    canvas.hidden = false; root.querySelector('.ha-poster').hidden = true;
    status.hidden = true; retry.hidden = true; play.disabled = false; timeline.disabled = false;
    root.dataset.ready = 'true'; root.dataset.frame = current; root.dataset.event = frame[0]; root.dataset.pressed = Boolean(frame[1]);
    root.dataset.assetRevision = index.revision;
    onEvent({ event, eventIndex: frame[0], pressed: Boolean(frame[1]), frame: current });
    for (const offset of [1, 4]) {
      const number = Math.min(current + offset, data.frames.length - 1), future = data.frames[number];
      for (const id of spriteIds(future, number)) loadPack(id).catch(() => {});
    }
    return true;
  }
  async function seek(value) {
    stop(); if (!ready || disposed) return;
    try { await draw(Math.max(0, Math.min(data.frames.length - 1, Math.round(value)))); }
    catch { fail(); }
  }
  async function tick(now) {
    if (!playing || disposed) return;
    // The first Android WebView callback can predate performance.now() by one
    // display interval. A negative carry must never seek before frame zero.
    carry += Math.max(0, Math.min(.1, (now - lastTime) / 1000)) * data.fps * speed; lastTime = now;
    const advance = Math.floor(carry);
    if (advance) {
      carry -= advance;
      const frameNumber = Math.min(data.frames.length - 1, current + advance), missing = spriteIds(data.frames[frameNumber], frameNumber).some(id => !packs.has(id));
      try { await draw(frameNumber); } catch { fail(); return; }
      // Decoding a new pack pauses demonstration time rather than skipping notes.
      if (missing) { carry = 0; lastTime = performance.now(); }
      if (current === data.frames.length - 1) stop();
    }
    if (playing && !disposed) raf = requestAnimationFrame(tick);
  }
  async function start() {
    if (!ready || disposed) return;
    if (playing) { stop(); return; }
    if (current === data.frames.length - 1) await seek(0);
    if (disposed) return;
    playing = true; root.dataset.playing = 'true'; play.textContent = ui('Pause', 'Pausar'); carry = 0; lastTime = performance.now(); raf = requestAnimationFrame(tick);
  }
  async function init() {
    retry.hidden = true; status.hidden = false; status.textContent = ui('Loading demonstration…', 'Cargando demostración…');
    try {
      [index, data] = await Promise.all([getIndex(assets), getExercise(assets, id)]);
      if (disposed) return;
      canvas.width = index.width; canvas.height = index.height;
      keyboard ||= await loadBitmap(assets, index.keyboard);
      if (disposed) { keyboard.close?.(); return; }
      ready = true; timeline.max = data.frames.length - 1; await draw(current);
    } catch { fail(); }
  }
  listen(play, 'click', start);
  listen(next, 'click', () => {
    if (!ready) return;
    const note = data.frames[current][0] + 1;
    const target = data.frames.findIndex(f => f[0] === note && f[1]);
    if (target >= 0) seek(target);
  });
  listen(timeline, 'input', () => seek(Number(timeline.value)));
  listen(find('speed'), 'change', () => { speed = Number(find('speed').value) === .5 ? .5 : 1; carry = 0; });
  listen(retry, 'click', init);
  listen(document, 'visibilitychange', () => { if (document.hidden) stop(); });
  root.hanonPlayer = { seek, pause: stop };
  init();
  return () => {
    disposed = true; generation++; stop(); listeners.abort(); keyboard?.close?.();
    for (const bitmap of packs.values()) bitmap.close?.();
    packs.clear(); delete root.hanonPlayer;
  };
}
