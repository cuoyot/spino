import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HANON, warmupCycle } from '../src/companion/warmups.js';

const asset = path => new URL(`../public/warmups/hanon-frames-v1/${path}`, import.meta.url);
const json = async path => JSON.parse(await readFile(asset(path), 'utf8'));

test('all ten packaged animations follow the score in both directions on one fixed keyboard', async () => {
  const index = await json('index.json');
  assert.deepEqual([index.width, index.height, index.board.left, index.board.keyWidth, index.board.count], [1080, 600, 34, 44, 23]);
  assert.equal(index.exercises.length, 10);
  assert.equal(index.sprites.length, 2544);
  for (const exercise of HANON) {
    const animation = await json(`exercises/${exercise.id}.json`), cycle = warmupCycle(exercise);
    const right = cycle.notes.filter(n => n.clef === 'treble'), left = cycle.notes.filter(n => n.clef === 'bass');
    assert.equal(animation.events.length, right.length);
    assert.equal(animation.frames.length, 1440);
    animation.events.forEach((event, i) => {
      assert.deepEqual(event, [left[i].d, left[i].finger, right[i].d, right[i].finger, ['up', 'down', 'end'].indexOf(right[i].section), Math.floor(i / 8)], `${exercise.id} note ${i}`);
    });
    const touched = new Set();
    for (const frame of animation.frames) {
      const event = animation.events[frame[0]];
      assert.ok(event);
      if (frame[1]) touched.add(frame[0]);
      for (const k of [2, 5]) {
        const sprite = index.sprites[frame[k]];
        assert.ok(sprite, `${exercise.id} has a missing hand frame`);
        const [pack, sx, sy, sw, sh, x, y, w, h] = sprite, sheet = index.packs[pack];
        assert.ok(sx >= 0 && sy >= 0 && sx + sw <= sheet.width && sy + sh <= sheet.height);
        assert.equal(w, sw); assert.equal(h, sh);
        assert.ok(x + frame[k + 1] >= 0 && x + w + frame[k + 1] <= index.width);
        assert.ok(y + frame[k + 2] >= 0 && y + h + frame[k + 2] <= index.height);
      }
    }
    assert.equal(touched.size, right.length, `${exercise.id} must show every played note`);
  }
});

test('packaged hand sheets stay within a mobile decoded-memory budget and include their licence', async () => {
  const index = await json('index.json');
  for (const pack of index.packs) {
    assert.ok(pack.width * pack.height * 4 < 7 * 1024 * 1024);
    assert.equal((await readFile(asset(pack.file))).byteLength, pack.bytes);
  }
  assert.match(await readFile(asset('HAND-ASSET-LICENSE.txt'), 'utf8'), /MIT|Permission is hereby granted/);
});

test('reviewed No. 1 includes every score event and complete native frames for all three hand modes', async () => {
  const root = new URL('../public/warmups/hanon-frames-v2/', import.meta.url);
  const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
  const index = await read('index.json'), animation = await read('exercises/hanon-1.json');
  assert.deepEqual([index.width, index.height, animation.fps], [1080, 600, 24]);
  assert.ok(index.revision);
  assert.equal(index.sourceSha256, 'e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b');
  assert.equal(index.bakedKeys, true);
  assert.equal(animation.composition, 'single-mode-sprite');
  assert.equal(animation.frames.length, 1440);
  assert.equal(animation.both.length, animation.frames.length);
  assert.deepEqual(animation.nativeFrames, Array.from({ length: 1440 }, (_, i) => i === 1439 ? 2880 : 1 + 2 * i));
  const notes = warmupCycle(HANON[0]).notes, left = notes.filter(n => n.clef === 'bass'), right = notes.filter(n => n.clef === 'treble');
  assert.equal(animation.events.length, right.length);
  animation.events.forEach((event, i) => assert.deepEqual(event, [left[i].d, left[i].finger, right[i].d, right[i].finger, ['up', 'down', 'end'].indexOf(right[i].section), Math.floor(i / 8)]));
  const touched = new Set();
  animation.frames.forEach((frame, number) => {
    assert.ok(animation.events[frame[0]]);
    if (frame[1]) touched.add(frame[0]);
    assert.deepEqual([frame[3], frame[4], frame[6], frame[7]], [0, 0, 0, 0], 'Native frames must not be translated into another key position');
    for (const id of [frame[2], frame[5], animation.both[number]]) {
      const sprite = index.sprites[id]; assert.ok(sprite);
      const [pack, sx, sy, sw, sh, x, y, w, h] = sprite, sheet = index.packs[pack];
      assert.ok(sheet && sx >= 0 && sy >= 0 && sx + sw <= sheet.width && sy + sh <= sheet.height);
      assert.deepEqual([w, h], [sw, sh], 'Native scale must stay invariant');
      assert.ok(x >= 0 && y >= 0 && x + w <= index.width && y + h <= index.height);
    }
  });
  assert.equal(touched.size, right.length);
  assert.equal(animation.frames.at(-1)[0], right.length - 1);
  assert.equal(animation.frames.at(-1)[1], 0, 'The final native frame releases its key');
  for (const pack of index.packs) {
    assert.ok(pack.width <= 2048 && pack.height <= 2048);
    assert.ok(pack.width * pack.height * 4 < 7 * 1024 * 1024);
    assert.equal((await readFile(new URL(pack.file, root))).byteLength, pack.bytes);
  }
  for (const hand of ['left', 'right', 'both']) assert.ok((await readFile(new URL(`posters/hanon-1-${hand}.webp`, root))).length > 0);
  assert.match(await readFile(new URL('LICENSE.txt', root), 'utf8'), /MIT|Permission is hereby granted/);
});

