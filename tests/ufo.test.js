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
  assert.deepEqual(U.newGameState(), {
    lives: 3, cows: 0, men: 0, total: 0, won: false, over: false, invulnUntil: 0,
    score: 0, level: 1, charge: 0, levelUp: false
  });
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

// ---- Tasemed, punktid, laeng, Z, superjõud
test('uued konstandid', () => {
  assert.equal(U.PER_LEVEL, 20); assert.equal(U.LEVELS, 5);
  assert.deepEqual(U.UFO_SCALE, [1, 1.15, 1.3, 1.45, 1.6]);
  assert.equal(U.ZAP_MS, 200); assert.equal(U.ZAP_COOLDOWN_MS, 400);
  assert.equal(U.SUPER_CHARGE_MS, 30000); assert.equal(U.MISSILE_BONUS_MS, 2000); assert.equal(U.SUPER_HOLD_MS, 1000);
});

test('levelOf', () => {
  assert.deepEqual([0, 19, 20, 99, 100, 500].map(U.levelOf), [1, 1, 2, 5, 5, 5]);
});

test('punktid ja taseme tõus', () => {
  let s = U.teleport(U.newGameState(), 'cow');
  assert.equal(s.score, 10);
  s = times(19, 'man', s);
  assert.equal(s.level, 2); assert.equal(s.levelUp, true);
  assert.equal(s.score, 20 * 10 + 200);
  s = U.teleport(s, 'cow');
  assert.equal(s.levelUp, false); assert.equal(s.score, 400 + 20);
});

test('võiduboonus 500 täpselt ühe korra', () => {
  let s = U.newGameState(), expected = 0;
  for (let i = 0; i < 101; i++) {
    const lvl = U.levelOf(i);
    expected += 10 * lvl;
    const nl = U.levelOf(i + 1);
    if (nl > lvl) expected += 100 * nl;
    if (i + 1 === 100) expected += 500;
    s = U.teleport(s, 'cow');
  }
  assert.equal(s.won, true); assert.equal(s.level, 5);
  assert.equal(s.score, expected);
});

test('shootMissile ja chargeStep', () => {
  let s = U.shootMissile(U.newGameState());
  assert.equal(s.score, 5);
  assert.ok(Math.abs(s.charge - 2000 / 30000) < 1e-9);
  assert.equal(U.chargeStep(U.newGameState(), 30000).charge, 1);
  assert.equal(U.chargeStep(U.chargeStep(U.newGameState(), 29000), 5000).charge, 1);
});

test('superBlast: loendurid, laeng, tase, võit', () => {
  let s = U.superBlast(Object.assign(U.newGameState(), { charge: 1 }), ['cow', 'man', 'cow']);
  assert.equal(s.cows, 2); assert.equal(s.men, 1); assert.equal(s.charge, 0);
  s = U.superBlast(times(18, 'cow'), ['cow', 'man', 'cow']);
  assert.equal(s.level, 2); assert.equal(s.levelUp, true);
  s = U.superBlast(times(98, 'cow'), ['cow', 'cow', 'cow', 'man', 'man']);
  assert.equal(s.won, true); assert.ok(s.lives <= 5);
});

test('zapHits: ufost paremal ja kõrgus lõikub (±3)', () => {
  const ufo = { x: 10, y: 50, w: 24, h: 12 };
  assert.equal(U.zapHits(ufo, { x: 60, y: 55, w: 6, h: 3 }), true);
  assert.equal(U.zapHits(ufo, { x: 60, y: 70, w: 6, h: 3 }), false);
  assert.equal(U.zapHits(ufo, { x: 60, y: 64, w: 6, h: 3 }), true);
  assert.equal(U.zapHits(ufo, { x: 0, y: 55, w: 6, h: 3 }), false);
});
