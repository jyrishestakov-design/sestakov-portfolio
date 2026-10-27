# UFO-minimäng — disain

Kuupäev: 2026-10-27 · Haru: `ufo-mang`

## Eesmärk

Portfoolio lehele uus minimäng Viking Rideri põhjal: mootorratta asemel lendav taldrik, kadakate asemel lehmad ja Men in Blacki mehed, keda ufo laserkiirega emalaeva teleporteerib. Mõlemad mängud on ühes riba-sektsioonis „Minimängud“: demod jooksevad kõrvuti, valitud mäng laieneb täislaiusse.

## Piirangud

- Viking Rider (`js/viking.js`) jääb muutmata.
- Staatiline leht, build-sammu ega väliseid teeke ei lisata. Pildid on pikslikunst koodis (nagu Viking Rideris).
- Lehe ülejäänud osa (kõik peale mänguriba) peab jääma pikslitäpselt samaks.

## Mänguriba „Minimängud“ (sektsioonitüüp `games`)

| Teema | Reegel |
|---|---|
| Admin | Tüüp „Minimängud“, ühised väljad + linnukesed `viking` ja `ufo` (mõlemad vaikimisi sees). Vana tüüp `game` (ainult Viking Rider) jääb alles. |
| Omaniku leht | `content/site.json`-is asendatakse praegune `game` sektsioon (`id: ride`) `games` sektsiooniga, mõlemad mängud sees. |
| Üks mäng sees | See mäng on üle kogu laiuse nagu praegu, valikuvaadet pole. |
| Mõlemad sees — valikuvaade | Riba on kaheks: vasakul Viking Rideri demo, paremal UFO demo. Kummagi peal silt „▶ VIKING RIDER“ / „▶ UFO“. Klaviatuur: ← → valib poole (esiletõst), Enter avab. Tühik ja X ei jõua kummagi mänguni. |
| Valik | Klõps / puudutus poolel või Enter → see mäng laieneb täislaiusse, teine peidetakse. Mäng on demorežiimis; tühik / puudutus alustab. |
| Tagasi | Nurganupp „← Mängud“ (tekst lehe keeles) taastab valikuvaate. |
| Telefon | Valikuvaates samuti kõrvuti (kumbki pool laiusest). |

Valikuvaate sisendi blokeerimine käib riba enda püüdva (capture) `keydown`-kuulajaga aknal ja läbipaistva klõpsukihiga poolte peal — mänge muuta pole vaja. Peidetud mäng (`display:none`) klaviatuurile ei reageeri, sest selle `onScreen()` kontroll ebaõnnestub.

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
| `js/games.js` | mänguriba: valikuvaade, laiendamine, „← Mängud“, sisendi blokeerimine valikuvaates; `window.startGames(stripEl, { viking, ufo, texts })` |
| `js/render.js` | uus renderdaja `games`; riba sõlm luuakse üks kord ja kasutatakse keelevahetusel uuesti (tekstid uuendatakse) |
| `js/i18n-strings.js` | UFO juhiste ja mänguriba tekstid kolmes keeles |
| `admin/config.yml` | tüüp „Minimängud“ ühiste väljadega + `viking`, `ufo` linnukesed |
| `index.html` | mänguriba stiil (kõrgus 240 px, telefonis 180 px, alati tume taust, poolte sildid, nurganupp) |
| `content/site.json` | `game` sektsioon → `games` (mõlemad sees) |

## Testimine

1. Ühiktestid (`tests/ufo.test.js`): kiire tabamus / möödalask (horisontaal, `BEAM_LEN` piir), kokkupõrge, loendurid lehm/mees eraldi, lisaelu iga 5 järel, elude ülempiir 5, võit täpselt 100 juures.
2. Brauseritestid:
   - UFO (fixture, ainult `ufo` sees): mäng käivitub (canvas), tühik alustab, X objekti kohal tõstab loendurit (testkonks `window.__ufoDebug`), konsoolis vigu pole.
   - Mänguriba (mõlemad sees): kaks canvast kõrvuti; tühik valikuvaates ei käivita kumbagi; klõps UFO poolel → UFO täislaiuses, Viking peidus; „← Mängud“ → tagasi kahe demoga; ← → + Enter valib.
   - Telefon (390 px): `scrollWidth === 390` valikuvaates ja laiendatult.
3. Pikslivõrdlus (`compare --skip-header`, mänguriba `#ride` peidetud nagu praegu) jääb 0.0.
4. `tests/check_config.py` tunneb uue tüübi.

## Väljaspool

Helid, edetabel, mängu seaded adminis (raskusaste jms).
