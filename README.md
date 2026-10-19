# sestakov-portfolio

Jüri-Illimar Reinberg-Šestakov — portfoolio (operaator · 3D/2D animaator · videograaf).

Üks staatiline fail: [`index.html`](index.html). Ei vaja build'i.

## Vaatamine

- Live (GitHub Pages): https://jyrishestakov-design.github.io/sestakov-portfolio/
- Lokaalselt: ava `index.html` brauseris

## Kolimine mujale

Terve sait on `index.html`. Uude hostingusse (Cloudflare Pages, Netlify, veebimajutus,
oma domeen) viimiseks kopeeri fail või osuta host samale repo'le — root, build-käsk puudub.

## Failid ja klienditsoon

- **Avalikud failid**: `/admin` → *Failid* → lae fail üles; ilmub lehe „Failid" sektsiooni. Repo on avalik, seega ainult väikesed ja mitte-salajased failid.
- **Privaatsed / suured failid**: Cloudflare Worker + R2, vt [`files-worker/README.md`](files-worker/README.md).

## Staatus

Mustand. Andmed IMDb + EFIS avalikest kirjetest; pealkirjad, krediidid ja tehnilised
lehed vajavad ülekontrollimist. Showreel, hiljutine operaatoritöö ja animatsiooninäited
on veel lisamata (märgitud lehel kollasega).
