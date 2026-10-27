# Kujundus, sektsioonid ja keeled administ — tööplaan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portfoolio leht joonistub `content/site.json` sektsioonide, kujunduse ja keele andmete järgi; kõike saab muuta `/admin` kaudu.

**Architecture:** Staatiline leht ilma build-sammuta. Puhtad abifunktsioonid lähevad faili `js/core.js` (testitav Node'iga). Renderdus läheb faili `js/render.js` (tüübi → funktsiooni register) ja minimäng faili `js/viking.js`. `index.html` jääb CSS-i ja raamistiku kandjaks. Sveltia CMS i18n `single_file` annab faili kuju `{ et, en, fi }`.

**Tech Stack:** puhas JS (ES2017, ilma moodulite laadijata), Sveltia CMS, Node 22 `node:test`, Playwright (eelpaigaldatud), Python 3 + PIL + PyYAML.

**Spec:** `docs/superpowers/specs/2026-10-27-kujundus-admin-design.md`

## Global Constraints

- Serverit ega andmebaasi ei lisata. Leht jääb GitHub Pagesi staatiliseks leheks, build-käsku pole.
- Muutmata seadetega peab leht välja nägema täpselt nagu praegu (pikslivõrdlus, Task 2 baseline).
- Tühi kujundusväli = vaikeväärtus. CSS-muutuja kirjutatakse üle ainult täidetud väljal.
- Keeled: `et` (vaikimisi), `en`, `fi`. Tõlkimata väli → eestikeelne väärtus.
- `body` tekst: lihttekst, tühi rida = lõik, URL → link. HTML-i ega Markdowni ei tõlgendata (ainult `textContent` / `createElement`).
- Väliseid skripte ei lisata peale olemasolevate (Google Fonts, Sveltia unpkg-ist).
- Kasutajale nähtav tekst eesti keeles; koodi kommentaarid eesti keeles nagu praegu.

## Review Focus

1. Vana kujuga `site.json` (ilma `et`-võtmeta, ilma `sections`-ita) → leht peab ikka joonistuma vaikimisi sektsioonidega (test Task 4).
2. Kaks sama `id`-ga sektsiooni → mõlemad joonistuvad; menüülink viib esimesele (test Task 4).
3. Vigane `?lang=xx` või peidetud keel URL-is → langeb tagasi `et`-le (test Task 1).
4. Pikk, tühikuteta URL `body` tekstis telefonis → ei tekita horisontaalset kerimist (test Task 5).
5. Kõik sektsioonid välja lülitatud → leht ei kuku kokku, päis ja jalus jäävad (test Task 5).

---

## Failistruktuur

| Fail | Vastutus |
|---|---|
| `js/core.js` | puhtad funktsioonid: keeled, andmete ühendamine, kujundus → CSS, menüü, tekst → lõigud |
| `js/i18n-strings.js` | lehe enda tekstide sõnastik `et/en/fi` |
| `js/render.js` | sektsioonitüüpide renderdajad, menüü, keelevalik, kujunduse rakendamine, käivitus |
| `js/viking.js` | minimäng (tõstetud muutmata `index.html`-ist), `window.startViking(mountEl)` |
| `index.html` | CSS, päis/jalus raamistik, `<main id="sections">` |
| `admin/config.yml` | Sveltia CMS skeem |
| `content/site.json` | sisu `{ et, en, fi }` |
| `scripts/migrate.py` | ühekordne üleminek vanast kujust uude |
| `tests/core.test.js` | `node --test` ühiktestid |
| `tests/e2e.mjs` | Playwright: visuaal + funktsioonid |
| `tests/fixtures/*.json` | testandmed |

`core.js` ja `i18n-strings.js` lõpevad mustriga
`if (typeof module !== 'undefined') module.exports = api; else window.SiteCore = api;`
(teisel `window.SiteStrings`), et neid saaks Node'is testida.

---

### Task 1: `js/core.js` abifunktsioonid

**Files:** Create `js/core.js`, `tests/core.test.js`

**Interfaces — Produces (`window.SiteCore`):**
- `LANGS = ['et','en','fi']`
- `mergeLocale(base, over) -> object` — sügav ühendamine: `over` väärtus võidab, kui see pole `''`, `null`, `undefined`; massiivid ühendatakse indeksi järgi (pikkus = `base` pikkus, kui `base` on massiiv, muidu `over` oma); objektid rekursiivselt.
- `pickLang(search: string, stored: string|null, enabled: string[]) -> string` — järjekord: `?lang=` → `stored` → `'et'`; tulemus peab olema `enabled`-is ja `LANGS`-is, muidu `'et'`. `'et'` on alati lubatud.
- `localeData(file, lang) -> object` — kui `file.et` puudub, käsitle `file`-i ennast kui `et` (vana kuju); tagasta `mergeLocale(et, file[lang] || {})`.
- `designToCss(design) -> string` — tagastab CSS teksti. Kaardistus: `dark|light.{bg,surface,line,ink,inkDim,accent}` → `--bg,--surface,--line,--ink,--ink-dim,--accent`; `dark` → reegel `:root[data-theme="dark"]` ja `@media (prefers-color-scheme: dark){:root:not([data-theme="light"])}`; `light` → `:root[data-theme="light"]` ja `@media (prefers-color-scheme: light){:root:not([data-theme="dark"])}`. `fonts.heading` → `--font-display`, `fonts.body` → `--font-body` (väärtus `"<Nimi>", system-ui, sans-serif`), `fonts.baseSize` → `body{font-size:<n>px}`. `layout.maxWidth` → `--maxw:<n>px`. `layout.spacing` `'tight'|'normal'|'airy'` → `section{padding-block:…}` väärtused `clamp(2.2rem,6vw,4rem)` / (puudub) / `clamp(5rem,12vw,9rem)`. `layout.webColumns` 1|3 → `.web-grid{grid-template-columns:repeat(n,minmax(0,1fr))}` (2 = vaikimisi, ei kirjuta). `background.*` ja `effects.*` ei mõjuta (neid rakendab render.js). Tühi/puuduv `design` → `''`.
- `fontsUrl(design) -> string|null` — Google Fonts css2 URL valitud fontidele, mis pole juba laaditud (`Bricolage Grotesque`, `IBM Plex Sans`, `IBM Plex Mono`); `null`, kui midagi laadida pole.
- `FONT_CHOICES` — massiiv: `Bricolage Grotesque, IBM Plex Sans, Inter, Manrope, Space Grotesk, DM Sans, Work Sans, Archivo, Syne, Fraunces, Playfair Display, Cormorant Garamond, Libre Baskerville, Source Serif 4`.
- `buildNav(sections) -> [{id,label}]` — `enabled !== false && inMenu && menuLabel`, järjekord säilib, sama `id` ainult esimene.
- `textBlocks(body) -> Array<Array<{t:'text'|'link', v:string}>>` — lõigud tühjade ridade järgi, iga lõik jagatud tekstiks ja `https?://\S+` linkideks (lõpu `.,;:!?)` jääb tekstiks).

- [ ] **Step 1: kirjuta testid** `tests/core.test.js` (`node:test` + `assert`):
  - `mergeLocale({a:'x',b:{c:'y'}}, {a:'',b:{c:'z'}})` → `{a:'x',b:{c:'z'}}`
  - `mergeLocale({l:[{t:'a',u:'1'},{t:'b',u:'2'}]}, {l:[{t:'A'}]})` → `{l:[{t:'A',u:'1'},{t:'b',u:'2'}]}`
  - `pickLang('?lang=en','fi',['et','en','fi'])` → `'en'`; `pickLang('?lang=xx',null,['et','en'])` → `'et'`; `pickLang('','fi',['et','en'])` → `'et'`; `pickLang('?lang=fi',null,['et','en'])` → `'et'`
  - `localeData({settings:{name:'N'}}, 'en').settings.name` → `'N'` (vana kuju)
  - `localeData({et:{s:'t'},en:{s:''}}, 'en').s` → `'t'`
  - `designToCss({})` → `''`; `designToCss({dark:{accent:'#ff0000'}})` sisaldab `--accent:#ff0000` ja `:root[data-theme="dark"]`, ei sisalda `--bg`
  - `designToCss({layout:{webColumns:3}})` sisaldab `repeat(3,`; `{layout:{webColumns:2}}` → `''`
  - `fontsUrl({})` → `null`; `fontsUrl({fonts:{heading:'Syne'}})` sisaldab `family=Syne`
  - `buildNav([{id:'a',menuLabel:'A',inMenu:true},{id:'b',menuLabel:'B',inMenu:true,enabled:false},{id:'a',menuLabel:'A2',inMenu:true}])` → `[{id:'a',label:'A'}]`
  - `textBlocks('Tere\n\nvt https://x.ee.')` → `[[{t:'text',v:'Tere'}],[{t:'text',v:'vt '},{t:'link',v:'https://x.ee'},{t:'text',v:'.'}]]`
- [ ] **Step 2:** `node --test tests/` → FAIL (moodulit pole)
- [ ] **Step 3:** kirjuta `js/core.js`
- [ ] **Step 4:** `node --test tests/` → kõik PASS
- [ ] **Step 5:** commit `js/core.js tests/core.test.js` — „core.js: keelte, kujunduse ja menüü abifunktsioonid“

---

### Task 2: visuaalne baseline

**Files:** Create `tests/e2e.mjs` (ainult baseline-osa), `tests/fixtures/` (tühi)

**Interfaces — Produces:** `node tests/e2e.mjs baseline <dir>` ja `node tests/e2e.mjs compare <dir>`. Serveerib repo juurt `python3 -m http.server 8765`, avab `http://localhost:8765/`, peidab enne pildistamist `#grain`, `#tc`, `#ride` (`visibility:hidden`) ja ootab `document.fonts.ready` + `#logList .entry`. Kolm vaadet: `dark` 1280px, `light` 1280px, `phone` 390px (dark); täislehe pildid `<vaade>.png`. `compare` arvutab Pythoniga (PIL `ImageChops.difference`) erinevate pikslite osakaalu; PASS, kui ≤ 0.1% igas vaates ja mõõtmed võrdsed.

- [ ] **Step 1:** kirjuta skript
- [ ] **Step 2:** praeguses (muutmata) seisus `node tests/e2e.mjs baseline $SCRATCH/baseline` → 3 pilti
- [ ] **Step 3:** `node tests/e2e.mjs compare $SCRATCH/baseline` → PASS (võrdlus iseendaga)
- [ ] **Step 4:** commit `tests/e2e.mjs` — „e2e: visuaalne baseline ja võrdlus“

---

### Task 3: andmete üleminek

**Files:** Create `scripts/migrate.py`; Modify `content/site.json`

**Interfaces — Produces:** `content/site.json` kuju `{ "et": { settings, sections, works, websites, files, design }, "en": {}, "fi": {} }`. `settings` kaotab `reel` ja `draftNotices`, saab `languages: ["et","en","fi"]` ja `defaultTheme: "auto"`. `sections` (järjekord):

| type | id | title | countLabel | menuLabel | inMenu |
|---|---|---|---|---|---|
| game | ride | | | | false |
| hero | top | | | | false |
| log | log | Shot Log | Valitud tööd 1999–2025 | Shot Log | true |
| reel | reel | Reel | YouTube | Reel | true |
| web | web | Veebilehed | | Veeb | true |
| caps | caps | Oskused | Üle 30 aasta | Oskused | true |
| files | files | Failid | Allalaadimine | Failid | true |
| index | index | Index | Lingid | Index | true |

Kõigil `enabled: true`, `notice: ''`. `reel` sektsioon saab `settings.reel` väljad (`embedUrl`, `image`, `note`, `heading` = vana `reel.title`). `caps.items` ja `index.links` = praegune HTML-i sisu 1:1 (`index.html` read „CAPABILITIES“ ja „INDEX“ sektsioonid; `index.links[].display` = praegune parempoolne lühike URL). `design: {}`.

- [ ] **Step 1:** kirjuta `scripts/migrate.py` (loeb ja kirjutab `content/site.json`, `ensure_ascii=False, indent=2`; kui `et` on juba olemas, väljub muutmata)
- [ ] **Step 2:** käivita; kontroll: `python3 -c` assert — `len(d['et']['sections'])==8`, `len(d['et']['works'])==22`, `len(d['et']['websites']['items'])==9`, `[c['title'] for c in caps.items]==['Liikuvgraafika','3D-animatsioon','Montaaž ja kaamera']`, `len(index.links)==4`, `'reel' not in d['et']['settings']`
- [ ] **Step 3:** teine käivitus ei muuda faili (`git diff --stat` sama)
- [ ] **Step 4:** commit — „Sisu üleminek sektsioonide ja keelte kujule“ (leht on selle commiti järel katki kuni Task 4-ni; sama haru, ei avaldata)

---

### Task 4: renderdus sektsioonide järgi (olemasolevad tüübid)

**Files:** Create `js/render.js`, `js/viking.js`, `js/i18n-strings.js` (esialgu ainult `et`); Modify `index.html`

**Interfaces:**
- Consumes: `SiteCore.localeData`, `buildNav`, `textBlocks`
- Produces: `RENDERERS: { [type]: (section, data, strings) -> HTMLElement }` objekt `render.js`-is; iga element on `<section id="{section.id}">`, sisemine struktuur ja klassid **täpselt** nagu praegu `index.html`-is (`.wrap`, `.sec-head`, `.count`, `.flag` jne). `window.startViking(mountEl)` `viking.js`-is (praegune kood muutmata, ainult `mount` tuleb argumendina). `SiteStrings.et` sisaldab kõiki praegu JS-is/HTML-is kõvakodeeritud tekste (`'— täida —'`, `'Ava leht ↗'`, `'Link tulekul'`, `'aadress lisamata'`, `'Avalikke faile praegu pole.'`, Shot Logi `FIELD_MAP` sildid, `'↓ Keri — {n} logitud tööd'`, `'{n} lehte · disain + arendus'`, klienditsooni tekstid, `'Lisa video link →'`).
- `index.html`: `<main id="sections"></main>`; `<nav id="nav"></nav>`; kõvakodeeritud sektsioonide HTML ja inline-skriptid eemaldatakse; `<script src="js/core.js">`, `js/i18n-strings.js`, `js/viking.js`, `js/render.js` (selles järjekorras, `defer`). Teema, ajakood ja teralisus liiguvad `render.js`-i muutmata.
- Kui andmetes `sections` puudub → `DEFAULT_SECTIONS` (sama tabel nagu Task 3).

- [ ] **Step 1:** lisa `tests/e2e.mjs`-i `check` režiim (esimesed testid): `#nav a` tekstid = `['Shot Log','Reel','Veeb','Oskused','Failid','Index']`; `#log .entry` arv 22; `#web .site` arv 9; konsoolis vigu 0; fixture `tests/fixtures/old-shape.json` (praeguse `main`-i `site.json`) route'iga → 8 sektsiooni joonistub (Review Focus 1); fixture kahe sama `id`-ga sektsiooniga → mõlemad DOM-is, `#nav` üks link (Review Focus 2). Playwright `page.route('**/content/site.json', …)` fixture'i serveerimiseks.
- [ ] **Step 2:** `node tests/e2e.mjs check` → FAIL
- [ ] **Step 3:** kirjuta `render.js`, `viking.js`, `i18n-strings.js`, muuda `index.html`
- [ ] **Step 4:** `node tests/e2e.mjs check` → PASS
- [ ] **Step 5:** `node tests/e2e.mjs compare $SCRATCH/baseline` → PASS (≤ 0.1%)
- [ ] **Step 6:** commit — „Leht joonistub sektsioonide nimekirja järgi“

---

### Task 5: uued sektsioonitüübid, kujundus, taust ja efektid

**Files:** Modify `js/render.js`, `index.html` (CSS uutele tüüpidele ja taustale); Create `tests/fixtures/all-types.json`

**Interfaces:**
- Consumes: `SiteCore.designToCss`, `fontsUrl`, `textBlocks`
- Produces: `RENDERERS.text|textImage|gallery|video|links`. `applyDesign(design)`: lisab `<style id="design-css">` = `designToCss`; `fontsUrl` → `<link rel="stylesheet">`; `effects.grain` 0–100 → `#grain` läbipaistvus `grain/1000` (vaikimisi puudub = praegune `.05`; 0 → peida ja peata `setInterval`); `effects.showRec === false` → peida `.rec`; `effects.showTimecode === false` → peida `#tc`; `background.image` → fikseeritud `<div id="bgimg">` `z-index:0`, `opacity: opacity/100`, `filter: blur(<blur>px)`, peal `::after` must kiht `shade/100`. `settings.defaultTheme` `'dark'|'light'` → `data-theme`, kui kasutaja pole ise valinud (localStorage `vf-theme` võidab).
- Uute tüüpide CSS: `.text-body p{max-width:62ch}`; `.ti{display:grid;grid-template-columns:1fr 1fr}` (`imageSide:'left'` → pilt ees), telefonis 1 veerg; `.gal` ruudustik `repeat(auto-fill,minmax(14rem,1fr))`, klõps avab `<dialog>` suure pildi ja pealdisega (Esc sulgeb); `video` kasutab olemasolevat `.frame` + iframe; `links` kasutab `.idx-list`. Kõigil `overflow-wrap:anywhere` tekstil.

- [ ] **Step 1:** lisa `check`-i testid fixture'iga `all-types.json`: iga uus tüüp joonistub (`#t1 p` 2 lõiku, `#t1 a[href="https://x.ee"]`; `#ti1 img`; `#g1 img` 3 tk, klõps → `dialog[open]`; `#v1 iframe`; `#l1 a` 2 tk); `design.dark.accent:'#ff0000'` → `getComputedStyle(documentElement).getPropertyValue('--accent').trim()==='#ff0000'` tumedas teemas; `fonts.heading:'Syne'` → `<link href*="family=Syne">`; `effects.grain:0` → `#grain` peidus; `showTimecode:false` → `#tc` peidus; `background.image` → `#bgimg` olemas; `layout.webColumns:3` → `.web-grid` 3 veergu; telefonis 390px ühes `body`-s 200-märgine tühikuteta URL → `scrollWidth===390` (Review Focus 4); fixture kõik `enabled:false` → `header` ja `footer` nähtavad, vigu 0 (Review Focus 5).
- [ ] **Step 2:** `node tests/e2e.mjs check` → uued FAIL
- [ ] **Step 3:** implementeeri
- [ ] **Step 4:** `check` PASS ja `compare` PASS (tegelik `site.json` jääb samaks)
- [ ] **Step 5:** commit — „Uued sektsioonitüübid, kujundus, taust ja efektid“

---

### Task 6: keeled lehel

**Files:** Modify `js/render.js`, `js/i18n-strings.js`, `index.html` (keelevaliku CSS)

**Interfaces:**
- Consumes: `SiteCore.pickLang`, `localeData`
- Produces: päises `<div class="langs">` nupud `ET · EN · FI` ainult `settings.languages` keeltele (kui ainult üks → peidetud). Klõps: `localStorage['vf-lang']`, `history.replaceState` `?lang=` (et → parameeter eemaldub), uuesti renderdus ilma lehe laadimiseta. `<html lang>` = valitud keel. `SiteStrings.en` ja `.fi` = kõik `et` võtmed tõlgitult; puuduv võti → `et`.
- `index.html` `<title>` ja `meta description` jäävad eesti keelde (ei muudeta).

- [ ] **Step 1:** testid: `?lang=en` → `html[lang=en]`, nupp `EN` aktiivne, menüü võtab `en` `menuLabel` (fixture); `en` tühi `statement` → näha eestikeelne; klõps `FI` → `location.search==='?lang=fi'`, `html[lang=fi]`; `settings.languages:['et','en']` → `FI` nuppu pole ja `?lang=fi` → `et` (Review Focus 3); kõik `SiteStrings.et` võtmed olemas `en`-is ja `fi`-s (ühiktest `tests/core.test.js`-i).
- [ ] **Step 2:** FAIL → **Step 3:** implementeeri → **Step 4:** `check` PASS, `compare` PASS (vaikimisi `et`; keelevalik lisab päisesse nupud → baseline uuendatakse **ainult päise** osas: võrdlus jätab välja `header` ala, vt Step 5)
- [ ] **Step 5:** `compare` saab valiku `--skip-header`; dokumenteeri muudatus commiti sõnumis
- [ ] **Step 6:** commit — „Keelevalik ET · EN · FI“

---

### Task 7: admin (`admin/config.yml`)

**Files:** Modify `admin/config.yml`; Create `tests/config.test.js`

**Interfaces:**
- Produces: `i18n: { structure: single_file, locales: [et, en, fi], default_locale: et }` top-level; failikirje `main` `i18n: true`. Kirjed (Sveltia `files` sama faili peal, igaüks oma `name`-ga, ühe `file: content/site.json`): **Üldinfo** (`settings`, + `languages` select multiple, `defaultTheme` select), **Sektsioonid** (`sections` list `types`: game, hero, log, reel, web, caps, files, index, text, textImage, gallery, video, links; ühised väljad Speci tabelist; `summary: "{{menuLabel}} {{title}} ({{type}})"`), **Kujundus** (`design`: `dark`/`light` objektid `color` vidinatega, `fonts.heading|body` `select` = `FONT_CHOICES`, `fonts.baseSize` number 14–20, `effects` grain number 0–100 + 2 boolean, `background` image + 3 number 0–100/0–40, `layout.maxWidth` number 960–1600, `spacing` select tight/normal/airy, `webColumns` select 1/2/3), **Tööd**, **Veebilehed**, **Failid** (olemasolevad).
- Keelest sõltumatud väljad `i18n: duplicate`: kõik `image`, `file`, `url`, `link`, `embedUrl`, `year`, `todo`, `enabled`, `inMenu`, `id`, `type`, kogu `design`, `languages`, `defaultTheme`, `contactEmail`, `contactPhone`, `portalUrl`, `imageSide`, tehnilised spec-väljad (`format`, `camera`, `lens`, `fps`, `tools`, `stack`).
- Kui Sveltia ei luba sama faili mitme kirje vahel jagada i18n-iga, jääb üks kirje mitme rühmaga (`object` väljad) — kontrolli Sveltia docs'ist enne Step 3.

- [ ] **Step 1:** `tests/config.test.js`: YAML parsib; iga `sections` tüübi väljanimed ⊆ renderdaja poolt loetavad võtmed (loetelu testis); iga `site.json` `et` top-level võti on configis kirjeldatud; iga `i18n: duplicate` loendis olev väljanimi on configis `duplicate`.
- [ ] **Step 2:** FAIL → **Step 3:** kirjuta config → **Step 4:** PASS
- [ ] **Step 5:** käsitsi: `/admin` laeb lokaalselt (`python3 -m http.server`, Playwright avab `/admin/`, konsoolis config-vigu pole)
- [ ] **Step 6:** commit — „Admin: sektsioonid, kujundus ja keeled“

---

### Task 8: inglise ja soome tõlked

**Files:** Modify `content/site.json`

- `en` ja `fi` täidetakse kõigi `et` tõlgitavate väljadega (mitte `duplicate` väljad): settings (roles, location, statement), sektsioonide `title/countLabel/menuLabel/notice/heading/note`, `caps`, `index.links[].label`, `works[].{roles,role,type,note}` (pealkirju ei tõlgita, `titleEn` jääb), `websites` `note` + `items[].{client,type,description}`, `files.note`.
- Nimekirjad on samas järjekorras kui `et`-s (ühendamine käib indeksi järgi).

- [ ] **Step 1:** tõlgi; **Step 2:** kontroll: `python3` — `en`/`fi` nimekirjade pikkused == `et` omad; `check` + `compare` PASS; ekraanipildid `?lang=en`, `?lang=fi` vaadatakse üle (pole ingliskeelseid/eestikeelseid segatekste valel kohal)
- [ ] **Step 3:** commit — „Inglise ja soome tõlked (üle vaadata)“

---

### Task 9: lõppkontroll ja avaldamine

- [ ] `node --test tests/` PASS; `node tests/e2e.mjs check` PASS; `compare --skip-header` PASS
- [ ] ekraanipildid kasutajale: tume/hele/telefon, EN, admin
- [ ] push haru `kujundus-admin`; `main`-i liitmine **ainult kasutaja loal**
