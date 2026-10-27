# UFO tasemed, rekord, mürsud ja superjõud — tööplaan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UFO-mäng saab 5 taset, punktid, isikliku rekordi, kasvava ufo, suuremad jooksvad MIB-mehed, vastu lendavad mürsud, Z-laseri ja laaduva superjõu.

**Architecture:** Reeglid (tase, punktid, laeng, Z-tabamus, superjõud) on puhtad funktsioonid failis `js/ufo-logic.js`. Joonistus, sisend ja mürskude liikumine on failis `js/ufo.js`. Mänguriba ja ülejäänud leht jäävad puutumata.

**Tech Stack:** puhas JS, canvas 2D, Node 22 `node:test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-ufo-tasemed-design.md`

## Global Constraints

- Muutuvad ainult `js/ufo-logic.js`, `js/ufo.js`, `js/i18n-strings.js` ja testid. `compare --skip-header` peab jääma 0.0 ja `js/viking.js` ega `js/games.js` ei muutu.
- Väärtused:
  - `PER_LEVEL = 20`, `LEVELS = 5`, `UFO_SCALE = [1, 1.15, 1.3, 1.45, 1.6]`
  - `ZAP_MS = 200`, `ZAP_COOLDOWN_MS = 400`
  - `SUPER_CHARGE_MS = 30000`, `MISSILE_BONUS_MS = 2000`, `SUPER_HOLD_MS = 1000`
  - punktid: objekt `10 × lvl`, mürsk `5 × lvl`, uus tase `100 × uus lvl`, võit `+500`
- Rekord on `localStorage['ufoHi']` ja kõik pöördumised on `try/catch` sees.
- Tekstid: `LEVEL n`, `SUPER!` ja neoonsildid on inglise keeles. Abitekst lisab Z-i kirjelduse kolmes keeles (spec).
- Testikäsud: `node --test tests/*.test.js`, `node tests/e2e.mjs check`, `node tests/e2e.mjs compare <baseline> --skip-header`.

## Review Focus

1. Z all hoidmine enne, kui laeng on täis: superjõud ei vallandu. Hoidmisaeg hakkab lugema alles täis laengust ja vallandub alles 1 s pärast seda (test Task 3).
2. Superjõud „over“ või „win“ režiimis ei tee midagi (test Task 3).
3. Suurem ufo kõrgematel tasemetel ei vaju maapinnast läbi: `ufo.y + UFO_H × scale ≤ GROUND` (test Task 2).
4. `localStorage` viskab vea (privaatne režiim): mäng töötab, rekord on 0 ja konsoolis pole vigu (test Task 2).
5. Kaks mürsku järjest haavamatuse ajal: elu kaob ainult üks kord ja mõlemad mürsud kaovad (test Task 3).

---

### Task 1: reeglid `js/ufo-logic.js`

**Files:** Modify `js/ufo-logic.js`, `tests/ufo.test.js`

**Interfaces — Produces (`UfoLogic`):**
- konstandid Global Constraints'ist ning `LEVELS`, `PER_LEVEL`, `UFO_SCALE`
- `newGameState()` → senine olek + `{ score: 0, level: 1, charge: 0, levelUp: false }`
- `levelOf(total) -> number`, mis annab `min(LEVELS, 1 + floor(total / PER_LEVEL))`
- `teleport(state, kind)` (laiendus):
  - `score += 10 × state.level` (tase enne teleporti)
  - seejärel `level = levelOf(total)`, `levelUp = level > vana`
  - kui `levelUp`: `score += 100 × level`
  - kui `won` muutub `true`-ks: `score += 500`
- `shootMissile(state) -> state`: `score += 5 × level`, `charge = min(1, charge + MISSILE_BONUS_MS / SUPER_CHARGE_MS)`
- `chargeStep(state, dtMs) -> state`: `charge = min(1, charge + dtMs / SUPER_CHARGE_MS)`
- `superBlast(state, kinds: string[]) -> state`: `teleport` iga `kind`'i kohta järjest ja seejärel `charge = 0`. `levelUp` on tõene, kui mõni teleport tõstis taset.
- `zapHits(ufo: {x, y, w, h}, m: {x, y, w, h}) -> boolean`: tõene, kui `m.x + m.w > ufo.x + ufo.w` ja vertikaalsed lõigud `[y−3, y+h+3]` lõikuvad.

