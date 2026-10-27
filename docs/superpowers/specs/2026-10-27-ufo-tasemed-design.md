# UFO-mäng: tasemed, rekord, mürsud ja superjõud — disain

Kuupäev: 2026-10-27 · Haru: `ufo-tasemed` · Eelmine: `2026-10-27-ufo-mang-design.md`

## Eesmärk

UFO-mängule Ösel MC Viking Rideri sarnane edenemine (tasemed, punktid, isiklik rekord) ning uued mehaanikad: kasvav ufo, suuremad jooksvad MIB-mehed, vastu lendavad mürsud, Z-laser ja laaduv superjõud.

## Piirangud

- Ainult `js/ufo-logic.js`, `js/ufo.js`, `js/i18n-strings.js` ja testid muutuvad. Viking Rider, mänguriba ja ülejäänud leht jäävad samaks (pikslivõrdlus `compare --skip-header` = 0.0).
- Serverit ei lisata; rekord on brauseris (`localStorage['ufoHi']`, vead vaikselt vahele).

## Reeglid

| Teema | Reegel |
|---|---|
| Tasemed | 5 taset, `PER_LEVEL = 20` objekti tase kohta. Tase = `min(5, 1 + floor(total / 20))`. 100 → võit (nagu enne). |
| Taseme vahetus | Bänner „LEVEL n“ ~2 s. Kiiruse ülempiir `SPEED_MAX + (lvl−1)·0.35`; takistuste vahe `(70 + rnd·110) · (1 − (lvl−1)·0.1)`; MIB osakaal `0.4 + (lvl−1)·0.05`. |
| Punktid | lehm/mees `10 × lvl` (lvl enne teleporti); mürsk `5 × lvl`; uus tase `100 × uus lvl`; võit `+500`. |
| Rekord | `HI` = max(rekord, skoor) mängu lõpus (kaotus või võit), salvestatakse `localStorage['ufoHi']`. Ekraanil paremal üleval `HI 01234  00420` (5 kohta), all elud. Demos ainult `HI`. |
| Ufo suurus | `UFO_SCALE = [1, 1.15, 1.3, 1.45, 1.6]` taseme järgi; joonistus, kokkupõrkekast ja kiire allikas skaleeruvad. |
| MIB | Suurus 1,4×; 4-kaadriline jooksuanimatsioon (jalad); liiguvad vasakule `kerimiskiirus + 0.4`. |
| Mürsud | Ilmuvad paremalt (`x = LW + 4`), kõrgus juhuslik `[Y_MIN, GROUND − 24]`, kiirus vasakule `kerimiskiirus + 1.6`. Tihedus: 1. tasemel keskmiselt iga ~6 s, iga tasemega 15 % tihedamalt. Kokkupõrge ufoga → `hit` (elu maha, haavamatus kehtib), mürsk kaob. |
| Z-laser | Vajutus: horisontaalne kiir ufo paremast servast ekraani servani 200 ms, jahtumine 400 ms (`ZAP_MS`, `ZAP_COOLDOWN_MS`). Tabab kõik mürsud, mille kõrgus lõikub ufo kõrgusvahemikuga (±3 px) ja mis on ufost paremal. |
| Superjõud | Laeng 0…1: täitub 30 s jooksul (`SUPER_CHARGE_MS = 30000`); iga alla lastud mürsk +2 s. Kui laeng = 1 ja Z on all ≥ 1 s (`SUPER_HOLD_MS = 1000`): roheline sähvatus, kõik ekraanil olevad (mitte teleporteeruvad) lehmad ja mehed teleporditakse (loevad punktideks, tasemeks, lisaeludeks), kõik mürsud hävivad, laeng → 0. Riba ekraanil HUD-is. |
| Telefon | Vasak ¾: ülemine pool üles, alumine alla. Parem ¼: ülemine pool Z (hoia = superjõud), alumine pool X. |
| Tekstid | Abitekst lisab Z: ET „Z laser · hoia Z: superjõud“, EN „Z laser · hold Z: super power“, FI „Z laser · pidä Z: supervoima“. „LEVEL n“ ja „SUPER!“ inglise keeles. |

## Ülesehitus

`js/ufo-logic.js` (puhtad, testitavad): `levelOf(total)`, `addScore`-loogika `teleport` sees (`score`), `zapHits(ufo, missile)`, `superReady`/`chargeStep`, `superBlast(state, kinds[])`. Olek saab väljad `score`, `level`, `charge`. `teleport` tagastab ka `levelUp: boolean`.

`js/ufo.js`: joonistus ja sisend; mürsud, Z-laser, superjõu hoidmine, ufo skaleerimine, MIB animatsioon, bänner, HI. Testikonks laieneb: `spawnMissile(dyFromUfo)`, `setCharge(v)`, `setTotal(n)`.

## Testimine

1. Ühiktestid: tase 20/40/…/100 piiril; punktid lehm/mees/mürsk/tasemeboonus/võit; `levelUp` õigel hetkel; `zapHits` kõrguse lõikumine ja suund; laeng (aeg + mürskude boonus, max 1); `superBlast` loendurid, tase, lisaelud ≤ 5, võit kui ületab 100.
2. Brauser (`__UFO_TEST__`): Z laseb mürsu alla (skoor +5); mürsk ufosse → elud −1; `setCharge(1)` + Z all 1,1 s → kõik objektid teleporditud, laeng 0; `setTotal(19)` + üks teleport → `level 2`, ufo kokkupõrkekast suurem; HI salvestub `localStorage`-sse pärast GAME OVER-it ja on uuel laadimisel näha (`__ufoDebug.hi()`); telefonis `scrollWidth === 390`; konsoolis vigu pole.
3. Olemasolevad testid ja pikslivõrdlus jäävad roheliseks.

## Väljaspool

Ühine edetabel, helid, raskusastme seaded adminis.
