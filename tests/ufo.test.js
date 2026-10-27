// UFO mängureeglite ühiktestid: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../js/ufo-logic.js');

function times(n, kind, s) { s = s || U.newGameState(); for (let i = 0; i < n; i++) s = U.teleport(s, kind); return s; }

test('konstandid vastavad spetsifikatsioonile', () => {
  assert.equal(U.BEAM_MS, 350);
  assert.equal(U.BEAM_COOLDOWN_MS, 600);
  assert.equal(U.START_LIVES, 3);
  assert.equal(U.MAX_LIVES, 5);
  assert.equal(U.LIFE_EVERY, 5);
  assert.equal(U.WIN_AT, 100);
  assert.equal(U.INVULN_MS, 1500);
});

test('newGameState: algolek', () => {
  assert.deepEqual(U.newGameState(), { lives: 3, cows: 0, men: 0, total: 0, won: false, over: false, invulnUntil: 0 });
});

test('beamHits: ufo all ja kiire ulatuses', () => {
  const ufo = { x: 100, w: 40, bottom: 50 };
  assert.equal(U.beamHits(ufo, { x: 110, w: 20, top: 120 }, 100), true);
  assert.equal(U.beamHits(ufo, { x: 150, w: 20, top: 120 }, 100), false, 'kõrval');
  assert.equal(U.beamHits(ufo, { x: 110, w: 20, top: 200 }, 100), false, 'liiga kaugel');
  assert.equal(U.beamHits(ufo, { x: 110, w: 20, top: 40 }, 100), false, 'ufost kõrgemal');
});

test('collides: piirdekastide lõikumine, servade puudutus ei loe', () => {
  assert.equal(U.collides({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(U.collides({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
});

test('teleport: loendurid eraldi, lisaelu iga 5 järel', () => {
  let s = times(4, 'cow');
  s = U.teleport(s, 'man');
  assert.equal(s.cows, 4); assert.equal(s.men, 1); assert.equal(s.total, 5); assert.equal(s.lives, 4);
});

test('teleport: elusid kuni 5', () => {
  const s = times(10, 'cow', Object.assign(U.newGameState(), { lives: 5 }));
  assert.equal(s.lives, 5);
});

test('teleport: võit täpselt 100 juures, uus mäng on puhas', () => {
  let s = times(99, 'cow');
  assert.equal(s.won, false);
  s = U.teleport(s, 'man');
  assert.equal(s.won, true); assert.ok(s.lives <= 5);
  const n = U.newGameState();
  assert.equal(n.total, 0); assert.equal(n.won, false);
});

test('teleport ei muuda sisendolekut', () => {
  const s = U.newGameState();
  U.teleport(s, 'cow');
  assert.equal(s.cows, 0);
});

test('hit: elu maha, haavamatus 1,5 s', () => {
  let s = U.hit(U.newGameState(), 1000);
  assert.equal(s.lives, 2); assert.equal(s.invulnUntil, 2500);
  assert.equal(U.hit(s, 2000).lives, 2, 'haavamatuse ajal ei kao elu');
  s = U.hit(s, 2500); assert.equal(s.lives, 1);
  s = U.hit(s, 4000); assert.equal(s.lives, 0); assert.equal(s.over, true);
});

test('beamReady: kiir + jahtumine = 950 ms', () => {
  assert.equal(U.beamReady(949, 0), false);
  assert.equal(U.beamReady(950, 0), true);
});
