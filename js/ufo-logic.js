// UFO-minimängu reeglid puhaste funktsioonidena (joonistamine on js/ufo.js-is).
// Brauseris: window.UfoLogic. Node'is (testid): require('./js/ufo-logic.js').
// Koordinaadid: y kasvab alla.
(function (root) {
  var BEAM_MS = 350;            // kiir põleb
  var BEAM_COOLDOWN_MS = 600;   // jahtumine pärast kiirt
  var START_LIVES = 3;
  var MAX_LIVES = 5;
  var LIFE_EVERY = 5;           // iga 5 emalaeva viidud objekti järel +1 elu
  var WIN_AT = 100;             // nii palju objekte → emalaev viib ufo kaasa
  var INVULN_MS = 1500;         // haavamatus pärast kokkupõrget
  var PER_LEVEL = 20, LEVELS = 5;
  var UFO_SCALE = [1, 1.15, 1.3, 1.45, 1.6];   // ufo kasvab iga tasemega
  var ZAP_MS = 200, ZAP_COOLDOWN_MS = 400;     // Z-laser
  var SUPER_CHARGE_MS = 30000;                 // superjõu laeng täitub 30 s
  var MISSILE_BONUS_MS = 2000;                 // iga alla lastud mürsk lisab laengut
  var SUPER_HOLD_MS = 1000;                    // Z all hoidmise aeg täis laenguga

  function newGameState() {
    return {
      lives: START_LIVES, cows: 0, men: 0, total: 0, won: false, over: false, invulnUntil: 0,
      score: 0, level: 1, charge: 0, levelUp: false
    };
  }

  function levelOf(total) { return Math.min(LEVELS, 1 + Math.floor(total / PER_LEVEL)); }

  function copy(s) { var o = {}; for (var k in s) o[k] = s[k]; return o; }

  function beamReady(now, lastBeamAt) {
    return now - lastBeamAt >= BEAM_MS + BEAM_COOLDOWN_MS;
  }

  // Objekt on kiire all, kui horisontaalsed lõigud lõikuvad ja ülaserv on kiire pikkuse piires
  function beamHits(ufo, obj, beamLen) {
    var overlap = obj.x < ufo.x + ufo.w && obj.x + obj.w > ufo.x;
    var d = obj.top - ufo.bottom;
    return overlap && d >= 0 && d <= beamLen;
  }

  function collides(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function teleport(state, kind) {
    var s = copy(state);
    if (kind === 'man') s.men++; else s.cows++;
    s.score += 10 * s.level;                       // tase enne teleporti
    s.total++;
    if (s.total % LIFE_EVERY === 0) s.lives = Math.min(MAX_LIVES, s.lives + 1);
    var lvl = levelOf(s.total);
    s.levelUp = lvl > s.level;
    if (s.levelUp) s.score += 100 * lvl;
    s.level = lvl;
    var won = s.total >= WIN_AT;
    if (won && !state.won) s.score += 500;
    s.won = won;
    return s;
  }

  function shootMissile(state) {
    var s = copy(state);
    s.score += 5 * s.level;
    s.charge = Math.min(1, s.charge + MISSILE_BONUS_MS / SUPER_CHARGE_MS);
    return s;
  }

  function chargeStep(state, dtMs) {
    var s = copy(state);
    s.charge = Math.min(1, s.charge + dtMs / SUPER_CHARGE_MS);
    return s;
  }

  // Superjõud: kõik antud objektid emalaeva, laeng tühjaks
  function superBlast(state, kinds) {
    var s = state, up = false;
    for (var i = 0; i < kinds.length; i++) { s = teleport(s, kinds[i]); up = up || s.levelUp; }
    s = copy(s);
    s.levelUp = up;
    s.charge = 0;
    return s;
  }

  // Z-laser tabab mürsu, mis on ufost paremal ja mille kõrgus lõikub ufo omaga (±3)
  function zapHits(ufo, m) {
    return m.x + m.w > ufo.x + ufo.w && m.y < ufo.y + ufo.h + 3 && m.y + m.h > ufo.y - 3;
  }

  function hit(state, now) {
    if (now < state.invulnUntil) return state;
    var s = copy(state);
    s.lives--;
    s.invulnUntil = now + INVULN_MS;
    s.over = s.lives <= 0;
    return s;
  }

  var api = {
    BEAM_MS: BEAM_MS, BEAM_COOLDOWN_MS: BEAM_COOLDOWN_MS, START_LIVES: START_LIVES, MAX_LIVES: MAX_LIVES,
    LIFE_EVERY: LIFE_EVERY, WIN_AT: WIN_AT, INVULN_MS: INVULN_MS,
    PER_LEVEL: PER_LEVEL, LEVELS: LEVELS, UFO_SCALE: UFO_SCALE, ZAP_MS: ZAP_MS, ZAP_COOLDOWN_MS: ZAP_COOLDOWN_MS,
    SUPER_CHARGE_MS: SUPER_CHARGE_MS, MISSILE_BONUS_MS: MISSILE_BONUS_MS, SUPER_HOLD_MS: SUPER_HOLD_MS,
    newGameState: newGameState, beamReady: beamReady, beamHits: beamHits, collides: collides,
    teleport: teleport, hit: hit, levelOf: levelOf, shootMissile: shootMissile, chargeStep: chargeStep,
    superBlast: superBlast, zapHits: zapHits
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UfoLogic = api;
})(this);
