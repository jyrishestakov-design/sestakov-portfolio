# Klienditsoon (shesta-failid)

Privaatne failijagamine klientidele: **Cloudflare Worker + R2**.
Sina laed failid üles aadressil `/admin`, iga klient saab oma koodi (`/c/<kood>`) ja parooli.
Suured failid (mitu GB) on OK — üleslaadimine käib 50 MB tükkidena, allalaadimist saab jätkata.

R2 tasuta kvoot: 10 GB salvestust/kuus, väljaminev liiklus (allalaadimised) tasuta.

## Paigaldus (ühekordne, ~10 min)

Vajab Node.js-i ja sama Cloudflare'i kontot, kus on `sestakov-cms-auth` worker.

```bash
cd files-worker
npx wrangler login
npx wrangler r2 bucket create shesta-failid      # R2 tuleb enne dashboardis sisse lülitada
npx wrangler secret put ADMIN_PASSWORD           # sinu halduse parool
npx wrangler secret put SESSION_SECRET           # pikk juhuslik string, nt: openssl rand -hex 32
npx wrangler deploy
```

Deploy annab aadressi, nt `https://shesta-failid.<konto>.workers.dev`.

1. Ava `<aadress>/admin`, logi sisse, lisa klient (kood + nimi + parool), lae failid.
2. Kodulehe `/admin` → **Failid → Klienditsooni URL** → kleebi workeri aadress. Siis ilmub kodulehe
   „Failid" sektsiooni kliendikoodi kast.
3. Saada kliendile link (`Kopeeri link`) ja parool eraldi.

### Oma alamdomeen (valikuline)

Kui shesta.eu DNS on Cloudflare'is: võta `wrangler.toml`-is `routes` rida kommentaarist välja
(`failid.shesta.eu`), `npx wrangler deploy`, ja pane kodulehel Klienditsooni URL-iks `https://failid.shesta.eu`.

## Kuidas töötab

- Paroolid salvestatakse PBKDF2-räsina, mitte lahtiselt. Parooli muutmine logib kliendi välja.
- Kliendi sisselogimine kehtib 14 päeva, halduse oma 12 tundi (allkirjastatud HttpOnly küpsised).
- Sisse logituna halduses näed iga kliendi lehte („Eelvaade") ilma tema paroolita.
- Lehed on `noindex` — otsingumootorid neid ei näe.

## Lokaalne test

```bash
printf 'ADMIN_PASSWORD=test\nSESSION_SECRET=dev-secret-dev-secret\n' > .dev.vars
npx wrangler dev --local
```
