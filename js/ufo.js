// UFO — minimäng (öine lendav taldrik, lehmad ja Men in Black). Käivita: window.startUfo(mountEl, texts)
// Reeglid on failis js/ufo-logic.js (window.UfoLogic). Ehitus järgib js/viking.js mustrit.
window.startUfo = function (mount, texts) {
  if (!mount) return null;
  var U = window.UfoLogic;
  texts = texts || {};

  // ---------- seaded ----------
  var TOUCH = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var TEST = window.__UFO_TEST__ === true;   // testirežiim: juhuslikke takistusi ei tule
  var LOGICAL_H = 104, GROUND = 94;
  var BEAM_LEN = LOGICAL_H * 0.5;             // kiire pikkus = pool mänguala kõrgusest
  var UFO_X = 0.22;                           // ufo asukoht (osa laiusest)
  var Y_MIN = 16;                             // ufo kõrgeim asend (HUD-i all)
  var LIFT = 1.5, SINK_ACC = 0.025, SINK_MAX = 0.6;
  var SPEED_START = 1.2, SPEED_MAX = 3.2, SPEED_ACC = 0.0004;
  var MOVE = 1.4, X_MIN = 4;                  // ← → sõit ekraanil
  // Parallaks: pilvekihid (kaugemad aeglasemad), udu ja kauged tuled
  var CLOUD_LAYERS = [
    { k: 0.08, alpha: 0.22, yMin: 22, yMax: 40, r: 5, per: 70, col: '#3a4258' },
    { k: 0.2, alpha: 0.32, yMin: 30, yMax: 52, r: 8, per: 95, col: '#454e68' },
    { k: 0.45, alpha: 0.42, yMin: 40, yMax: 62, r: 12, per: 140, col: '#545e7c' }
  ];
  var LIGHT_K = 0.12, FOG_K = [0.7, 1.35];
  var IDLE_TO_DEMO = 12000;
  var RISE_MS = 400;                          // teleporteeritav objekt tõuseb ja kaob

  // ---------- pikslipildid (tekstikaardid → canvas) ----------
  var PAL = {
    c: 'rgba(170,225,255,.55)', C: '#dff6ff',            // klaaskuppel, läige
    g: '#6fe36b', G: '#3fae3d', k: '#0b0c10',            // tulnukas, silmad
    m: '#c9ced8', M: '#8e95a3', d: '#5d6472',            // metall hele / kesk / tume
    e: '#9dff9a',                                         // kiirgur
    w: '#f2efe8', K: '#1a1a1d', p: '#f4a3b4', h: '#e9dfc4', t: '#2b2b2f', // lehm
    s: '#e7c3a1', S: '#2f3442', A: '#454b5e', W: '#f4f4f4', n: '#111318', b: '#050507' // MIB
  };
  // Read on tsentreeritud (sama pikkusega read = sümmeetriline kuju)
  var UFO_ROWS = [
    'cCcc', 'cggggc', 'cgkggkgc', 'cgkggkgc', 'ccggggcc', 'cccggccc',
    'mmmmmmmmmmmmmm', 'mmmmmmmmmmmmmmmmmmmmmm', 'MLMLMLMLMLMLMLMLMLMLMLML',
    'dddddddddddddddddddd', 'dddddddddddd', 'eeee'
  ];
  var COW_ROWS = [
    '.h...h.............',
    '.wwwww.............',
    'wKwwwKwwwwwwKKwwww.',
    'wwwwwwwwKKwwKKKwwwt',
    '.ppppwwwKKKwwwwwwwt',
    '..pp.wwwwwwwwKKwwww',
    '.....wwwwwwwwwwwppw',
    '.....ww.ww...ww.ww.',
    '.....KK.KK...KK.KK.'
  ];
  var MAN_ROWS = [
    '..nnnn..', '..ssss..', '.bbbbbb.', '..ssss..', '...ss...',
    '.SSWWSS.', 'SSSWWSSS', 'SASWnSAS', 'SASWnSAS', 'SASWnSAS',
    'sSSSSSSs', '.SSSSSS.', '.SS..SS.', '.SS..SS.', '.SS..SS.', 'bbb..bbb'
  ];

  function sprite(rows, centered, pal) {
    var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    var x = c.getContext('2d');
    rows.forEach(function (r, y) {
      var off = centered ? Math.floor((w - r.length) / 2) : 0;
      for (var i = 0; i < r.length; i++) {
        var col = (pal && pal[r[i]]) || PAL[r[i]];
        if (!col) continue;
        x.fillStyle = col; x.fillRect(off + i, y, 1, 1);
      }
    });
    return c;
  }
  var UFO_A = sprite(UFO_ROWS, true, { L: '#ff4d6d' });
  var UFO_B = sprite(UFO_ROWS, true, { L: '#ffd166' });
  var COW = sprite(COW_ROWS, false);
  // MIB jooksuanimatsioon: 4 kaadrit, vahetuvad ainult jalgade (viimased 4) read
  var LEGS = [
    ['.SS..SS.', '.SS..SS.', '.SS..SS.', 'bbb..bbb'],
    ['..SSSS..', '.SS..SS.', 'SS....SS', 'bb....bb'],
    ['...SS...', '...SS...', '..SSSS..', '..bbbb..'],
    ['..SSSS..', '.SS..SS.', '.SS...SS', 'bb....bb']
  ];
  var MAN_RUN = LEGS.map(function (legs) { return sprite(MAN_ROWS.slice(0, 12).concat(legs), false); });
  var MAN = MAN_RUN[0];
  var MAN_SCALE = 1.4, MAN_RUN_SPEED = 0.4;   // MIB-mehed on suuremad ja jooksevad (põgenevad)
  var UFO_W = UFO_A.width, UFO_H = UFO_A.height;
  var COW_SIZES = [1, 1.5, 2];
  var MISSILE_W = 6, MISSILE_H = 3;

  // ---------- canvas ----------
  var cv = document.createElement('canvas');
  cv.style.cssText = 'width:100%;height:100%;display:block';
  cv.setAttribute('aria-label', 'UFO: nooled üles-alla lendavad, X laserkiir');
  mount.appendChild(cv);
  var ctx = cv.getContext('2d');
  var scale = 2, LW = 300, dpr = 1, stars = [], clouds = [], lights = [], paraX = 0;

  function resize() {
    var r = mount.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = window.devicePixelRatio || 1;
    scale = r.height / LOGICAL_H;
    LW = r.width / scale;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    stars = [];
    for (var i = 0; i < LW / 4; i++) stars.push({ x: Math.random() * LW, y: Math.random() * (GROUND - 20), p: Math.random() * 6.28 });
    clouds = [];
    CLOUD_LAYERS.forEach(function (L, li) {
      var n = Math.max(2, Math.round(LW / L.per));
      for (var j = 0; j < n; j++) clouds.push({ L: li, x: (j + Math.random() * 0.8) * (LW + 60) / n, y: L.yMin + Math.random() * (L.yMax - L.yMin), s: 0.7 + Math.random() * 0.6 });
    });
    lights = [];
    for (var m = 0; m < LW / 26; m++) lights.push({ x: Math.random() * LW, p: Math.random() * 6.28, c: Math.random() < 0.7 ? '#ffd27a' : '#ff9a5a' });
  }
  new ResizeObserver(resize).observe(mount);
  resize();

  // ---------- olek ----------
  var mode = 'demo';                // 'demo' | 'play' | 'over' | 'win'
  var state, ufo, obs, speed, nextGap, lastBeamAt, beamUntil, groundX, overAt, win, banner, frame;
  var missiles, nextMissile, lastZapAt, zapUntil, zHeld, zHeldSince, chargeFullAt, flash, superT;
  var keyUp = false, keyDown = false, keyFwd = false, keyBack = false;
  var hi = 0;
  try { hi = +localStorage.getItem('ufoHi') || 0; } catch (e) {}

  function reset() {
    state = U.newGameState();
    ufo = { x: Math.round(LW * UFO_X), y: 40, vy: 0 };
    obs = []; speed = SPEED_START; nextGap = 60; lastBeamAt = -1e9; beamUntil = 0; groundX = 0;
    win = null; banner = null; frame = 0;
    missiles = []; nextMissile = 6000; lastZapAt = -1e9; zapUntil = 0;
    zHeld = false; zHeldSince = 0; chargeFullAt = 0; flash = 0; superT = 0;
    keyUp = keyDown = keyFwd = keyBack = false;   // demo-autopiloodi klahvid ei tohi mängu jääda
  }

  // ---------- Z-laser ja superjõud ----------
  function zap(now) {
    if (now - lastZapAt < U.ZAP_MS + U.ZAP_COOLDOWN_MS) return;
    lastZapAt = now; zapUntil = now + U.ZAP_MS;
  }
  function pressZ(now) { zHeld = true; zHeldSince = now; zap(now); }
  function setCharge(s, now) {               // jätab meelde, millal laeng täis sai
    if (state.charge < 1 && s.charge >= 1) chargeFullAt = now;
    state = s;
  }
  function doSuper(now) {
    var kinds = [];
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.rise < 0 && o.x < LW && o.x + o.w > 0) { o.rise = 0; kinds.push(o.kind); }
    }
    state = U.superBlast(state, kinds);
    missiles = []; flash = 1; superT = 70; chargeFullAt = 0;
    afterScore();
  }
  reset();

  // Ufo kasvab iga tasemega
  function uSc() { return U.UFO_SCALE[state.level - 1] || 1; }
  function uW() { return UFO_W * uSc(); }
  function uH() { return UFO_H * uSc(); }
  function lvlF() { return state.level - 1; }

  function ufoBox() { return { x: ufo.x + 2, y: ufo.y + 1, w: uW() - 4, h: uH() - 2 }; }
  function objBox(o) { return { x: o.x, y: GROUND - o.h, w: o.w, h: o.h }; }

  // Mängu lõpp (kaotus või võit): rekord brauserisse
  function saveHi() {
    var s = Math.floor(state.score);
    if (s > hi) { hi = s; try { localStorage.setItem('ufoHi', String(hi)); } catch (e) {} }
  }
  function gameOver(now) { mode = 'over'; overAt = now; keyUp = keyDown = false; saveHi(); }

  function makeObj(kind, x) {
    if (kind === 'man') return { kind: 'man', x: x, w: Math.round(MAN.width * MAN_SCALE), h: Math.round(MAN.height * MAN_SCALE), s: MAN_SCALE, rise: -1 };
    var s = COW_SIZES[(Math.random() * COW_SIZES.length) | 0];
    return { kind: 'cow', x: x, w: Math.round(COW.width * s), h: Math.round(COW.height * s), s: s, rise: -1 };
  }

  function fire(now) {
    if (!U.beamReady(now, lastBeamAt)) return;
    lastBeamAt = now; beamUntil = now + U.BEAM_MS;
  }

  // ---------- uuendus ----------
  function update(dt, now) {
    frame += dt;
    if (banner) { banner.t += dt; if (banner.t > 120) banner = null; }
    if (flash > 0) flash = Math.max(0, flash - 0.03 * dt);
    if (superT > 0) superT -= dt;
    if (mode === 'win') { updateWin(dt); return; }

    // ← → sõit edasi-tagasi (vasakust servast keskkohani); demos ja algul ufo oma kohal
    if (mode === 'play' && (keyFwd || keyBack)) ufo.x += (keyFwd ? MOVE : -MOVE) * dt;
    else if (mode !== 'play') ufo.x = LW * UFO_X;
    ufo.x = Math.max(X_MIN, Math.min(LW * 0.5 - uW(), ufo.x));

    // kiirus: automaatne, ülempiir kasvab tasemega
    var speedMax = SPEED_MAX + lvlF() * 0.35;
    if (mode === 'play' && speed < speedMax) speed += SPEED_ACC * dt;
    paraX += speed * dt;

    // lend: ↑ ↓ või automaatne vajumine
    if (mode === 'demo') demoPilot(now);
    if (keyUp) ufo.vy = -LIFT; else if (keyDown) ufo.vy = LIFT;
    else ufo.vy = Math.min(SINK_MAX, ufo.vy + SINK_ACC * dt);
    ufo.y = Math.max(Y_MIN, Math.min(GROUND - uH(), ufo.y + ufo.vy * dt));

    // takistused (tihedus ja MIB osakaal kasvavad tasemega)
    var move = speed * dt;
    groundX = (groundX + move) % 8;
    if (!TEST) {
      nextGap -= move;
      if (nextGap <= 0) {
        obs.push(makeObj(Math.random() < 0.4 + lvlF() * 0.05 ? 'man' : 'cow', LW + 10));
        nextGap = (70 + Math.random() * 110) * (1 - lvlF() * 0.1);
      }
    }
    var beamOn = now < beamUntil, ub = ufoBox();
    var beamSrc = { x: ufo.x + 4 * uSc(), w: uW() - 8 * uSc(), bottom: ufo.y + uH() };
    for (var i = obs.length - 1; i >= 0; i--) {
      var o = obs[i];
      if (o.rise >= 0) {                                    // teleporteerumas
        o.rise += dt * 16.667;
        if (o.rise >= RISE_MS) obs.splice(i, 1);
        continue;
      }
      o.x -= move + (o.kind === 'man' ? MAN_RUN_SPEED * dt : 0);
      if (o.x + o.w < -10) { obs.splice(i, 1); continue; }
      if (beamOn && U.beamHits(beamSrc, { x: o.x, w: o.w, top: GROUND - o.h }, BEAM_LEN)) {
        o.rise = 0;
        teleported(o.kind);
        if (mode === 'win') return;
        continue;
      }
      if (mode === 'play' && U.collides(ub, objBox(o))) {
        state = U.hit(state, now);                          // objekt jääb terveks
        if (state.over) gameOver(now);
      }
    }
    if (mode === 'play') updatePlayExtras(dt, now, move);
  }

  // Mürsud, Z-laser, laeng ja superjõud (ainult mängus)
  function updatePlayExtras(dt, now, move) {
    var dtMs = dt * 16.667;
    setCharge(U.chargeStep(state, dtMs), now);
    if (!TEST) {
      nextMissile -= dtMs;
      if (nextMissile <= 0) {
        missiles.push({ x: LW + 4, y: Y_MIN + Math.random() * (GROUND - 24 - Y_MIN), w: MISSILE_W, h: MISSILE_H });
        nextMissile = 6000 * Math.pow(0.85, lvlF()) * (0.5 + Math.random());
      }
    }
    var ur = { x: ufo.x, y: ufo.y, w: uW(), h: uH() }, ub = ufoBox(), zapOn = now < zapUntil;
    for (var i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i];
      m.x -= move + 1.6 * dt;
      if (m.x + m.w < -5) { missiles.splice(i, 1); continue; }
      if (zapOn && U.zapHits(ur, m)) {
        missiles.splice(i, 1);
        setCharge(U.shootMissile(state), now);
        continue;
      }
      if (U.collides(ub, m)) {
        missiles.splice(i, 1);                               // mürsk kaob alati
        state = U.hit(state, now);
        if (state.over) { gameOver(now); return; }
      }
    }
    // Superjõud: täis laeng ja Z all vähemalt SUPER_HOLD_MS (loeb alates hetkest, kui mõlemad kehtivad)
    if (zHeld && state.charge >= 1 && now - Math.max(zHeldSince, chargeFullAt) >= U.SUPER_HOLD_MS) doSuper(now);
  }

  // Objekt emalaevas: punktid, tase, võit
  function teleported(kind) {
    state = U.teleport(state, kind);
    afterScore();
  }
  function afterScore() {
    if (state.won && mode === 'play') { startWin(); return; }
    if (state.won) { state = U.newGameState(); return; }   // demo jookseb lõputult
    if (state.levelUp && mode === 'play') banner = { t: 0, s: 'LEVEL ' + state.level };
  }

  // Demo: ufo lendab ise objektide kohale ja tõmbab need üles
  function demoPilot(now) {
    var target = 40, next = null;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.rise < 0 && o.x + o.w > ufo.x - 4) { next = o; break; }
    }
    if (next) {
      target = GROUND - next.h - uH() - 22;
      if (U.beamHits({ x: ufo.x + 4, w: uW() - 8, bottom: ufo.y + uH() }, { x: next.x, w: next.w, top: GROUND - next.h }, BEAM_LEN)) fire(now);
    }
    keyUp = ufo.y > target + 2; keyDown = ufo.y < target - 2;
  }

  // ---------- võit: emalaev laskub, tõmbab ufo üles ja lahkub ----------
  function startWin() {
    mode = 'win'; keyUp = keyDown = false;
    win = { t: 0, shipY: -30 };
    saveHi();
  }
  function updateWin(dt) {
    win.t += dt;
    if (win.t < 90) win.shipY = -30 + (win.t / 90) * 38;            // laskub
    else if (win.t < 150) ufo.y += (win.shipY + 10 - ufo.y) * 0.06 * dt; // ufo tõmmatakse üles
    else if (win.t < 220) { win.shipY -= 1.2 * dt; ufo.y = win.shipY + 10; }
  }

  // ---------- joonistamine ----------
  function prep() {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function draw(now) {
    prep();
    ctx.fillStyle = '#0C0D11'; ctx.fillRect(0, 0, LW, LOGICAL_H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now / 900 + s.p);
      ctx.fillStyle = '#cfd6ff'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    ctx.globalAlpha = 1;
    // kuu
    ctx.fillStyle = '#f3e6b0';
    var mx = Math.round(LW * 0.66);     // kuu (paremal on HUD)
    ctx.beginPath(); ctx.arc(mx, 20, 6, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#0C0D11';
    ctx.beginPath(); ctx.arc(mx + 2.5, 18.5, 5.4, 0, 6.29); ctx.fill();

    drawClouds();
    drawLights(now);
    if (win) drawMothership(win.shipY);

    // maapind
    ctx.fillStyle = '#141a14'; ctx.fillRect(0, GROUND, LW, LOGICAL_H - GROUND);
    ctx.fillStyle = '#2a3a26'; ctx.fillRect(0, GROUND, LW, 1);
    ctx.fillStyle = '#1f2b1d';
    for (var gx = -groundX; gx < LW; gx += 8) ctx.fillRect(Math.round(gx), GROUND + 4, 2, 1);
    drawFog(0);

    // kiir
    if (now < beamUntil && mode !== 'win') drawBeam(ufo.x + uW() / 2, ufo.y + uH(), Math.min(BEAM_LEN, GROUND - ufo.y - uH()), now);
    if (win && win.t >= 90 && win.t < 150) drawBeam(ufo.x + uW() / 2, win.shipY + 10, ufo.y - win.shipY, now);

    // objektid (MIB-mehed jooksevad: 4 jalakaadrit)
    var runF = ((frame / 6) | 0) % 4;
    for (var j = 0; j < obs.length; j++) {
      var o = obs[j], img = o.kind === 'man' ? MAN_RUN[o.rise >= 0 ? 0 : runF] : COW;
      var y = GROUND - o.h;
      if (o.rise >= 0) {
        var k = o.rise / RISE_MS;
        ctx.globalAlpha = 1 - k;
        y -= k * 40;
        ctx.shadowColor = '#7dff7a'; ctx.shadowBlur = 6;
      }
      ctx.drawImage(img, Math.round(o.x), Math.round(y), o.w, o.h);
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    // ufo (vilgub haavamatuse ajal)
    var blink = mode === 'play' && now < state.invulnUntil && ((now / 90) | 0) % 2;
    if (!blink && !(win && win.t >= 220)) {
      var bob = mode === 'win' ? 0 : Math.round(Math.sin(now / 260));
      ctx.drawImage(((now / 220) | 0) % 2 ? UFO_A : UFO_B, Math.round(ufo.x), Math.round(ufo.y) + bob, uW(), uH());
    }

    // mürsud: punane-oranž kere, valge nina, suitsujälg
    for (var q = 0; q < missiles.length; q++) {
      var ms = missiles[q], mx0 = Math.round(ms.x), my0 = Math.round(ms.y);
      ctx.fillStyle = 'rgba(180,180,190,.35)';
      for (var tr = 1; tr <= 3; tr++) ctx.fillRect(mx0 + ms.w + tr * 3, my0 + 1 + ((frame / 4 + tr) | 0) % 2 - 0.5, 2, 1);
      ctx.fillStyle = '#e4572e'; ctx.fillRect(mx0 + 1, my0, ms.w - 1, ms.h);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(mx0 + ms.w - 1, my0, 1, ms.h);
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(mx0, my0 + 1, 1, 1);
    }

    // Z-laser
    if (now < zapUntil && mode === 'play') {
      var zy = Math.round(ufo.y + uH() * 0.55), zx = Math.round(ufo.x + uW());
      ctx.shadowColor = '#7dff7a'; ctx.shadowBlur = 5;
      ctx.fillStyle = '#b7ffb4'; ctx.fillRect(zx, zy, LW - zx, 1);
      ctx.shadowBlur = 0;
    }

    drawFog(1);
    drawStreaks();

    // superjõu sähvatus
    if (flash > 0) { ctx.fillStyle = 'rgba(125,255,122,' + (flash * 0.45) + ')'; ctx.fillRect(0, 0, LW, LOGICAL_H); }

    drawHud();
    if (banner) center(banner.s, 30, 9, '#ffe9a0');
    if (superT > 0) center('SUPER!', 44, 10, '#7dff7a');
    drawMessage(now);
  }

  // ---------- parallaks: pilved, kauged tuled, udu, kiirusjooned ----------
  function wrap(x, span) { return ((x % span) + span) % span; }

  function drawClouds() {
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i], L = CLOUD_LAYERS[c.L], r = L.r * c.s;
      var x = wrap(c.x - paraX * L.k, LW + 60) - 30;
      ctx.globalAlpha = L.alpha; ctx.fillStyle = L.col;
      ctx.beginPath();
      ctx.ellipse(x, c.y, r * 1.8, r * 0.55, 0, 0, 6.29);
      ctx.ellipse(x - r * 0.9, c.y + r * 0.15, r, r * 0.45, 0, 0, 6.29);
      ctx.ellipse(x + r * 0.8, c.y - r * 0.2, r * 1.1, r * 0.5, 0, 0, 6.29);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Kauged talutuled horisondil (aeglased, vilguvad)
  function drawLights(now) {
    for (var i = 0; i < lights.length; i++) {
      var l = lights[i], x = wrap(l.x - paraX * LIGHT_K, LW);
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(now / 700 + l.p);
      ctx.shadowColor = l.c; ctx.shadowBlur = 3;
      ctx.fillStyle = l.c; ctx.fillRect(Math.round(x), GROUND - 2, 1, 1);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // Udu maapinna kohal: tagumine kiht aeglasem, eesmine kiirem
  function drawFog(layer) {
    var k = FOG_K[layer], step = 34, off = wrap(paraX * k, step);
    ctx.fillStyle = layer ? 'rgba(170,190,210,.07)' : 'rgba(140,160,185,.06)';
    for (var x = -off - step; x < LW + step; x += step) {
      var wob = Math.sin((x + paraX * k) * 0.05 + layer) * 1.5;
      ctx.beginPath();
      ctx.ellipse(x, GROUND - 2 - layer * 2 + wob, 26, 4 + layer, 0, 0, 6.29);
      ctx.fill();
    }
  }

  // Kiirusjooned maa lähedal, kui sõit läheb kiireks
  function drawStreaks() {
    var a = Math.min(0.35, (speed - 2) * 0.25);
    if (a <= 0) return;
    ctx.fillStyle = 'rgba(220,235,255,' + a + ')';
    var len = Math.round((speed - 1.5) * 5);
    for (var i = 0; i < 6; i++) {
      var x = wrap(i * 97 - paraX * 1.8, LW + len) - len;
      ctx.fillRect(Math.round(x), GROUND - 4 - i * 3, len, 1);
    }
  }

  function drawBeam(cx, top, len, now) {
    if (len <= 0) return;
    var g = ctx.createLinearGradient(0, top, 0, top + len);
    g.addColorStop(0, 'rgba(140,255,130,.55)'); g.addColorStop(1, 'rgba(140,255,130,.08)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 3, top); ctx.lineTo(cx + 3, top);
    ctx.lineTo(cx + 3 + len * 0.28, top + len); ctx.lineTo(cx - 3 - len * 0.28, top + len);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(220,255,215,.5)';
    for (var i = 0; i < 4; i++) {
      var yy = top + ((now / 6 + i * len / 4) % len);
      ctx.fillRect(Math.round(cx - 1 - (yy - top) * 0.2), Math.round(yy), Math.round(2 + (yy - top) * 0.4), 1);
    }
  }

  function drawMothership(y) {
    var cx = LW / 2, w = Math.min(LW * 0.8, 170);
    ctx.fillStyle = '#6f7686';
    ctx.beginPath(); ctx.ellipse(cx, y + 6, w / 2, 7, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#a7aebb';
    ctx.beginPath(); ctx.ellipse(cx, y + 3, w / 2.6, 4.5, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(170,225,255,.7)';
    ctx.beginPath(); ctx.ellipse(cx, y - 1, w / 7, 4, 0, Math.PI, 0); ctx.fill();
    for (var x = cx - w / 2 + 6; x < cx + w / 2 - 4; x += 8) {
      ctx.fillStyle = ((x / 8 + (Date.now() / 200 | 0)) | 0) % 2 ? '#ff4d6d' : '#ffd166';
      ctx.fillRect(Math.round(x), Math.round(y + 8), 2, 1);
    }
  }

  function neon(text, x, y, color) {
    ctx.font = 'bold 5px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.shadowColor = color; ctx.shadowBlur = 4;
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  function pad(n) { n = String(Math.floor(n)); while (n.length < 5) n = '0' + n; return n; }

  function drawHud() {
    neon('COWS IN MOTHER SHIP: ' + state.cows, 4, 3, '#ff6ec7');
    neon('MEN IN BLACK IN MOTHER SHIP: ' + state.men, 4, 9, '#5ef2ff');
    // paremal üleval: HI ja skoor, all elud ja tase
    ctx.font = '5px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top'; ctx.textAlign = 'right'; ctx.fillStyle = '#ECE7DD';
    ctx.fillText(mode === 'demo' ? (hi ? 'HI ' + pad(hi) : '') : (hi ? 'HI ' + pad(hi) + '  ' : '') + pad(state.score), LW - 4, 3);
    if (mode !== 'demo') {
      ctx.fillStyle = '#9C9789';
      ctx.fillText('LEVEL ' + state.level + '/' + U.LEVELS, LW - 4, 16);
    }
    ctx.textAlign = 'left';
    if (mode !== 'demo') {
      for (var i = 0; i < state.lives; i++) heart(LW - 10 - i * 8, 9);
      // superjõu laadimisriba neoonsiltide all (täis = vilgub)
      var full = state.charge >= 1;
      ctx.fillStyle = '#1f2b1d'; ctx.fillRect(4, 16, 40, 2);
      ctx.fillStyle = full && ((frame / 8) | 0) % 2 ? '#ffffff' : '#7dff7a';
      ctx.fillRect(4, 16, Math.round(40 * state.charge), 2);
    }
  }
  function heart(x, y) {
    ctx.fillStyle = '#7dff7a';
    ctx.fillRect(x, y + 1, 2, 2); ctx.fillRect(x + 3, y + 1, 2, 2);
    ctx.fillRect(x, y + 2, 5, 2); ctx.fillRect(x + 1, y + 4, 3, 1); ctx.fillRect(x + 2, y + 5, 1, 1);
  }

  function center(text, y, size, color) {
    ctx.font = (size >= 7 ? 'bold ' : '') + size + 'px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillStyle = color; ctx.fillText(text, LW / 2, y);
    ctx.textAlign = 'left';
  }

  var helpW = 0;   // viimati joonistatud abiteksti laius (testikonks)
  function T(key) { return (TOUCH && texts[key + 'Touch']) || texts[key] || ''; }

  // Abitekst: font väheneb, kuni rida mahub laiusesse (kitsas pool / telefon)
  function centerFit(text, y, size, color) {
    var font = function (s) { return s + 'px "IBM Plex Mono", ui-monospace, monospace'; };
    ctx.font = font(size);
    var w = ctx.measureText(text).width, max = LW - 8;
    if (w > max) { size = Math.max(1.5, size * max / w); ctx.font = font(size); w = ctx.measureText(text).width; }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillStyle = color; ctx.fillText(text, LW / 2, y);
    ctx.textAlign = 'left';
    helpW = w;
  }

  function drawMessage(now) {
    if (mode === 'demo') {
      if (((now / 600) | 0) % 2) center(T('ufoStart'), 36, 6, '#ECE7DD');
      centerFit(T('ufoHelp'), 46, 4, '#9C9789');
    } else if (mode === 'over') {
      center(texts.ufoOver || '', 38, 8, '#E4572E');
      center(T('ufoAgain'), 50, 4, '#9C9789');
    } else if (mode === 'win' && win.t >= 200) {
      center(texts.ufoWin || '', 38, 8, '#7dff7a');
      center(T('ufoAgain'), 50, 4, '#9C9789');
    }
  }

  // ---------- sisend ----------
  function start() { reset(); mode = 'play'; }
  function canRestart(now) {
    if (mode === 'over') return now - overAt > 600;
    if (mode === 'win') return win.t >= 200;
    return false;
  }
  function pressStart() {
    var now = performance.now();
    if (mode === 'demo') start();
    else if (canRestart(now)) start();
  }
  function pressBeam() {
    var now = performance.now();
    if (mode === 'play') fire(now);
    else pressStart();
  }
  function onScreen() {
    var r = mount.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  }

  // Iga sõrm jätab meelde oma rolli, et ühe tõstmine ei katkestaks teise tegevust
  var roles = {};
  function applyRoles() {
    var r = Object.keys(roles).map(function (k) { return roles[k]; });
    keyUp = r.indexOf('up') >= 0; keyDown = r.indexOf('down') >= 0;
    if (r.indexOf('z') < 0) zHeld = false;
  }
  mount.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (mode !== 'play') { pressStart(); return; }
    var r = mount.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    var role = null;
    if (fx > 0.75 && fy < 0.5) { role = 'z'; pressZ(performance.now()); }   // paremal üleval: Z (hoia = superjõud)
    else if (fx > 0.75) pressBeam();                                       // paremal all: kiir alla
    else role = fy < 0.5 ? 'up' : 'down';
    if (role) { roles[e.pointerId] = role; applyRoles(); }
    try { mount.setPointerCapture(e.pointerId); } catch (_) {}
  });
  var release = function (e) { delete roles[e.pointerId]; applyRoles(); };
  mount.addEventListener('pointerup', release);
  mount.addEventListener('pointercancel', release);

  window.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t !== document.body && t !== document.documentElement && t !== mount) return; // fookus mujal lehel
    if (e.metaKey || e.ctrlKey || e.altKey || !onScreen()) return;
    var playing = mode === 'play';
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) pressStart(); }
    else if (e.code === 'KeyX') { e.preventDefault(); if (!e.repeat) pressBeam(); }
    else if (e.code === 'KeyZ') {
      e.preventDefault();
      if (e.repeat) return;
      if (playing) pressZ(performance.now());   // ainult mängus (valikuvaates ei tohi Z mängu alustada)
    }
    else if (!playing) return;                                   // demo ajal kerivad nooled lehte
    else if (e.code === 'ArrowUp') { e.preventDefault(); keyUp = true; }
    else if (e.code === 'ArrowDown') { e.preventDefault(); keyDown = true; }
    else if (e.code === 'ArrowRight') { e.preventDefault(); keyFwd = true; }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); keyBack = true; }
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'ArrowUp') keyUp = false;
    if (e.code === 'ArrowDown') keyDown = false;
    if (e.code === 'ArrowRight') keyFwd = false;
    if (e.code === 'ArrowLeft') keyBack = false;
    if (e.code === 'KeyZ') zHeld = false;
  });
  window.addEventListener('blur', function () { keyUp = keyDown = keyFwd = keyBack = zHeld = false; });

  // ---------- tsükkel (peatub, kui pole nähtav) ----------
  var visible = true, last = performance.now();
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = performance.now(); }).observe(mount);
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = now; return; }
    var dt = Math.max(0, Math.min(3, (now - last) / 16.667));
    last = now;
    if (mode === 'over' && now - overAt > IDLE_TO_DEMO) { reset(); mode = 'demo'; }
    update(dt, now);
    draw(now);
  }
  requestAnimationFrame(loop);

  if (TEST) {
    window.__ufoDebug = {
      mode: function () { return mode; },
      info: function () { return { ufo: ufo, obs: obs, beamUntil: beamUntil, lastBeamAt: lastBeamAt, LW: LW, visible: visible, now: performance.now(), keyUp: keyUp, keyDown: keyDown, ufoW: uW(), ufoH: uH(), missiles: missiles, zHeld: zHeld, helpW: helpW, speed: speed }; },
      scene: function () { return { cloudLayers: CLOUD_LAYERS.length, clouds: clouds.length, lights: lights.length, fogLayers: FOG_K.length, fogX: paraX }; },
      state: function () { var o = {}; for (var k in state) o[k] = state[k]; return o; },
      latch: function () { keyUp = true; },   // demo-autopiloodi olek: ↑ „all“
      setTotal: function (n) { state.total = n; state.level = U.levelOf(n); },
      hi: function () { return hi; },
      spawnMissile: function (dy) { missiles.push({ x: ufo.x + uW() + 12, y: ufo.y + dy, w: MISSILE_W, h: MISSILE_H }); },
      setCharge: function (v) { setCharge(Object.assign({}, state, { charge: v }), performance.now()); },
      kill: function () {
        var now = performance.now();
        state.lives = 1; state.invulnUntil = 0;
        state = U.hit(state, now);
        if (state.over) gameOver(now);
      },
      spawnBelow: function (kind) {
        var o = makeObj(kind, 0);
        ufo.y = GROUND - o.h - 30 - uH(); ufo.vy = 0;
        o.x = ufo.x + uW() / 2 - o.w / 2;
        obs.push(o);
      }
    };
  }

  return {
    setTexts: function (t) { texts = t || {}; },
    toDemo: function () { reset(); mode = 'demo'; }
  };
};
