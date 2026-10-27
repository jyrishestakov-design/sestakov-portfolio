# Kujundus ja sektsioonid administ — disain

Kuupäev: 2026-10-27 · Haru: `kujundus-admin`

## Eesmärk

Omanik saab `/admin` kaudu, koodi puutumata:

- muuta ülemise menüü sisu ja järjekorda;
- sektsioone sisse/välja lülitada, ümber järjestada, lisada ja kustutada;
- muuta värve, fonte, tausta ja efekte ning paigutust.

Eeskuju: Kuressaare Kunstikooli, Ösel MC ja Muhu Veinitalu adminid.

## Piirangud

- Leht jääb staatiliseks GitHub Pagesi lehele (shesta.eu). Serverit ega andmebaasi ei lisata.
- Admin jääb Sveltia CMS-iks (`admin/config.yml`), sisu jääb faili `content/site.json`.
- **Muutmata seadetega peab leht välja nägema täpselt nagu praegu.**

## Andmemudel (`content/site.json`)

### `sections` — uus, järjestatud nimekiri

Lehe sektsioonid joonistatakse selle nimekirja järjekorras. Igal sektsioonil on ühised väljad:

| Väli | Tähendus |
|---|---|
| `type` | sektsiooni tüüp (vt allpool) |
| `id` | ankur URL-is ja menüülingis, nt `log` → `#log` |
| `enabled` | `false` peidab sektsiooni (andmed jäävad alles) |
| `title` | pealkiri (h2) |
| `countLabel` | väike tekst pealkirja paremal (nt „Valitud tööd 1999–2025“) |
| `menuLabel` | tekst ülemises menüüs |
| `inMenu` | kas sektsioon on menüüs |
| `notice` | kollane mustandimärkus sektsiooni all (asendab `settings.draftNotices`) |

**Olemasolevad tüübid** (käitumine nagu praegu):

| `type` | Sisu |
|---|---|
| `game` | Viking Rider minimäng |
| `hero` | nimi, rollid, avalause (`settings`-ist) |
| `log` | Shot Log, andmed top-level `works` |
| `reel` | video: `embedUrl`, `image`, `note` (kolib `settings.reel`-ist sektsiooni) |
| `web` | Veebilehed, andmed top-level `websites` |
| `caps` | Oskused: `items[]` = `{ kicker, title, points[] }` (praegu HTML-is kõvakodeeritud) |
| `files` | Failid, andmed top-level `files` |
| `index` | Lingid: `links[]` = `{ label, url, display }` (praegu HTML-is kõvakodeeritud) |

`works`, `websites` ja `files` jäävad top-level kirjeteks, sest need on pikad nimekirjad ja adminis eraldi lihtsam muuta.

**Uued tüübid, mida omanik saab lisada:**

| `type` | Väljad |
|---|---|
| `text` | `body` |
| `textImage` | `body`, `image`, `imageSide` (vasak/parem) |
| `gallery` | `images[]` = `{ image, caption }`, avaneb suurelt klõpsuga |
| `video` | `embedUrl` (YouTube/Vimeo embed), `caption` |
| `links` | `links[]` nagu `index` tüübil |

`body` on lihttekst: tühi rida eraldab lõike ja aadressid muutuvad linkideks. Markdowni ega HTML-i ei tõlgendata, nii jääb leht turvaline ja lihtne.

### `design` — uus

Tühi väli tähendab vaikeväärtust, ehk praegust välimust. CSS-muutuja kirjutatakse üle ainult siis, kui väli on täidetud.

| Grupp | Väljad |
|---|---|
| `dark`, `light` | `bg`, `surface`, `line`, `ink`, `inkDim`, `accent` (värvivalija) |
| `fonts` | `heading`, `body` (valik ~12 Google Fondist + praegused), `baseSize` px |
| `theme` | `default`: auto / tume / hele |
| `effects` | `grain` 0–100 (0 = väljas), `showRec`, `showTimecode` |
| `background` | `image`, `opacity`, `blur`, `shade` (nagu Ösel MC-l) |
| `layout` | `maxWidth` px, `spacing` (tihe / tavaline / õhuline), `webColumns` 1–3 |

## Leht (`index.html`)

- `<main>` sisu tekib `sections` põhjal: iga tüübi jaoks on renderdusfunktsioon (praegused `renderLog`, `renderReel`, … + uued tüübid).
- Ülemine menüü tekib nendest sektsioonidest, millel on `enabled` ja `inMenu`, samas järjekorras.
- `design` rakendatakse CSS-muutujatena `:root`-ile. Valitud fondid laetakse Google Fontsist dünaamiliselt.
- Kui `sections` puudub (vana sisu), kasutatakse vaikimisi nimekirja, mis vastab praegusele lehele.
- Minimängu kood jääb samaks, see käivitub ainult siis, kui `game` sektsioon on sees.

## Admin (`admin/config.yml`)

- **Sisu → Sektsioonid**: lohistatav nimekiri, igal kirjel tüübi valik (Sveltia `list` + `types`).
- **Sisu → Kujundus**: grupid nagu tabelis (`color`, `select`, `number`, `boolean`, `image` vidinad).
- Olemasolevad kirjed (Üldinfo, Tööd, Veebilehed, Failid) jäävad alles. `reel` ja `draftNotices` kolivad sektsioonidesse.

## Üleminek

Ühekordne skript kannab praeguse sisu uude vormi: sektsioonid praeguses järjekorras, Oskuste ja Indexi tekstid HTML-ist JSON-i, `reel` ja märkused sektsioonidesse, `design` tühjaks.

## Testimine (Playwright)

1. **Sama välimus:** ekraanipildid enne ja pärast muudatust (tume, hele, telefon), võrdlus pikslite kaupa. Teralisus, ajakood ja minimäng on võrdluse ajaks peidetud, sest need liiguvad.
2. **Funktsioonid:** testandmetega kontrollin peitmist, järjekorda, menüüd, iga uut tüüpi, värvide, fontide, efektide ja paigutuse muutmist.
3. Konsoolis ei tohi olla vigu. Telefonis (390 px) ei tohi tekkida horisontaalset kerimist.
4. `config.yml` peab olema kehtiv YAML ja vastama `site.json` struktuurile.

## Väljaspool

Mitmekeelsus, mitu lehte (alamlehed), admini enda kujunduse muutmine, kasutajakontod.