- [ ] **Step 1: testid** (`tests/ufo.test.js` lisa):
  - `levelOf`: 0→1, 19→1, 20→2, 99→5, 100→5, 500→5
  - punktid: 1 teleport → `score 10`; 20 teleporti → `level 2`, `score = 20×10 + 200 = 400`, 20. teleport annab `levelUp:true`, 21. annab `levelUp:false` ja `+20`
  - 100 teleporti → `won`, `level 5`, `score` sisaldab `+500` täpselt ühe korra (101. ei lisa uuesti 500): oodatud `score` arvutatakse testis valemiga
  - `shootMissile` 1. tasemel → `score +5`, `charge ≈ 2000/30000`; `chargeStep(s, 30000)` → `charge 1`; `chargeStep` üle 1 → 1
  - `superBlast(s, ['cow','man','cow'])` → `cows +2`, `men +1`, `charge 0`; `superBlast` 18 objekti juures 3 objektiga → `level 2`, `levelUp true`; 98 juures 5 objektiga → `won true`, elud ≤ 5
  - `zapHits({x:10,y:50,w:24,h:12}, {x:60,y:55,w:6,h:3})` → true; `y:70` → false; `y:64` → true (3 px tolerants: 62+3=65 ≥ 64); `x:0` (ufost vasakul) → false
- [ ] **Step 2:** `node --test tests/ufo.test.js` → uued FAIL
- [ ] **Step 3:** implementeeri
- [ ] **Step 4:** `node --test tests/*.test.js` → PASS
- [ ] **Step 5:** commit — „UFO reeglid: tasemed, punktid, laeng, Z, superjõud“

---

### Task 2: tasemed, punktid, rekord, kasvav ufo ja jooksvad MIB-mehed (`js/ufo.js`)

**Files:** Modify `js/ufo.js`, `tests/e2e-checks.mjs`

**Interfaces:**
- Consumes: Task 1
- Produces:
  - Mängus `state = UfoLogic.teleport(...)`. Kui `state.levelUp`, tuleb bänner `LEVEL n` ~120 kaadrit ning `SPEED_MAX`, objektide vahe ja MIB-osakaal kasvavad spec'i valemite järgi.
  - Ufo skaleerimine: `sc = UFO_SCALE[state.level − 1]`. Joonistus `drawImage(UFO, x, y, UFO_W × sc, UFO_H × sc)`. `ufoBox`, kiire allikas ja `y` piirang kasutavad skaleeritud mõõte.
  - MIB: sprite skaleeritakse 1,4×, 4 jalakaadrit (`MAN_RUN[0..3]` = jalgade read vahetuvad), kaader `((frame/6) | 0) % 4`. Liikumine `o.x -= move + 0.4 × dt`.
  - HUD paremal üleval: `HI 01234  00420`, demos ainult `HI 01234`. Elud on rea all.
  - Rekord: `hi` loetakse käivitamisel `localStorage['ufoHi']`-st. Mängu lõpus (`over` või `win`) `hi = max(hi, floor(score))` ja salvestatakse.
  - Testikonks: `setTotal(n)` (paneb `state.total = n`, `state.level = levelOf(n)`) ja `hi()`.

