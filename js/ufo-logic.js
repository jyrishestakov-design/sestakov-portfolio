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

  function newGameState() {
    return { lives: START_LIVES, cows: 0, men: 0, total: 0, won: false, over: false, invulnUntil: 0 };
  }

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
    s.total++;
    if (s.total % LIFE_EVERY === 0) s.lives = Math.min(MAX_LIVES, s.lives + 1);
    s.won = s.total >= WIN_AT;
    return s;
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
    newGameState: newGameState, beamReady: beamReady, beamHits: beamHits, collides: collides,
    teleport: teleport, hit: hit
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UfoLogic = api;
})(this);
