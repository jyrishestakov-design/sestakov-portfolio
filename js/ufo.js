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
  var SPEED_START = 1.2, SPEED_MAX = 3.2, SPEED_ACC = 0.0004, SPEED_STEP = 0.04, SPEED_MIN = 0.8, SPEED_TOP = 4.2;
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
  var MAN = sprite(MAN_ROWS, false);
  var UFO_W = UFO_A.width, UFO_H = UFO_A.height;
  var COW_SIZES = [1, 1.5, 2];

  // ---------- canvas ----------
  var cv = document.createElement('canvas');
  cv.style.cssText = 'width:100%;height:100%;display:block';
  cv.setAttribute('aria-label', 'UFO: nooled üles-alla lendavad, X laserkiir');
  mount.appendChild(cv);
  var ctx = cv.getContext('2d');
  var scale = 2, LW = 300, dpr = 1, stars = [];

  function resize() {
    var r = mount.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = window.devicePixelRatio || 1;
    scale = r.height / LOGICAL_H;
    LW = r.width / scale;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    stars = [];
    for (var i = 0; i < LW / 4; i++) stars.push({ x: Math.random() * LW, y: Math.random() * (GROUND - 20), p: Math.random() * 6.28 });
  }
  new ResizeObserver(resize).observe(mount);
  resize();

  // ---------- olek ----------
  var mode = 'demo';                // 'demo' | 'play' | 'over' | 'win'
  var state, ufo, obs, speed, nextGap, lastBeamAt, beamUntil, groundX, overAt, win;
  var keyUp = false, keyDown = false, keyFaster = false, keySlower = false;

  function reset() {
    state = U.newGameState();
    ufo = { x: Math.round(LW * UFO_X), y: 40, vy: 0 };
    obs = []; speed = SPEED_START; nextGap = 60; lastBeamAt = -1e9; beamUntil = 0; groundX = 0;
    win = null;
    keyUp = keyDown = keyFaster = keySlower = false;   // demo-autopiloodi klahvid ei tohi mängu jääda
  }
  reset();

  function ufoBox() { return { x: ufo.x + 2, y: ufo.y + 1, w: UFO_W - 4, h: UFO_H - 2 }; }
  function objBox(o) { return { x: o.x, y: GROUND - o.h, w: o.w, h: o.h }; }

  function makeObj(kind, x) {
    if (kind === 'man') return { kind: 'man', x: x, w: MAN.width, h: MAN.height, s: 1, rise: -1 };
    var s = COW_SIZES[(Math.random() * COW_SIZES.length) | 0];
    return { kind: 'cow', x: x, w: Math.round(COW.width * s), h: Math.round(COW.height * s), s: s, rise: -1 };
  }

  function fire(now) {
    if (!U.beamReady(now, lastBeamAt)) return;
    lastBeamAt = now; beamUntil = now + U.BEAM_MS;
  }

  // ---------- uuendus ----------
  function update(dt, now) {
    if (mode === 'win') { updateWin(dt); return; }
    ufo.x = Math.round(LW * UFO_X);

    // kiirus
    if (mode === 'play') {
      if (keyFaster) speed = Math.min(SPEED_TOP, speed + SPEED_STEP * dt);
      else if (keySlower) speed = Math.max(SPEED_MIN, speed - SPEED_STEP * dt);
      else if (speed < SPEED_MAX) speed += SPEED_ACC * dt;
    }

    // lend: ↑ ↓ või automaatne vajumine
    if (mode === 'demo') demoPilot(now);
    if (keyUp) ufo.vy = -LIFT; else if (keyDown) ufo.vy = LIFT;
    else ufo.vy = Math.min(SINK_MAX, ufo.vy + SINK_ACC * dt);
    ufo.y = Math.max(Y_MIN, Math.min(GROUND - UFO_H, ufo.y + ufo.vy * dt));

    // takistused
    var move = speed * dt;
    groundX = (groundX + move) % 8;
    if (!TEST) {
      nextGap -= move;
      if (nextGap <= 0) {
        obs.push(makeObj(Math.random() < 0.4 ? 'man' : 'cow', LW + 10));
        nextGap = 70 + Math.random() * 110;
      }
    }
    var beamOn = now < beamUntil, ub = ufoBox();
    var beamSrc = { x: ufo.x + 4, w: UFO_W - 8, bottom: ufo.y + UFO_H };
    for (var i = obs.length - 1; i >= 0; i--) {
      var o = obs[i];
      if (o.rise >= 0) {                                    // teleporteerumas
        o.rise += dt * 16.667;
        if (o.rise >= RISE_MS) obs.splice(i, 1);
        continue;
      }
      o.x -= move;
      if (o.x + o.w < -10) { obs.splice(i, 1); continue; }
      if (beamOn && U.beamHits(beamSrc, { x: o.x, w: o.w, top: GROUND - o.h }, BEAM_LEN)) {
        o.rise = 0;
        state = U.teleport(state, o.kind);
        if (state.won && mode === 'play') { startWin(); return; }
        if (state.won) state = U.newGameState();           // demo jookseb lõputult
        continue;
      }
      if (mode === 'play' && U.collides(ub, objBox(o))) {
        state = U.hit(state, now);                          // objekt jääb terveks
        if (state.over) { mode = 'over'; overAt = now; keyUp = keyDown = false; }
      }
    }
  }

  // Demo: ufo lendab ise objektide kohale ja tõmbab need üles
  function demoPilot(now) {
    var target = 40, next = null;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.rise < 0 && o.x + o.w > ufo.x - 4) { next = o; break; }
    }
    if (next) {
      target = GROUND - next.h - UFO_H - 22;
      if (U.beamHits({ x: ufo.x + 4, w: UFO_W - 8, bottom: ufo.y + UFO_H }, { x: next.x, w: next.w, top: GROUND - next.h }, BEAM_LEN)) fire(now);
    }
    keyUp = ufo.y > target + 2; keyDown = ufo.y < target - 2;
  }

  // ---------- võit: emalaev laskub, tõmbab ufo üles ja lahkub ----------
  function startWin() {
    mode = 'win'; keyUp = keyDown = false;
    win = { t: 0, shipY: -30 };
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
    ctx.beginPath(); ctx.arc(LW - 22, 20, 6, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#0C0D11';
    ctx.beginPath(); ctx.arc(LW - 19.5, 18.5, 5.4, 0, 6.29); ctx.fill();

    if (win) drawMothership(win.shipY);

    // maapind
    ctx.fillStyle = '#141a14'; ctx.fillRect(0, GROUND, LW, LOGICAL_H - GROUND);
    ctx.fillStyle = '#2a3a26'; ctx.fillRect(0, GROUND, LW, 1);
    ctx.fillStyle = '#1f2b1d';
    for (var gx = -groundX; gx < LW; gx += 8) ctx.fillRect(Math.round(gx), GROUND + 4, 2, 1);

    // kiir
    if (now < beamUntil && mode !== 'win') drawBeam(ufo.x + UFO_W / 2, ufo.y + UFO_H, Math.min(BEAM_LEN, GROUND - ufo.y - UFO_H), now);
    if (win && win.t >= 90 && win.t < 150) drawBeam(ufo.x + UFO_W / 2, win.shipY + 10, ufo.y - win.shipY, now);

    // objektid
    for (var j = 0; j < obs.length; j++) {
      var o = obs[j], img = o.kind === 'man' ? MAN : COW;
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
      ctx.drawImage(((now / 220) | 0) % 2 ? UFO_A : UFO_B, Math.round(ufo.x), Math.round(ufo.y) + bob);
    }

    drawHud();
    drawMessage(now);
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

  function drawHud() {
    neon('COWS IN MOTHER SHIP: ' + state.cows, 4, 3, '#ff6ec7');
    neon('MEN IN BLACK IN MOTHER SHIP: ' + state.men, 4, 9, '#5ef2ff');
    if (mode !== 'demo') {
      for (var i = 0; i < state.lives; i++) heart(LW - 10 - i * 8, 4);
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

  function T(key) { return (TOUCH && texts[key + 'Touch']) || texts[key] || ''; }

  function drawMessage(now) {
    if (mode === 'demo') {
      if (((now / 600) | 0) % 2) center(T('ufoStart'), 36, 6, '#ECE7DD');
      center(T('ufoHelp'), 46, 4, '#9C9789');
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

  mount.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (mode !== 'play') { pressStart(); return; }
    var r = mount.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    if (fx > 0.75) pressBeam();
    else if (fy < 0.5) keyUp = true;
    else keyDown = true;
    try { mount.setPointerCapture(e.pointerId); } catch (_) {}
  });
  var release = function () { keyUp = keyDown = false; };
  mount.addEventListener('pointerup', release);
  mount.addEventListener('pointercancel', release);

  window.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t !== document.body && t !== document.documentElement && t !== mount) return; // fookus mujal lehel
    if (e.metaKey || e.ctrlKey || e.altKey || !onScreen()) return;
    var playing = mode === 'play';
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) pressStart(); }
    else if (e.code === 'KeyX') { e.preventDefault(); if (!e.repeat) pressBeam(); }
    else if (!playing) return;                                   // demo ajal kerivad nooled lehte
    else if (e.code === 'ArrowUp') { e.preventDefault(); keyUp = true; }
    else if (e.code === 'ArrowDown') { e.preventDefault(); keyDown = true; }
    else if (e.code === 'ArrowRight') { e.preventDefault(); keyFaster = true; }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); keySlower = true; }
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'ArrowUp') keyUp = false;
    if (e.code === 'ArrowDown') keyDown = false;
    if (e.code === 'ArrowRight') keyFaster = false;
    if (e.code === 'ArrowLeft') keySlower = false;
  });
  window.addEventListener('blur', function () { keyUp = keyDown = keyFaster = keySlower = false; });

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
      info: function () { return { ufo: ufo, obs: obs, beamUntil: beamUntil, lastBeamAt: lastBeamAt, LW: LW, visible: visible, now: performance.now(), keyUp: keyUp, keyDown: keyDown }; },
      state: function () { var o = {}; for (var k in state) o[k] = state[k]; return o; },
      latch: function () { keyUp = true; },   // demo-autopiloodi olek: ↑ „all“
      spawnBelow: function (kind) {
        var o = makeObj(kind, 0);
        ufo.y = GROUND - o.h - 30 - UFO_H; ufo.vy = 0;
        o.x = ufo.x + UFO_W / 2 - o.w / 2;
        obs.push(o);
      }
    };
  }

  return {
    setTexts: function (t) { texts = t || {}; },
    toDemo: function () { reset(); mode = 'demo'; }
  };
};
