# UFO-minimäng — disain

Kuupäev: 2026-10-27 · Haru: `ufo-mang`

## Eesmärk

Portfoolio lehele uus minimäng Viking Rideri põhjal: mootorratta asemel lendav taldrik, kadakate asemel lehmad ja Men in Blacki mehed, keda ufo laserkiirega emalaeva teleporteerib. Mäng on uus sektsioonitüüp, mida omanik saab adminis lisada, peita ja järjestada.

## Piirangud

- Viking Rider (`js/viking.js`) jääb muutmata.
- Staatiline leht, build-sammu ega väliseid teeke ei lisata. Pildid on pikslikunst koodis (nagu Viking Rideris).
- Uus sektsioon ei ole vaikimisi lehel. Olemasolev leht peab muutmata seadetega jääma pikslitäpselt samaks.

## Mängureeglid

| Teema | Reegel |
|---|---|
| Lend | Ufo lendab paremale, maastik kerib. ↑ ↓ liigutavad üles-alla, ← → muudavad kiirust. Ilma juhtimiseta vajub ufo aeglaselt alla (kuni maapinnani). |
| Ufo | Lendav taldrik, kuplist paistab roheline tulnukapea. |
| Takistused | Lehmad kolmes suuruses (väike, keskmine, suur) ja MIB-mehed (must ülikond, päikeseprillid). Ilmuvad maapinnale juhuslike vahedega. |
| Laser | **X**: roheline koonus ufost otse alla. Pikkus `BEAM_LEN` = ~pool mänguala kõrgusest. Tabab objekti, kui objekti ülaserv jääb koonuse sisse (horisontaalselt ufo all, vertikaalselt `BEAM_LEN` piires). Kiir kestab `BEAM_MS` = 350 ms, jahtumisaeg `BEAM_COOLDOWN_MS` = 600 ms. |
| Teleport | Tabatud objekt hõõgub roheliselt, tõuseb üles ja kaob; vastav loendur +1. |
| Loendurid | Üleval neoonsildid **COWS IN MOTHER SHIP: n** ja **MEN IN BLACK IN MOTHER SHIP: n**. |
| Kokkupõrge | Ufo ja objekti piirdekastid lõikuvad → objekt jääb terveks (ei kao), ufo kaotab 1 elu ja on 1,5 s haavamatu (vilgub). |
| Elud | Algul 3. Iga 5 teleporditud objekti (kokku) järel +1, maksimaalselt 5. |
| Võit | 100 teleporditud objekti → emalaev laskub, valguskiir tõmbab ufo sisse, emalaev lahkub; tekst **MISSION COMPLETE**. Uus mäng: tühik / puudutus. |
| Kaotus | Elud 0 → **GAME OVER**, uus mäng tühik / puudutus; mõne aja pärast tagasi demorežiimi (nagu Viking Rideris). |
| Demo | Enne mängu algust lendab ufo ise ja püüab objekte („ekraanisäästja“). |
| Telefon | Puudutus ülemises pooles: üles; alumises: alla; parempoolses veerandis: kiir. |

Neoonsildid on inglise keeles. Juhiste tekstid (alusta, juhtimine, uuesti) tulevad lehe keele järgi (ET/EN/FI).

## Ülesehitus

| Fail | Vastutus |
|---|---|
| `js/ufo-logic.js` | puhtad funktsioonid: `beamHits`, `collides`, `teleport` (loendurid + lisaelud + võit), `newGameState`. Node'is testitav. |
| `js/ufo.js` | joonistamine, sprite'id, sisend, tsükkel; `window.startUfo(mount, texts)` |
| `js/render.js` | uus renderdaja `ufo` (nagu `game`); mängu sõlm luuakse üks kord ja kasutatakse keelevahetusel uuesti |
| `js/i18n-strings.js` | UFO juhiste tekstid kolmes keeles |
| `admin/config.yml` | tüüp „Minimäng (UFO)“ ühiste väljadega |
| `index.html` | `.ufo-strip` stiil (kõrgus 240 px, telefonis 180 px, alati tume taust) |

Mõlemad mängud lehel: klaviatuuri sisend läheb ainult sellele mängule, mis on nähtav ja millele kasutaja viimati klõpsas või fookuse andis; kui fookust pole, siis ainult esimesele nähtavale mängule.

## Testimine

1. Ühiktestid (`tests/ufo.test.js`): kiire tabamus / möödalask (horisontaal, `BEAM_LEN` piir), kokkupõrge, loendurid lehm/mees eraldi, lisaelu iga 5 järel, elude ülempiir 5, võit täpselt 100 juures.
2. Brauseritestid (fixture `ufo` sektsiooniga): mäng käivitub (canvas), tühik alustab, X objekti kohal tõstab loendurit (testkonks `window.__ufoDebug`), konsoolis vigu pole, telefonis (390 px) `scrollWidth === 390`, kaks mängu korraga ei juhi teineteist.
3. Olemasolev pikslivõrdlus (`compare --skip-header`) jääb 0.0.
4. `tests/check_config.py` tunneb uue tüübi.

## Väljaspool

Helid, edetabel, mängu seaded adminis (raskusaste jms).
