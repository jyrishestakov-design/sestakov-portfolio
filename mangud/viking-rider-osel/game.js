/* Viking Rider — öine 16-bit minimäng (Ösel MC avaleht).
 * startVikingRider(mount, texts, ext) käivitab mängu antud elemendis ja tagastab
 * koristusfunktsiooni (React useEffect cleanup).
 * ext = { board: [{name, score, me}], me: {name}|null, onStart(), onEnd(score, level, won) }
 * Tsiklid, rattur, sead ja kadakad on pildilehel /game/viking-sheet.png (scripts/viking-sprites/).
 * — edetabel ja tulemuste saatmine (foorumi liikmed); mäng loeb ext.board'i igal kaadril. */
import SPR from "./sprites.js";
import ATLAS from "./atlas.js";

export function startVikingRider(mount, TXT = {}, ext = {}) {
  const offs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };

  // ---------- seaded ----------
  const TOUCH = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const TXT_START = TOUCH ? TXT.startTouch : TXT.start;
  const TXT_OVER  = 'G A M E   O V E R';
  const TXT_AGAIN = TOUCH ? TXT.againTouch : TXT.again;
  const TXT_LIFE  = TXT.life || '+1 ELU!';
  const TXT_IMMORTAL = TXT.immortal || 'SUREMATU!';
  const TXT_WIN   = TXT.win || 'V A L H A L L A !';
  const TXT_TOP   = TXT.top || 'E D E T A B E L';
  const TXT_LOGIN = TXT.loginHint || '';
  const IDLE_TO_DEMO = 12000;        // ms pärast kaotust tagasi "screensaveri" režiimi
  const LOGICAL_H = 118, GROUND = 108;
  const RES = 2;                     // sprite'id on 2× detailsusega (16-bit / Amiga tunne)
  const SPEED_START = 1.4, SPEED_MAX = 4.8, SPEED_ACC = 0.0005;     // automaatne kiirenemine
  const SPEED_MIN = 1.2, SPEED_TOP = 8.5, THROTTLE = 0.05;           // shift + ↑ ↓ reguleerimine
  const MOVE = 1.6, X_MIN = 4, X_MAX = 0.5;                          // ← → liikumine ekraanil (X_MAX = osa laiusest)
  const KMH = 16;                    // kiirus → km/h näidikul
  const GRAVITY = 0.227, JUMP_V = -4.04;   // madalam, aga sama pikk hüpe (kõrgemad tsiklid)
  const ARC_SPEED = 2.5;             // hüppekaar on ruumiliselt sama igal kiirusel (aeglaselt = hõljuvam)
  const AMBIENT = 0.3;               // kui palju pimedas näha on (0–1)
  const BEAM_LEN = 250, BEAM_SPREAD = 0.22, BEAM_TILT = 0.07;
  const PIG_CHANCE = 0.3;            // lendavate sigade osakaal
  const HAMMER_CD = 70;              // Mjölniri laadimisaeg (kaadrites, ~60 = 1 s)
  const HAMMER_REACH = 24;           // kui kaugele esirattast ette haamer ulatub
  const HAMMER_ARM = 14, HAMMER_HEAD = 48;   // käe pikkus ja haamripea kaugus õlast
  const BOLT_CHARGE = 75;            // shifti hoidmise aeg täislaadimiseni (kaadrites)
  const BOLT_CD = 240;               // välgunoole taastumisaeg
  const BOLT_SPEED = 9;              // välgunoole kiirus
  const SKY_MIN = 420, SKY_MAX = 1000;  // välgu vahe (kaadrites, ~7–17 s)
  const SKY_WARN = 110;              // pilv heleneb enne lööki (~2 s)
  const IMMORTAL = 420;              // välgust saadud surematus (~7 s)
  const KILL_BONUS = 10;
  const LIVES_START = 5, LIVES_MAX = 9;
  const KILLS_PER_BARREL = 3;        // iga 3 purustatud kadaka/sea järel tuleb MOTOTOOBER-vaat (+1 elu)
  const INVULN = 100;                // pärast pihtasaamist puutumatuse aeg
  // levelid: iga läbitud leveliga kasvab tsikkel, kiirus ja takistuste tihedus
  const LEVELS = 5;
  const LEVEL_LEN = 3600;            // leveli pikkus (sõidetud maailmaühikud, ~35–45 s)
  const LEVEL_BONUS = 100, WIN_BONUS = 500;

  // ---------- sprite'id (PNG, 2× detailsusega) ----------
  const B = {};
  let loaded = 0;
  const names = Object.keys(SPR);
  for (const k of names) {
    const im = new Image();
    im.onload = () => { loaded++; };
    im.src = SPR[k];
    B[k] = im;
  }
  const SHEET = new Image();
  let sheetOk = false;
  SHEET.onload = () => { sheetOk = true; };
  SHEET.src = new URL('./viking-sheet.png', import.meta.url).href;
  const ready = () => loaded === names.length && sheetOk;
  // pildilehe kaader (2× pikslid) maailma koordinaatidesse
  function ds(c, name, x, y) {
    const r = ATLAS.rects[name];
    if (r) c.drawImage(SHEET, r[0], r[1], r[2], r[3], snap(x), snap(y), r[2] / RES, r[3] / RES);
  }
  const CLOUD_LAYERS = [
    { spr: 'cloudS', speed: 0.04, alpha: 0.35, yMin: 4,  yMax: 24, per: 55 },
    { spr: 'cloud',  speed: 0.10, alpha: 0.50, yMin: 10, yMax: 34, per: 85 },
    { spr: 'cloudL', speed: 0.22, alpha: 0.65, yMin: 16, yMax: 42, per: 150 }];

  const [BW, BH] = ATLAS.frame;          // tsikli+ratturi kaader maailmaühikutes (alumine serv = maapind)
  const [PIVOT_X, PIVOT_Y] = ATLAS.pivot; // tagaratta kese (wheelie pöördepunkt)
  const SPAD = 4;                         // vaenlaste kaadrite läbipaistev ääris (okkad mahuvad)
  const geo = () => ATLAS.levels[level - 1]; // praeguse leveli tsikli geomeetria
  const CHIPS = { juniper: ['#1d3a26', '#2c5a37', '#43804c', '#6ea85e', '#5a3e28'],
                  pig: ['#f4a9b6', '#c26b80', '#fbfbfd', '#ffd8e0'] };

  // ---------- canvas'id ----------
  const cv = document.createElement('canvas');
  cv.style.cssText = 'width:100%;height:100%;display:block';
  cv.setAttribute('aria-label', TXT.aria || 'Viking Rider');
  mount.appendChild(cv);
  const ctx = cv.getContext('2d');
  const lit = document.createElement('canvas'), lctx = lit.getContext('2d');
  const msk = document.createElement('canvas'), mctx = msk.getContext('2d');
  let scale = 2, LW = 300, dpr = 1, stars = [];

  function resize() {
    const r = mount.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    scale = r.height / LOGICAL_H;
    LW = r.width / scale;
    for (const c of [cv, lit, msk]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    stars = [];
    for (let i = 0; i < LW / 4; i++) stars.push({ x: Math.random() * LW, y: Math.random() * (GROUND - 22), p: Math.random() * 6.28, b: Math.random() < 0.12 });
  }
  const ro = new ResizeObserver(resize); ro.observe(mount);
  resize();

  function prep(c) {
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    c.imageSmoothingEnabled = false;
  }
  const snap = v => Math.round(v * RES) / RES;
  function di(c, img, x, y) { c.drawImage(img, snap(x), snap(y), img.width / RES, img.height / RES); }

  // ---------- olek ----------
  let mode = 'demo';                 // 'demo' (screensaver) | 'play' | 'over'
  let hi = 0;
  try { hi = +localStorage.getItem('vikingRiderHi') || 0; } catch {}
  let score, speed, obstacles, clouds, pebbles, bike, nextGap, frame, overAt, spawned;
  let hammer, chips, floats, boost, wheelPhase, bolt, sky, flash = 0, treeX = 0;
  let lives, kills, barrelPending, invuln, smoke, streaks;
  let level, dist, banner, won, immortal;
  let wantDuck = false, autoDuck = false;
  let keyFaster = false, keySlower = false, keyLeft = false, keyRight = false;

  function reset() {
    score = 0; speed = SPEED_START; obstacles = []; frame = 0; spawned = 0;
    level = 1; dist = 0; banner = null; won = false; immortal = 0;
    bike = { x: 14, y: GROUND - BH, vy: 0, onGround: true, ang: 0, duck: false };
    hammer = { t: -1, cd: 0 };
    bolt = { charging: false, charge: 0, cd: 0, active: false, x: 0, y: 0, x0: 0 };
    if (!sky) sky = { next: 240, t: -1, pts: [], branches: [], warn: 0, x: 0, catchable: false, caught: false };
    chips = []; floats = []; boost = 0; wheelPhase = 0;
    lives = LIVES_START; kills = 0; barrelPending = 0; invuln = 0; smoke = []; streaks = [];
    nextGap = 90;
    clouds = [];
    CLOUD_LAYERS.forEach((L, li) => {
      const n = Math.max(2, Math.round(LW / L.per));
      for (let i = 0; i < n; i++) clouds.push({ L: li, x: (i + Math.random() * 0.8) * (LW + 40) / n, y: L.yMin + Math.random() * (L.yMax - L.yMin) });
    });
    pebbles = [];
    for (let x = 0; x < LW + 40; x += 3 + Math.random() * 8)
      pebbles.push({ x, y: GROUND + 1.5 + Math.floor(Math.random() * 16) / 2, w: (1 + (Math.random() * 3 | 0)) / 2, c: Math.random() < 0.3 ? '#5c606c' : '#3a3d47' });
  }
  reset();

  function jump() {
    if (bike.onGround && !bike.duck) { bike.vy = JUMP_V * (speed / ARC_SPEED); bike.onGround = false; }
  }
  function swing() {
    if (hammer.cd > 0 || hammer.t >= 0 || bolt.charging) return;
    hammer.t = 0; hammer.cd = HAMMER_CD;
  }

  // ---- välgunool: hoia shift → lae, lase lahti → tulista ----
  function startCharge() {
    if (bolt.cd > 0 || bolt.active || bolt.charging || hammer.t >= 0) return;
    bolt.charging = true; bolt.charge = 0;
  }
  function cancelCharge() { bolt.charging = false; bolt.charge = 0; }
  function releaseCharge() {
    if (!bolt.charging) return false;
    const full = bolt.charge >= 1;
    cancelCharge();
    if (full) fireBolt();
    return full;
  }
  function toWorld(sx, sy) {
    const dx = sx - PIVOT_X, dy = sy - PIVOT_Y, c = Math.cos(bike.ang), s = Math.sin(bike.ang);
    return [bike.x + PIVOT_X + dx * c - dy * s, bike.y + PIVOT_Y + dx * s + dy * c];
  }
  function headWorld(pose, ang) {
    const [shx, shy] = geo().shoulder[pose];
    return toWorld(shx + Math.cos(ang) * HAMMER_HEAD, shy + Math.sin(ang) * HAMMER_HEAD);
  }
  function fireBolt() {
    hammer.t = 0;                                   // haamer lööb ette ja välk lendab peast välja
    const [hx, hy] = headWorld(bike.duck ? 'duck' : 'ride', 0.2);
    bolt.active = true; bolt.x0 = hx; bolt.x = hx; bolt.y = hy - 4;
    bolt.cd = BOLT_CD; flash = Math.max(flash, 0.7);
  }
  function jag(x0, y0, x1, y1, step, amp) {
    const pts = [[x0, y0]], n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * amp * (y1 !== y0 ? 1 : 0.3),
                y0 + (y1 - y0) * t + (Math.random() - 0.5) * amp * (y1 !== y0 ? 0.3 : 1)]);
    }
    pts.push([x1, y1]);
    return pts;
  }
  function strokePts(c, pts, w, col) {
    c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  // välk: kõigepealt heleneb pilv (hoiatus), siis lööb. Mängu ajal lööb osa välke maani
  // ratturi ulatusse — kes selle kinni püüab, on mõnda aega surematu.
  function skyWarn() {
    // Püütav välk: helendav pilv ekraani esimeses kolmandikus (seal, kuhu tsikkel ulatub).
    // Ülejäänud ekraanil lööb tavaline taustavälk — ilma helendava pilveta ja hoiatuseta.
    const catchable = mode === 'play' && Math.random() < 0.55;
    sky.catchable = catchable; sky.caught = false;
    sky.next = SKY_MIN + Math.random() * (SKY_MAX - SKY_MIN);
    if (catchable) {
      sky.x = 24 + Math.random() * Math.max(10, LW / 3 - 30);
      sky.warn = SKY_WARN;
    } else {
      sky.x = LW / 3 + 20 + Math.random() * (LW * 2 / 3 - 30);
      sky.warn = 0;
      skyStrike();
    }
  }
  function skyStrike() {
    const x = sky.x, yEnd = sky.catchable ? GROUND : GROUND - 10 - Math.random() * 24;
    sky.pts = jag(x, 6, x + (sky.catchable ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 30), yEnd, 4, sky.catchable ? 6 : 8);
    sky.branches = [];
    for (let b = 0; b < 2; b++) {
      const k = 2 + (Math.random() * (sky.pts.length - 4) | 0), [bx, by] = sky.pts[k];
      sky.branches.push(jag(bx, by, bx + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 16), by + 10 + Math.random() * 16, 3, 5));
    }
    sky.t = 0;
    if (sky.catchable) flash = Math.max(flash, 0.8);
  }
  const SKY_FLICKER = [1, 0.25, 1, 0.85, 0.4, 0.9, 0.6, 0.35, 0.2, 0.12, 0.06];
  const skyLevel = () => sky.t < 0 ? 0 : SKY_FLICKER[Math.min(SKY_FLICKER.length - 1, sky.t / 2 | 0)] * (sky.t < 22 ? 1 : 0);

  function spawn() {
    let o;
    if (barrelPending > 0) {
      barrelPending--;
      o = { kind: 'barrel', img: B.barrel, w: 24, h: 26, y: GROUND - 26 };
    } else if (Math.random() < PIG_CHANCE + (level - 1) * 0.04 || spawned === 1) {
      // siga lendab nii kõrgel, et kummardades mahub alt läbi, aga püsti sõites mitte — ka suure tsikliga
      // siga lendab nii kõrgel, et kummardades mahud alt läbi, aga püsti sõites mitte (iga tsikli järgi)
      const G = geo(), rideTop = GROUND - BH + G.top.ride + 2, duckTop = GROUND - BH + G.top.duck + 2;
      o = { kind: 'pig', lv: level, w: 28, h: 18, y: (rideTop + duckTop) / 2 - 18, flap: Math.random() * 20, bob: 0 };
    } else {
      const name = 'jun' + level + '_' + (Math.random() * 4 | 0), r = ATLAS.rects[name];
      o = { kind: 'juniper', name, w: r[2] / RES - SPAD * 2, h: r[3] / RES - SPAD * 2 };
      o.y = GROUND - o.h;
    }
    o.x = LW + 10;
    o.plan = Math.random() < 0.4 ? 'hammer' : 'dodge';    // autopiloodi jaoks
    obstacles.push(o); spawned++;
    nextGap = 140 - (level - 1) * 5 + Math.random() * (170 - (level - 1) * 15);   // vahe pikslites (sõltumata kiirusest)
  }

  function hitbox() {
    const G = geo(), top = (bike.duck ? G.top.duck : G.top.ride) + 2;      // sarved on "tasuta"
    return [bike.x + G.bikeX[0] + 5, bike.y + top, G.bikeX[1] - G.bikeX[0] - 12, BH - top - 1];
  }
  function overlaps(o, bx, by, bw, bh) {
    const ox = o.x + 1, oy = o.y + (o.bob || 0) + 1, ow = o.w - 2, oh = o.h - 1;
    return bx < ox + ow && bx + bw > ox && by < oy + oh && by + bh > oy;
  }

  function burst(o, n, bonus, label) {
    const cols = CHIPS[o.kind] || ['#b98245', '#6e4220'];
    for (let i = 0; i < n; i++) chips.push({
      x: o.x + Math.random() * o.w, y: o.y + (o.bob || 0) + Math.random() * o.h,
      vx: 1 + Math.random() * 3, vy: -1.5 - Math.random() * 3, life: 40 + Math.random() * 25,
      c: cols[i % cols.length] });
    floats.push({ x: o.x + o.w / 2, y: o.y - 4, t: 0, s: label });
    if (bonus && mode === 'play') score += KILL_BONUS;
  }
  function smash(o) {                                // haamri või välguga purustatud
    burst(o, 26, true, o.kind === 'pig' ? 'OINK! +' + KILL_BONUS : 'KRÕKS! +' + KILL_BONUS);
    for (let i = 0; i < 8; i++) chips.push({
      x: o.x + o.w / 2, y: o.y + (o.bob || 0) + o.h / 2, vx: Math.random() * 4 - 1, vy: -Math.random() * 4,
      life: 12 + Math.random() * 10, c: i % 2 ? '#ffffff' : '#bfe0ff' });
    if (mode === 'play' && ++kills >= KILLS_PER_BARREL) { kills = 0; barrelPending++; }
  }
  const breakable = o => o.kind !== 'barrel';

  function autopilot() {
    autoDuck = false;
    if (!bolt.charging && !bolt.active && bolt.cd <= 0 && hammer.t < 0 && Math.random() < 0.004) startCharge();
    if (bolt.charging && bolt.charge >= 1) releaseCharge();
    for (const o of obstacles) {
      const d = o.x - (bike.x + geo().bikeX[1] - 6);
      if (o.x + o.w < bike.x || o.kind === 'barrel') continue;
      if (o.plan === 'hammer' && d < HAMMER_REACH - 4 && d > -10 && hammer.cd <= 0) { swing(); continue; }
      if (o.plan === 'hammer' && hammer.cd <= 0 && d > 0) continue;   // ootab löögiulatust
      if (o.kind === 'pig') { if (d < 34) autoDuck = true; continue; }
      if (d >= -4 && d < 12) { jump(); break; }
    }
  }

  function loseLife(o) {
    burst(o, 18, false, 'AU! −1');
    lives--; invuln = INVULN; flash = Math.max(flash, 0.3);
    if (lives <= 0) endGame(false);
  }
  function endGame(victory) {
    mode = 'over'; won = victory; overAt = performance.now(); wantDuck = false; cancelCharge();
    keyFaster = keySlower = keyLeft = keyRight = false;
    const s = Math.floor(score);
    if (s > hi) { hi = s; try { localStorage.setItem('vikingRiderHi', hi); } catch {} }
    try { ext.onEnd?.(s, level, victory); } catch {}
  }
  function levelUp() {
    if (level >= LEVELS) {                          // viimane level läbi → Valhalla
      score += WIN_BONUS;
      floats.push({ x: bike.x + 30, y: bike.y - 6, t: 0, s: '+' + WIN_BONUS });
      flash = 1; endGame(true);
      return;
    }
    level++;
    score += LEVEL_BONUS * (level - 1);
    floats.push({ x: bike.x + BW / 2, y: bike.y + 10, t: 0, s: '+' + LEVEL_BONUS * (level - 1) });
    banner = { t: 0, s: 'LEVEL ' + level };
    flash = Math.max(flash, 0.6);
  }

  function update(dt) {
    frame += dt;
    for (const c of chips) { c.x += c.vx * dt - speed * 0.3 * dt; c.y += c.vy * dt; c.vy += 0.25 * dt; c.life -= dt; if (c.y > GROUND + 6) { c.y = GROUND + 6; c.vy *= -0.3; } }
    chips = chips.filter(c => c.life > 0);
    for (const f of floats) { f.t += dt; f.y -= 0.35 * dt; }
    floats = floats.filter(f => f.t < 50);
    // summutisuits ja tuulekriipsud (→ all hoides)
    const gas = mode === 'play' && keyRight;
    if (gas && Math.random() < 0.6 * dt) {
      for (const ey of [34.5, 37]) {
        const [ex, wy] = toWorld(geo().bikeX[0] + 1, PIVOT_Y + ey - 34);
        smoke.push({ x: ex, y: wy, vx: -speed * 0.35 - 0.8 - Math.random() * 0.6, vy: -0.15 - Math.random() * 0.2,
                     r: 1 + Math.random(), life: 34 + Math.random() * 16, max: 50 });
      }
    }
    for (const p of smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.r += 0.09 * dt; p.life -= dt; }
    smoke = smoke.filter(p => p.life > 0);
    if (mode === 'play' && (gas || speed > 4.2) && Math.random() < (gas ? 0.5 : 0.2) * dt)
      streaks.push({ x: LW + 5, y: 8 + Math.random() * (GROUND - 10), len: 10 + Math.random() * 24, v: speed * 3 + Math.random() * 4 });
    for (const st of streaks) st.x -= st.v * dt;
    streaks = streaks.filter(st => st.x + st.len > -5);
    // taustavälk
    if (sky.warn > 0) { sky.warn -= dt; if (sky.warn <= 0) skyStrike(); }
    else { sky.next -= dt; if (sky.next <= 0) skyWarn(); }
    if (sky.t >= 0) { sky.t += dt; if (sky.t > 22) sky.t = -1; }
    flash = Math.max(0, flash - 0.03 * dt);
    if (mode === 'over') return;
    if (invuln > 0) invuln -= dt;
    if (immortal > 0) immortal -= dt;
    // püütud välk: maani löönud välk tabab ratturit → surematu
    if (mode === 'play' && sky.catchable && !sky.caught && sky.t >= 0 && sky.t < 8) {
      const G = geo();
      if (sky.x > bike.x + G.bikeX[0] && sky.x < bike.x + G.bikeX[1]) {
        sky.caught = true; immortal = IMMORTAL; flash = 1; score += 50;
        floats.push({ x: bike.x + BW / 2, y: bike.y + 6, t: 0, s: TXT_IMMORTAL });
      }
    }
    if (banner && (banner.t += dt) > 150) banner = null;

    // level: läbitud vahemaa; tsikkel kasvab sujuvalt uue suuruseni
    if (mode === 'play') { dist += speed * dt; if (dist >= LEVEL_LEN) { dist = 0; levelUp(); if (mode === 'over') return; } }

    // kiirus (automaatne kiirenemine + shift ↑↓) ja liikumine (← →)
    const base = Math.min(SPEED_MAX + (level - 1) * 0.35, (speed - boost) + SPEED_ACC * dt);
    if (mode === 'play') {
      if (keyFaster) boost += THROTTLE * dt;
      if (keySlower) boost -= THROTTLE * dt;
      bike.x += ((keyRight ? 1 : 0) - (keyLeft ? 1 : 0)) * MOVE * dt;
      bike.x = Math.max(X_MIN, Math.min(LW * X_MAX - BW, bike.x));
    } else if (mode === 'demo') {
      bike.x += (10 - bike.x) * 0.05 * dt;
      level = 1 + ((frame / 240) | 0) % LEVELS;        // ooteekraanil vahelduvad kõik tsiklid
    }
    boost = Math.max(SPEED_MIN - base, Math.min(SPEED_TOP - base, boost));
    speed = base + boost;
    wheelPhase += speed * 0.18 * dt;
    treeX -= speed * 0.08 * dt;
    if (mode === 'play') score += speed * 0.05 * dt;
    else autopilot();

    const duckInput = mode === 'demo' ? autoDuck : wantDuck;
    bike.duck = duckInput && bike.onGround;

    // füüsika (↓ õhus = kiirem maandumine)
    const k = speed / ARC_SPEED;
    bike.vy += (GRAVITY + (duckInput && !bike.onGround ? 0.32 : 0)) * k * k * dt;
    bike.y += bike.vy * dt;
    const floor = GROUND - BH;
    if (bike.y >= floor || (bike.onGround && bike.y !== floor)) {
      if (!bike.onGround) bike.ang = 0.05;
      bike.y = floor; bike.vy = 0; bike.onGround = true;
    }

    // wheelie: esiratas tõuseb hüppel, langedes tuleb aeglaselt alla
    let target = mode === 'play' && (keyFaster || keyRight) && bike.onGround ? -0.05 : 0;
    if (!bike.onGround) target = bike.vy < 0 ? -0.3 : Math.min(0, -0.3 + bike.vy / k * 0.12);
    bike.ang += (target - bike.ang) * Math.min(1, 0.22 * dt);

    // haamer
    if (hammer.cd > 0) hammer.cd -= dt;
    if (hammer.t >= 0) {
      hammer.t += dt;
      if (hammer.t >= 4 && hammer.t <= 16) {
        const G = geo(), x0 = bike.x + G.shoulder.ride[0] + 14, x1 = bike.x + G.bikeX[1] + HAMMER_REACH;
        obstacles = obstacles.filter(o => {
          if (breakable(o) && o.x < x1 && o.x + o.w > x0 && o.y + o.h > bike.y + G.top.ride - 30) { smash(o); return false; }
          return true;
        });
      }
      if (hammer.t > 26) hammer.t = -1;
    }

    // välgunool: laadimine ja lend
    if (bolt.cd > 0 && !bolt.active) bolt.cd -= dt;
    if (bolt.charging) {
      bolt.charge = Math.min(1, bolt.charge + dt / BOLT_CHARGE);
      if (Math.random() < 0.35 * dt) {
        const [hx, hy] = headWorld(bike.duck ? 'duck' : 'ride', -1.55);
        chips.push({ x: hx + (Math.random() - 0.5) * 10, y: hy + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.5 + speed * 0.3, vy: (Math.random() - 0.5) * 1.5, life: 8 + Math.random() * 8,
          c: Math.random() < 0.5 ? '#ffffff' : '#9fd0ff' });
      }
    }
    if (bolt.active) {
      bolt.x += BOLT_SPEED * dt;
      obstacles = obstacles.filter(o => {
        if (breakable(o) && o.x < bolt.x && o.x + o.w > bike.x + geo().shoulder.ride[0]) { smash(o); return false; }
        return true;
      });
      flash = Math.max(flash, 0.35);
      if (bolt.x > LW + 30) bolt.active = false;
    }

    // takistused
    nextGap -= speed * dt;
    if (nextGap <= 0) spawn();
    for (const o of obstacles) {
      o.x -= (o.kind === 'pig' ? speed * 1.25 : speed) * dt;
      if (o.kind === 'pig') { o.flap += dt; o.bob = Math.sin(o.flap / 7); }
    }
    obstacles = obstacles.filter(o => o.x + o.w > -10);

    for (const c of clouds) {
      const L = CLOUD_LAYERS[c.L];
      c.x -= speed * L.speed * dt;
      if (c.x < -60) { c.x = LW + 10 + Math.random() * 60; c.y = L.yMin + Math.random() * (L.yMax - L.yMin); }
    }
    for (const p of pebbles) { p.x -= speed * dt; if (p.x < -4) { p.x += LW + 44; p.y = GROUND + 1.5 + Math.floor(Math.random() * 16) / 2; } }

    // kokkupõrked: vaat = +1 elu, muu = −1 elu
    if (mode === 'play') {
      const [bx, by, bw, bh] = hitbox();
      for (const o of obstacles) {
        if (!overlaps(o, bx, by, bw, bh)) continue;
        if (o.kind === 'barrel') {
          o.gone = true; lives = Math.min(LIVES_MAX, lives + 1);
          floats.push({ x: o.x + o.w / 2, y: o.y - 6, t: 0, s: TXT_LIFE });
        } else if (immortal > 0) {                // surematu: sõidab kolletest läbi
          o.gone = true; smash(o);
        } else if (invuln <= 0) {
          o.gone = true; loseLife(o);
          if (mode === 'over') break;
        }
      }
      obstacles = obstacles.filter(o => !o.gone);
    }
  }

  // ---------- joonistamine ----------
  function beamPath(c, lx, ly) {
    const a = bike.ang + BEAM_TILT;
    c.beginPath();
    c.moveTo(lx, ly);
    c.lineTo(lx + Math.cos(a - BEAM_SPREAD) * BEAM_LEN, ly + Math.sin(a - BEAM_SPREAD) * BEAM_LEN);
    c.lineTo(lx + Math.cos(a + BEAM_SPREAD) * BEAM_LEN, ly + Math.sin(a + BEAM_SPREAD) * BEAM_LEN);
    c.closePath();
  }
  const pad = n => String(Math.floor(n)).padStart(5, '0');
  const ease = t => 1 - Math.pow(1 - t, 3);

  function drawHammer(c, x, y, ang, alpha, sc = 1) {
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y); c.rotate(ang); c.scale(sc, sc);
    c.drawImage(B.hammer, HAMMER_ARM - 5, -5.5, B.hammer.width / RES, B.hammer.height / RES);
    c.restore();
  }

  function draw(now) {
    const W = cv.width, H = cv.height;

    // 1) valgustatav maailm eraldi kihile
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H); prep(lctx);
    lctx.fillStyle = '#16181e'; lctx.fillRect(0, GROUND, LW, LOGICAL_H - GROUND);
    lctx.fillStyle = '#8a8d98'; lctx.fillRect(0, GROUND, LW, 0.5);
    lctx.fillStyle = '#4c505c'; lctx.fillRect(0, GROUND + 0.5, LW, 0.5);
    for (const p of pebbles) { lctx.fillStyle = p.c; lctx.fillRect(snap(p.x), p.y, p.w, 0.5); }
    for (const o of obstacles) if (o.kind === 'juniper') ds(lctx, o.name, o.x - SPAD, o.y - SPAD);

    // 2) taevas
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); prep(ctx);
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now / 700 + s.p);
      ctx.fillStyle = s.b ? '#ffffff' : '#c9cfe0';
      ctx.fillRect(snap(s.x), snap(s.y), s.b ? 1 : 0.5, s.b ? 1 : 0.5);
    }
    ctx.globalAlpha = 0.95; di(ctx, B.moon, LW * 0.78, 5);
    const sl = skyLevel();
    if (sl > 0) {                                   // taustavälk (pilvede taga)
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(170,190,255,' + (0.10 * sl) + ')'; ctx.fillRect(0, 0, LW, GROUND);
      for (const pts of [sky.pts, ...sky.branches]) {
        strokePts(ctx, pts, 3, 'rgba(150,185,255,' + (0.30 * sl) + ')');
        strokePts(ctx, pts, pts === sky.pts ? 0.9 : 0.5, 'rgba(255,255,255,' + sl + ')');
      }
    }
    for (let li = 0; li < CLOUD_LAYERS.length; li++) {
      const L = CLOUD_LAYERS[li];
      ctx.globalAlpha = Math.min(1, L.alpha + 0.35 * sl);
      for (const c of clouds) if (c.L === li) di(ctx, B[L.spr], c.x, c.y);
    }
    // välgu hoiatus: pilv löögikoha kohal heleneb ja hakkab lõpus vilkuma
    if (sky.warn > 0) {
      const p = 1 - sky.warn / SKY_WARN;
      const flick = p > 0.6 ? (Math.random() < 0.35 ? 1.6 : 1) : 1;
      ctx.globalAlpha = 0.6 + 0.4 * p; di(ctx, B.cloudL, sky.x - 26, 4);
      const gw = ctx.createRadialGradient(sky.x, 12, 2, sky.x, 12, 18 + 16 * p);
      gw.addColorStop(0, 'rgba(225,235,255,' + Math.min(0.9, (0.12 + 0.5 * p) * flick) + ')');
      gw.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = gw; ctx.fillRect(sky.x - 40, -10, 80, 50);
      if (sky.catchable && p > 0.5 && Math.random() < 0.25) {          // pisikesed sädemed pilve all
        const sx = sky.x + (Math.random() - 0.5) * 16;
        strokePts(ctx, jag(sx, 14, sx + (Math.random() - 0.5) * 6, 20 + Math.random() * 6, 2, 3), 0.5, 'rgba(230,240,255,0.8)');
      }
    }
    // kauge metsarida (parallaks)
    ctx.globalAlpha = 1;
    const tw = B.trees.width / RES, th = B.trees.height / RES;
    for (let x = ((treeX % tw) + tw) % tw - tw; x < LW; x += tw) ctx.drawImage(B.trees, snap(x), GROUND - th + 0.5, tw, th);

    // 3) pimedas: maailm vaid aimatav (välk valgustab)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(1, AMBIENT + 0.6 * Math.max(flash, sl)); ctx.drawImage(lit, 0, 0);
    ctx.globalAlpha = 1;

    // 4) valgusvihk
    const [lx, ly] = toWorld(geo().lamp[0], geo().lamp[1]);
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, W, H); mctx.drawImage(lit, 0, 0);
    prep(mctx);
    mctx.globalCompositeOperation = 'destination-in';
    const g = mctx.createRadialGradient(lx, ly, 2, lx, ly, BEAM_LEN);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g; beamPath(mctx, lx, ly); mctx.fill();
    mctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(msk, 0, 0);

    prep(ctx);
    const h = ctx.createRadialGradient(lx, ly, 1, lx, ly, BEAM_LEN);
    h.addColorStop(0, 'rgba(255,233,160,0.20)'); h.addColorStop(0.4, 'rgba(255,233,160,0.07)'); h.addColorStop(1, 'rgba(255,233,160,0)');
    ctx.fillStyle = h; beamPath(ctx, lx, ly); ctx.fill();

    // MOTOTOOBER-vaat ja lendavad sead on alati hästi näha
    for (const o of obstacles) {
      if (o.kind === 'barrel') {
        const glow = ctx.createRadialGradient(o.x + 12, o.y + 13, 2, o.x + 12, o.y + 13, 22);
        glow.addColorStop(0, 'rgba(255,200,110,0.30)'); glow.addColorStop(1, 'rgba(255,200,110,0)');
        ctx.fillStyle = glow; ctx.fillRect(o.x - 12, o.y - 10, 48, 46);
        di(ctx, o.img, o.x, o.y + Math.sin(frame / 8) * 0.5);
      } else if (o.kind === 'pig') {
        const x = o.x, y = o.y + o.bob;
        const glow = ctx.createRadialGradient(x + 14, y + 10, 2, x + 14, y + 10, 20);
        glow.addColorStop(0, 'rgba(255,190,205,0.22)'); glow.addColorStop(1, 'rgba(255,190,205,0)');
        ctx.fillStyle = glow; ctx.fillRect(x - 8, y - 10, 44, 40);
        ds(ctx, 'pig' + o.lv + '_' + ((o.flap / 9 | 0) % 2), x - SPAD, y - SPAD);
      }
    }

    // välgunool
    if (bolt.active) {
      const pts = jag(bolt.x0, bolt.y, bolt.x, bolt.y, 5, 8);
      strokePts(ctx, pts, 6, 'rgba(120,170,255,0.25)');
      strokePts(ctx, pts, 2.4, 'rgba(170,210,255,0.8)');
      strokePts(ctx, pts, 0.9, '#ffffff');
      const ax = bolt.x, ay = bolt.y;
      ctx.fillStyle = 'rgba(170,210,255,0.5)';
      ctx.beginPath(); ctx.moveTo(ax + 12, ay); ctx.lineTo(ax - 4, ay - 9); ctx.lineTo(ax, ay); ctx.lineTo(ax - 4, ay + 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(ax + 9, ay); ctx.lineTo(ax - 2, ay - 6); ctx.lineTo(ax + 1, ay); ctx.lineTo(ax - 2, ay + 6); ctx.closePath(); ctx.fill();
    }

    // tuulekriipsud ja summutisuits (ratturi taga)
    ctx.fillStyle = '#c9d2e6';
    for (const st of streaks) { ctx.globalAlpha = 0.16; ctx.fillRect(snap(st.x), snap(st.y), st.len, 0.5); }
    for (const p of smoke) {
      const a = p.life / p.max;
      ctx.globalAlpha = 0.45 * a;
      ctx.fillStyle = a > 0.6 ? '#9da2ae' : '#6c717e';
      const r = snap(p.r);
      ctx.fillRect(snap(p.x - r), snap(p.y - r * 0.8), r * 2, r * 1.6);
      ctx.fillRect(snap(p.x - r * 0.7), snap(p.y - r), r * 1.4, r * 2);
    }
    ctx.globalAlpha = 1;

    // 5) rattur (wheelie pööre ümber tagaratta; pihtasaamise järel vilgub)
    const f = bike.onGround && mode !== 'over' ? (wheelPhase | 0) % 4 : 0;
    const pose = bike.duck ? 'duck' : 'ride';
    ctx.save();
    if (invuln > 0 && (frame / 4 | 0) % 2) ctx.globalAlpha = 0.35;
    ctx.translate(snap(bike.x + PIVOT_X), snap(bike.y + PIVOT_Y));
    ctx.rotate(bike.ang);
    if (immortal > 0) {                                        // välgu-aura
      const pulse = 0.55 + 0.25 * Math.sin(frame * 0.5), fade = Math.min(1, immortal / 60);
      const au = ctx.createRadialGradient(BW / 2 - PIVOT_X, -12, 4, BW / 2 - PIVOT_X, -12, 46);
      au.addColorStop(0, 'rgba(170,210,255,' + (0.45 * pulse * fade) + ')'); au.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = au; ctx.fillRect(-PIVOT_X - 10, -PIVOT_Y - 6, BW + 20, BH + 8);
    }
    ds(ctx, 'bike' + level + '_' + f, -PIVOT_X, -PIVOT_Y);
    ds(ctx, pose + level + '_' + f, -PIVOT_X, -PIVOT_Y);
    if (immortal > 0 && (immortal > 90 || (frame / 5 | 0) % 2)) {   // praksuvad sädemed ümber ratturi
      for (let i = 0; i < 3; i++) {
        const G = geo(), x0 = G.bikeX[0] - PIVOT_X + Math.random() * (G.bikeX[1] - G.bikeX[0]);
        const y0 = G.top.ride - PIVOT_Y + Math.random() * (BH - G.top.ride);
        strokePts(ctx, jag(x0, y0, x0 + (Math.random() - 0.5) * 14, y0 + (Math.random() - 0.5) * 14, 3, 4), 0.6, 'rgba(220,235,255,0.9)');
      }
    }
    if (bolt.charging) {
      const [shx, shy] = geo().shoulder[pose];
      const sx = shx - PIVOT_X, sy = shy - PIVOT_Y, a = -1.55 + Math.sin(frame * 0.6) * 0.04 * bolt.charge;
      const hx = sx + Math.cos(a) * HAMMER_HEAD, hy = sy + Math.sin(a) * HAMMER_HEAD;
      const full = bolt.charge >= 1, r = 5 + 9 * bolt.charge + (full ? Math.sin(frame * 0.5) * 2 : 0);
      const aura = ctx.createRadialGradient(hx, hy, 1, hx, hy, r);
      aura.addColorStop(0, full ? 'rgba(255,255,255,0.75)' : 'rgba(190,220,255,0.55)'); aura.addColorStop(1, 'rgba(140,190,255,0)');
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(hx, hy, r, 0, 6.28); ctx.fill();
      drawHammer(ctx, sx, sy, a, 1);
      for (let i = 0; i < 2 + bolt.charge * 4; i++) {           // praksuvad sädemed
        const an = Math.random() * 6.28, d = r * (0.6 + Math.random() * 0.6);
        strokePts(ctx, jag(hx, hy, hx + Math.cos(an) * d, hy + Math.sin(an) * d, 3, 3), 0.5, 'rgba(230,240,255,0.9)');
      }
    } else if (hammer.t >= 0) {
      const [shx, shy] = geo().shoulder[pose];
      const sx = shx - PIVOT_X, sy = shy - PIVOT_Y;
      const p = ease(Math.min(1, hammer.t / 12));
      const a = -2.2 + p * 2.4;                                  // tagant-ülevalt ette-alla
      if (hammer.t < 20) {                                       // elektriline jäljekaar
        ctx.strokeStyle = 'rgba(180,215,255,' + (0.5 * (1 - hammer.t / 20)) + ')';
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(sx, sy, HAMMER_HEAD, -2.2, a); ctx.stroke();
      }
      drawHammer(ctx, sx, sy, a, hammer.t > 20 ? 1 - (hammer.t - 20) / 6 : 1);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,240,190,0.9)';
    ctx.beginPath(); ctx.arc(lx, ly, 1.6, 0, 6.28); ctx.fill();
    if (sky.catchable && sl > 0) {                             // maani löönud välk ratturi ees
      strokePts(ctx, sky.pts, 3, 'rgba(150,185,255,' + (0.35 * sl) + ')');
      strokePts(ctx, sky.pts, 1, 'rgba(255,255,255,' + sl + ')');
      const sp = ctx.createRadialGradient(sky.x, GROUND, 1, sky.x, GROUND, 22);
      sp.addColorStop(0, 'rgba(220,235,255,' + (0.6 * sl) + ')'); sp.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.fillStyle = sp; ctx.fillRect(sky.x - 24, GROUND - 22, 48, 30);
    }

    // killud ja punktid
    for (const c of chips) { ctx.globalAlpha = Math.min(1, c.life / 20); ctx.fillStyle = c.c; ctx.fillRect(snap(c.x), snap(c.y), 1, 1); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = 'bold 5px "Courier New", monospace';
    for (const fl of floats) {
      ctx.globalAlpha = 1 - fl.t / 50;
      ctx.fillStyle = fl.s.startsWith('AU') ? '#ff8a7a' : fl.s === TXT_LIFE ? '#9cff9c' : '#ffe9a0';
      ctx.fillText(fl.s, fl.x, fl.y);
    }
    ctx.globalAlpha = 1;

    // 6) kasutajaliides
    ctx.fillStyle = '#b8bcc8';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = 'right';
    if (mode !== 'demo') ctx.fillText((hi ? 'HI ' + pad(hi) + '  ' : '') + pad(score), LW - 4, 4);
    else if (hi) ctx.fillText('HI ' + pad(hi), LW - 4, 4);
    if (mode !== 'demo') {                                         // elud (kiivrid)
      for (let i = 0; i < lives; i++) ctx.drawImage(B.life, snap(LW - 12 - i * 9), 12, 8, 7);
      // level ja selle edenemine
      ctx.font = 'bold 5px "Courier New", monospace'; ctx.fillStyle = '#ffe9a0';
      ctx.fillText('LEVEL ' + level + '/' + LEVELS, LW - 4, 22);
      ctx.fillStyle = 'rgba(184,188,200,0.25)'; ctx.fillRect(LW - 34, 28, 30, 1);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(LW - 34, 28, 30 * (won ? 1 : dist / LEVEL_LEN), 1);
    }

    if (mode === 'play') {
      // haamri laadimise näidik
      const ready = hammer.cd <= 0;
      drawHammer(ctx, 3, 9, -0.45, ready ? 1 : 0.35, 0.34);
      ctx.fillStyle = 'rgba(184,188,200,0.25)'; ctx.fillRect(4, 13, 16, 1);
      ctx.fillStyle = ready ? '#ffe9a0' : '#b8bcc8';
      ctx.fillRect(4, 13, 16 * (1 - Math.max(0, hammer.cd) / HAMMER_CD), 1);
      // spidomeeter
      ctx.textAlign = 'left'; ctx.font = 'bold 6px "Courier New", monospace';
      ctx.fillStyle = keyFaster ? '#ffe9a0' : keySlower ? '#7dacc4' : '#b8bcc8';
      ctx.fillText(Math.round(speed * KMH) + ' km/h', 26, 6);
      ctx.fillStyle = 'rgba(184,188,200,0.25)'; ctx.fillRect(26, 13, 30, 1);
      ctx.fillStyle = '#b8bcc8'; ctx.fillRect(26, 13, 30 * (speed - SPEED_MIN) / (SPEED_TOP - SPEED_MIN), 1);
      if (immortal > 0) {                                        // surematuse aeg
        ctx.fillStyle = (frame / 6 | 0) % 2 ? '#ffffff' : '#bfe0ff';
        ctx.fillText('⚡ ' + TXT_IMMORTAL + ' ' + Math.ceil(immortal / 60), 4, 18);
        ctx.fillStyle = 'rgba(184,188,200,0.25)'; ctx.fillRect(4, 25, 52, 1);
        ctx.fillStyle = '#bfe0ff'; ctx.fillRect(4, 25, 52 * immortal / IMMORTAL, 1);
      }
      // välgunoole näidik
      const bReady = bolt.cd <= 0 && !bolt.active;
      strokePts(ctx, [[66, 3], [63, 7], [67, 7], [64, 11]], 1, bReady ? '#bfe0ff' : 'rgba(184,188,200,0.4)');
      ctx.fillStyle = bolt.charging && bolt.charge >= 1 ? '#ffffff' : bReady ? '#bfe0ff' : '#6c7080';
      ctx.fillText(bolt.charging ? (bolt.charge >= 1 ? 'LASE!' : 'LAEN…') : bReady ? 'VÄLK' : '…', 70, 6);
      ctx.fillStyle = 'rgba(184,188,200,0.25)'; ctx.fillRect(70, 13, 26, 1);
      ctx.fillStyle = '#bfe0ff';
      ctx.fillRect(70, 13, 26 * (bolt.charging ? bolt.charge : bolt.active ? 0 : 1 - Math.max(0, bolt.cd) / BOLT_CD), 1);
    }
    // puuteekraanil haamrinupp
    if (TOUCH && mode === 'play') {
      ctx.strokeStyle = 'rgba(184,188,200,0.35)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.arc(LW - 16, GROUND - 22, 9, 0, 6.28); ctx.stroke();
      drawHammer(ctx, LW - 23, GROUND - 16, -0.6, hammer.cd <= 0 ? 0.9 : 0.3, 0.36);
    }

    ctx.fillStyle = '#b8bcc8';
    ctx.textAlign = 'center';
    const top = Array.isArray(ext.board) ? ext.board : [];
    if (mode === 'demo') {
      // "attract mode": vaheldumisi start-tekst ja edetabel
      if (top.length && (now / 6000 | 0) % 2 === 1) drawBoard(top, 18, 5);
      else {
        ctx.font = 'bold 7px "Courier New", monospace';
        if ((now / 650 | 0) % 2 === 0) ctx.fillText(TXT_START, LW / 2, 22);
      }
    }
    if (mode === 'demo') {                              // "LEVEL N" tsikli kohal
      ctx.font = 'bold 6px "Courier New", monospace'; ctx.fillStyle = '#ffe9a0';
      ctx.fillText('LEVEL ' + level + ' · ' + geo().name, bike.x + BW / 2, Math.max(4, GROUND - BH + geo().top.ride - 16));
      ctx.fillStyle = '#b8bcc8';
    }
    if (mode === 'play' && banner) {                    // LEVEL 2 · TSIKKEL KASVAB!
      const a = banner.t < 15 ? banner.t / 15 : banner.t > 120 ? 1 - (banner.t - 120) / 30 : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = 'bold 10px "Courier New", monospace'; ctx.fillStyle = '#ffe9a0';
      ctx.fillText(banner.s, LW / 2, 26);
      ctx.font = 'bold 5px "Courier New", monospace'; ctx.fillStyle = '#ffffff';
      ctx.fillText(geo().name, LW / 2, 38);
      ctx.globalAlpha = 1;
    }
    if (mode === 'over') {
      ctx.font = 'bold 7px "Courier New", monospace';
      ctx.fillStyle = won ? '#ffe9a0' : '#b8bcc8';
      ctx.fillText(won ? TXT_WIN : TXT_OVER, LW / 2, 16);
      ctx.font = '5px "Courier New", monospace'; ctx.fillStyle = '#b8bcc8';
      ctx.fillText(TXT_AGAIN, LW / 2, 25);
      if (top.length) drawBoard(top, 33, 5);
      else if (!ext.me && TXT_LOGIN) ctx.fillText(TXT_LOGIN, LW / 2, 35);
      if (top.length && !ext.me && TXT_LOGIN) { ctx.font = '4px "Courier New", monospace'; ctx.fillStyle = '#8f94a3'; ctx.fillText(TXT_LOGIN, LW / 2, 74); }
    }
  }

  // edetabel lõuendil (monospace → veerud joonduvad)
  function drawBoard(top, y0, n) {
    const rows = top.slice(0, n);
    ctx.font = '5px "Courier New", monospace';
    const line = (i, r) => (i + 1) + '. ' + (r.name.length > 14 ? r.name.slice(0, 13) + '…' : r.name).padEnd(14, ' ') + ' ' + pad(r.score);
    const w = Math.max(...rows.map((r, i) => ctx.measureText(line(i, r)).width), ctx.measureText(TXT_TOP).width) + 10;
    ctx.fillStyle = 'rgba(10,12,18,0.72)';
    ctx.fillRect(LW / 2 - w / 2, y0 - 3, w, 10 + rows.length * 6.5);
    ctx.fillStyle = '#ffe9a0'; ctx.font = 'bold 5px "Courier New", monospace';
    ctx.fillText(TXT_TOP, LW / 2, y0);
    ctx.font = '5px "Courier New", monospace';
    rows.forEach((r, i) => { ctx.fillStyle = r.me ? '#9cff9c' : '#c9cfe0'; ctx.fillText(line(i, r), LW / 2, y0 + 8 + i * 6.5); });
  }

  // ---------- sisend ----------
  function start() { reset(); mode = 'play'; try { ext.onStart?.(); } catch {} }
  function canRestart() { return performance.now() - overAt > 600; }
  function pressJump() {
    if (mode === 'demo') { start(); jump(); }
    else if (mode === 'play') jump();
    else if (canRestart()) start();
  }
  function pressDuck(on) {
    if (on && mode === 'demo') start();
    if (on && mode === 'over') { if (canRestart()) start(); return; }
    wantDuck = on;
  }
  function pressHammer() {
    if (mode === 'demo') { start(); swing(); }
    else if (mode === 'play') swing();
    else if (canRestart()) start();
  }
  function onScreen() {
    const r = mount.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }
  let touchCharge = -1;
  on(mount, 'pointerdown', e => {
    e.preventDefault();
    const r = mount.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    if (mode === 'play' && fx > 0.78) {
      touchCharge = frame;
      if (bolt.cd <= 0 && !bolt.active) { startCharge(); try { mount.setPointerCapture(e.pointerId); } catch {} }
      else pressHammer();
    }
    else if (mode === 'play' && fy > 0.6) { pressDuck(true); try { mount.setPointerCapture(e.pointerId); } catch {} }
    else pressJump();
  });
  const release = () => {
    wantDuck = false;
    if (touchCharge >= 0) {                       // lühike puudutus = löök, pikk = välk
      const held = frame - touchCharge; touchCharge = -1;
      if (!releaseCharge() && held < 15) { cancelCharge(); swing(); }
      else cancelCharge();
    }
  };
  on(mount, 'pointerup', release);
  on(mount, 'pointercancel', release);
  on(window, 'keydown', e => {
    const t = e.target;
    if (t && t !== document.body && t !== document.documentElement && t !== mount) return; // fookus mujal lehel
    if (e.metaKey || e.ctrlKey || e.altKey || !onScreen()) return;                       // mäng pole nähtav
    const playing = mode === 'play';
    // demo ajal võtab mäng üle ainult tühiku ja X-i — nooled kerivad lehte nagu ikka
    if (e.code === 'Space') { e.preventDefault(); pressJump(); }
    else if (e.code === 'KeyX') { e.preventDefault(); if (!e.repeat) pressHammer(); }
    else if (!playing) return;
    else if (e.key === 'Shift') { if (!e.repeat) startCharge(); }                                 // hoia shift → lae välku
    else if (e.code === 'ArrowUp' && e.shiftKey) { e.preventDefault(); cancelCharge(); keyFaster = true; }    // shift+↑ kiiremini
    else if (e.code === 'ArrowDown' && e.shiftKey) { e.preventDefault(); cancelCharge(); keySlower = true; }  // shift+↓ aeglasemalt
    else if (e.code === 'ArrowUp') { e.preventDefault(); pressJump(); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); if (!e.repeat) pressDuck(true); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); keyRight = true; }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); keyLeft = true; }
  });
  on(window, 'keyup', e => {
    if (e.code === 'ArrowUp') keyFaster = false;
    if (e.code === 'ArrowDown') { wantDuck = false; keySlower = false; }
    if (e.key === 'Shift') { keyFaster = keySlower = false; if (mode === 'play') releaseCharge(); else cancelCharge(); }
    if (e.code === 'ArrowRight') keyRight = false;
    if (e.code === 'ArrowLeft') keyLeft = false;
  });
  on(window, 'blur', () => { release(); cancelCharge(); keyFaster = keySlower = keyLeft = keyRight = false; });

  // ---------- tsükkel (peatub, kui pole nähtav) ----------
  let visible = true, last = performance.now();
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; last = performance.now(); }); io.observe(mount);
  let raf = 0, stopped = false;
  function loop(now) {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden || !ready()) { last = now; return; }
    const dt = Math.min(3, (now - last) / 16.667);
    last = now;
    if (mode === 'over' && now - overAt > IDLE_TO_DEMO) { reset(); mode = 'demo'; }
    update(dt);
    draw(now);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    stopped = true; cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect();
    offs.forEach(f => f());
    cv.remove();
  };
}