- [ ] **Step 1:** testid `export async function ufoLevels`:
  - `setTotal(19)`, `spawnBelow('cow')`, X, 700 ms → `state().level === 2`, `state().score > 0`; `info().ufoW` (lisa info'sse skaleeritud laius) ≈ `UFO_W × 1.15`
  - `setTotal(80)` (tase 5), 3 s ootust ilma sisendita → `info().ufo.y + info().ufoH <= 94` (Review Focus 3)
  - kaotus: elud 0-ks (`hit` 3 korda läbi `spawnBelow` kokkupõrke või konksu `kill()`; lisa konks `kill()`, mis seab `lives=1` ja kutsub kokkupõrke) → `mode 'over'` → `localStorage.ufoHi` > 0; uus leht → `__ufoDebug.hi()` sama
  - `addInitScript`, mis teeb `localStorage` getter'i, mis viskab vea → leht töötab, `hi() === 0`, konsoolis vigu pole (Review Focus 4)
- [ ] **Step 2:** FAIL → **Step 3:** implementeeri → **Step 4:** `check` PASS, `compare --skip-header` PASS
- [ ] **Step 5:** pildista tase 1 ja tase 5 (suur ufo, jooksev MIB) ning vaata pilt üle
- [ ] **Step 6:** commit — „UFO: tasemed, punktid, rekord, kasvav ufo, jooksvad MIB-mehed“

---

### Task 3: mürsud, Z-laser, superjõud ja puutejuhtimine (`js/ufo.js`, tekstid)

**Files:** Modify `js/ufo.js`, `js/i18n-strings.js`, `tests/e2e-checks.mjs`

**Interfaces:**
- Consumes: Task 1, 2
- Produces:
  - **Mürsud** `{x, y, w:6, h:3}`. Ilmuvad paremalt, keskmine vahe 6 s × `0.85^(lvl−1)`, kiirus `speed + 1.6`. Joonistus: punane-oranž kere ja suits. Kokkupõrge → `hit(state, now)` ja mürsk kaob (alati, ka haavamatuse ajal).
  - **Z** keydown (`!e.repeat`): `zap(now)`, kui jahtumine lubab. Aktiivse kiire ajal eemaldab iga kaader `zapHits`-i mürsud ja iga tabamus annab `state = shootMissile(state)`. Joonistus on horisontaalne roheline joon ufost paremale servani.
  - **Superjõud:**
    - `zHeldSince` seatakse Z keydown'il ja nullitakse keyup'il.
    - Iga kaader: `state = chargeStep(state, dtMs)` (ainult `play`).
    - Kui `superReady` on tõene ja Z on all: `fullSince = max(zHeldSince, chargeFullAt)`. Kui `now − fullSince ≥ SUPER_HOLD_MS`, vallandub `superBlast` kõigi ekraanil olevate (`rise < 0`) objektidega. Need saavad `rise = 0`, mürsud tühjendatakse, `flash = 1` ja tuleb tekst `SUPER!`.
    - Režiimides `over` ja `win` ei tehta midagi.
  - **HUD:** laadimisriba neoonsiltide all (laius 40, kõrgus 2). Täis riba vilgub.
  - **Puude:** kui `fx > 0.75`, siis `fy < 0.5` → Z (hoidmine), muidu X. Kui `fx ≤ 0.75`, siis üles või alla nagu enne.
  - **Abitekstid** (`ufoHelp`, `ufoHelpTouch` kolmes keeles): lõppu `· Z laser · hoia Z: superjõud` (EN `· Z laser · hold Z: super power`, FI `· Z laser · pidä Z: supervoima`). Puuteversioonis `paremal üleval: Z, all: kiir` jne.
  - **Testikonks:** `spawnMissile(dy)` (mürsk `x = ufo paremserv + 40`, `y = ufo.y + dy`), `setCharge(v)`, `info().missiles`.

- [ ] **Step 1:** testid `export async function ufoMissiles`:
  - `spawnMissile(4)`, Z → 300 ms pärast `info().missiles.length === 0`, `state().score === 5`
  - mürsk ufosse: `spawnMissile(4)` ilma Z-ta, oota 600 ms → `lives === 2`; kohe veel 2 mürsku → `lives === 2` ja mürske 0 (Review Focus 5)
  - `setCharge(0.5)`, hoia Z 1,2 s → kõik objektid alles (superjõud ei vallandu); `setCharge(1)`, hoia Z 1,1 s → `state().total` kasvab ekraanil olnud objektide võrra, `charge === 0` (Review Focus 1)
  - `over` režiimis `setCharge(1)` ja Z hoidmine → `total` ei muutu (Review Focus 2)
  - telefon 390 px `scrollWidth === 390`; konsoolis vigu pole
- [ ] **Step 2:** FAIL → **Step 3:** implementeeri → **Step 4:** `check` PASS, `compare --skip-header` PASS, `node --test` PASS (tekstivõtmed)
- [ ] **Step 5:** pildista mürsud, Z-laser ja superjõu sähvatus ning vaata üle
- [ ] **Step 6:** commit — „UFO: mürsud, Z-laser, superjõud“

---

### Task 4: lõpp

- [ ] lõppülevaatus, parandused, lõpppildid kasutajale, push; `main`-i liitmine **ainult kasutaja loal**
