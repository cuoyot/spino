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
