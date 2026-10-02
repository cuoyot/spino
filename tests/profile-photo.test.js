import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, validateData } from '../src/companion/model.js';
import { avatarMarkup } from '../src/companion/profile-view.js';

test('profile pictures are optional image data URLs', () => {
  const data = emptyData();
  assert.equal(validateData(data).preferences.photo, undefined);
  data.preferences.photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  assert.equal(validateData(data).preferences.photo, data.preferences.photo);
  for (const photo of ['https://example.com/me.jpg', 'data:text/html;base64,PGI+', 'data:image/jpeg;base64,"><script>', 42]) {
    assert.throws(() => validateData({ ...data, preferences: { ...data.preferences, photo } }));
  }
});

test('avatar shows the picture instead of initials when present', () => {
  assert.match(avatarMarkup('Ana Pérez'), />AP</);
  const html = avatarMarkup('Ana Pérez', true, 'data:image/jpeg;base64,AAAA');
  assert.match(html, /<img src="data:image\/jpeg;base64,AAAA"/);
  assert.match(html, /cp-avatar-photo/);
  assert.doesNotMatch(html, />AP</);
});

test('photo crop keeps the frame inside the image and maps it to source pixels', async () => {
  const { cropGeometry } = await import('../src/companion/photo-crop.js');
  // 1200x800 image in a 300px frame: cover scale 0.375, centred crop is the middle 800x800.
  let g = cropGeometry(1200, 800, 300, 1, 0, 0);
  assert.deepEqual([g.sx, g.sy, g.side], [200, 0, 800]);
  // Dragging far right is clamped so the left edge of the image stays in the frame.
  g = cropGeometry(1200, 800, 300, 1, 9999, 0);
  assert.equal(g.sx, 0); assert.equal(g.cy, 0);
  // Zoom 2 halves the source side; offsets move the crop the opposite way.
  g = cropGeometry(1200, 800, 300, 2, -150, 75);
  assert.equal(g.side, 400); assert.equal(g.sx, 600); assert.equal(g.sy, 100);
});