test('complete native Nos. 2–10 bank preserves score coverage, independent hand modes and bounded AVIF packs', async () => {
  const root = new URL('../public/warmups/hanon-frames-v3/', import.meta.url);
  const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
  const index = await read('index.json');
  assert.deepEqual([index.version, index.width, index.height, index.fps, index.maxPacks], [3, 720, 400, 24, 8]);
  assert.equal(index.revision, '2026-10-20-complete-blender-hanon-2-10-static');
  assert.equal(index.sourceSha256, 'e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b');
  assert.equal(index.bakedKeys, true);
  assert.equal(index.composition, 'single-mode-sprite');
  assert.deepEqual(index.exercises.map(e => e.id), HANON.slice(1).map(e => e.id));
  const accepted = JSON.parse(await readFile(new URL('../public/warmups/hanon-frames-v2/index.json', import.meta.url), 'utf8'));
  for (const key of ['width', 'height', 'left', 'keyWidth', 'top', 'bottom', 'blackBottom']) {
    assert.ok(Math.abs(index.board[key] - accepted.board[key] * 2 / 3) < 1e-9, `Fixed keyboard ${key}`);
  }
  assert.equal(index.board.firstDiatonic, accepted.board.firstDiatonic);
  assert.equal(index.board.count, accepted.board.count);
  const modes = { left: new Set(), right: new Set(), both: new Set() };
  for (const exercise of HANON.slice(1)) {
    const animation = await read(`exercises/${exercise.id}.json`);
    const notes = warmupCycle(exercise).notes, left = notes.filter(n => n.clef === 'bass'), right = notes.filter(n => n.clef === 'treble');
    assert.equal(animation.id, exercise.id);
    assert.equal(animation.composition, 'single-mode-sprite');
    assert.equal(animation.fps, 24);
    assert.equal(animation.events.length, 113);
    assert.equal(animation.frames.length, 1440);
    assert.equal(animation.both.length, 1440);
    assert.deepEqual(animation.nativeFrames, Array.from({ length: 1440 }, (_, i) => i === 1439 ? 2880 : 1 + 2 * i));
    animation.events.forEach((event, i) => assert.deepEqual(event, [left[i].d, left[i].finger, right[i].d, right[i].finger, ['up', 'down', 'end'].indexOf(right[i].section), Math.floor(i / 8)], `${exercise.id} canonical note ${i}`));
    const touched = new Set();
    animation.frames.forEach((frame, number) => {
      assert.ok(animation.events[frame[0]], `${exercise.id} frame ${number}`);
      if (frame[1]) touched.add(frame[0]);
      assert.deepEqual([frame[3], frame[4], frame[6], frame[7]], [0, 0, 0, 0], 'Native hands cannot be shifted onto another key');
      for (const [mode, id] of [['left', frame[2]], ['right', frame[5]], ['both', animation.both[number]]]) {
        modes[mode].add(id);
        const sprite = index.sprites[id]; assert.ok(sprite, `${exercise.id} missing ${mode} image`);
        const [pack, sx, sy, sw, sh, x, y, w, h] = sprite, sheet = index.packs[pack];
        assert.ok(sheet && sx >= 0 && sy >= 0 && sx + sw <= sheet.width && sy + sh <= sheet.height);
        assert.deepEqual([w, h], [sw, sh], 'Native image scale must remain invariant');
        assert.ok(x >= 0 && y >= 0 && x + w <= index.width && y + h <= index.height);
      }
    });
    assert.equal(touched.size, 113, `${exercise.id} must show every played note`);
    assert.equal(animation.frames.at(-1)[0], 112);
    assert.equal(animation.frames.at(-1)[1], 0, 'Final native key release');
    for (const hand of Object.keys(modes)) assert.ok((await readFile(new URL(`posters/${exercise.id}-${hand}.webp`, root))).length > 0);
  }
  for (const id of modes.both) assert.ok(!modes.left.has(id) && !modes.right.has(id), 'Both hands require their independently rendered view');
  for (const id of modes.left) assert.ok(!modes.right.has(id), 'Solo hand views must stay independent');
  assert.equal(new Set([...modes.left, ...modes.right, ...modes.both]).size, index.sprites.length, 'No unreferenced production images');
  for (const pack of index.packs) {
    assert.ok(pack.width <= 2048 && pack.height <= 2048);
    assert.ok(pack.width * pack.height * 4 < 5 * 1024 * 1024);
    assert.match(pack.file, /\.avif$/);
    const bytes = await readFile(new URL(pack.file, root));
    assert.equal(bytes.byteLength, pack.bytes);
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
    assert.match(bytes.toString('ascii', 8, 32), /avif/);
  }
  assert.ok((await readFile(new URL(index.keyboard, root))).length > 0);
  assert.match(await readFile(new URL('LICENSE.txt', root), 'utf8'), /MIT|Permission is hereby granted/);
});
