#!/bin/bash
# shesta-failid — klienditsooni paigaldus Cloudflare'i (Mac)
# Käivita: topeltklõps, või Terminalis:  bash ~/Downloads/setup.command
# Võib uuesti käivitada — uuendab workeri ja laseb soovi korral parooli muuta.

set -u
WORKER="shesta-failid"
BUCKET="shesta-failid"
REPO_RAW="https://raw.githubusercontent.com/jyrishestakov-design/sestakov-portfolio/main/files-worker"
DIR="$HOME/shesta-failid"

b=$'\e[1m'; y=$'\e[33m'; g=$'\e[32m'; r=$'\e[31m'; n=$'\e[0m'
step() { echo; echo "${b}${y}▸ $*${n}"; }
ok()   { echo "${g}✓ $*${n}"; }
die()  { echo; echo "${r}✗ $*${n}"; echo; read -rp "Vajuta Enter, et sulgeda… "; exit 1; }

clear
echo "${b}ŠESTAKOV.WORK — klienditsooni paigaldus${n}"
echo "Seadistab Cloudflare'i: R2 failihoidla + worker '$WORKER'."

# ---------- 1. Node.js ----------
step "1/6  Node.js"
if ! command -v npx >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Node.js puudub — paigaldan Homebrew'ga…"
    brew install node || die "Node.js paigaldus ebaõnnestus."
  else
    open "https://nodejs.org/en/download"
    die "Node.js puudub. Paigalda see avanenud lehelt (LTS, macOS installer) ja käivita see fail uuesti."
  fi
fi
ok "Node $(node -v)"

# ---------- 2. Workeri failid ----------
step "2/6  Laen workeri failid → $DIR"
mkdir -p "$DIR/src" && cd "$DIR" || die "Ei saa luua kausta $DIR"
curl -fsSL "$REPO_RAW/wrangler.toml" -o wrangler.toml || die "wrangler.toml allalaadimine ebaõnnestus (internet?)."
curl -fsSL "$REPO_RAW/src/index.js"  -o src/index.js  || die "index.js allalaadimine ebaõnnestus."
ok "Failid olemas"

W() { npx --yes wrangler@4 "$@"; }

# ---------- 3. Cloudflare'i sisselogimine ----------
step "3/6  Cloudflare'i konto"
if W whoami 2>/dev/null | grep -qi "associated with the email"; then
  ok "Juba sisse logitud"
else
  echo "Avaneb brauser — logi sisse SAMA kontoga, kus on 'sestakov-cms-auth' worker, ja vajuta Allow."
  W login || die "Sisselogimine ebaõnnestus."
fi

# ---------- 4. R2 hoidla ----------
step "4/6  R2 hoidla '$BUCKET'"
while true; do
  out=$(W r2 bucket create "$BUCKET" 2>&1)
  if echo "$out" | grep -qiE "created|already exists|already own"; then ok "Hoidla olemas"; break; fi
  echo "$out" | tail -5
  echo
  echo "${y}R2 pole ilmselt kontol sisse lülitatud.${n} Avan Cloudflare'i — vali vasakult ${b}R2 Object Storage${n} → aktiveeri tasuta plaan"
  echo "(küsib kaardiandmeid, aga 10 GB-ni on tasuta)."
  open "https://dash.cloudflare.com/?to=/:account/r2/overview"
  read -rp "Kui valmis, vajuta Enter (või Ctrl+C katkestamiseks)… "
done

# ---------- 5. Deploy ----------
step "5/6  Avaldan workeri"
out=$(W deploy 2>&1) || { echo "$out" | tail -20; die "Deploy ebaõnnestus."; }
URL=$(echo "$out" | grep -Eo 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1)
[ -n "$URL" ] || { echo "$out" | tail -20; die "Ei leidnud workeri aadressi deploy väljundist."; }
ok "Avaldatud: $URL"

# ---------- 6. Saladused ----------
step "6/6  Halduse parool"
have=$(W secret list 2>/dev/null)
if echo "$have" | grep -q ADMIN_PASSWORD; then
  read -rp "Halduse parool on juba olemas. Kas muuta? (j/E) " a
  [[ "$a" =~ ^[jJyY] ]] && setpw=1 || setpw=0
else
  setpw=1
fi
if [ "$setpw" = 1 ]; then
  while true; do
    read -rsp "Uus halduse parool (min 8 märki, ei kuvata): " p1; echo
    read -rsp "Korda parooli: " p2; echo
    [ "$p1" = "$p2" ] && [ ${#p1} -ge 8 ] && break
    echo "${r}Ei klapi või liiga lühike — proovi uuesti.${n}"
  done
  printf '%s' "$p1" | W secret put ADMIN_PASSWORD >/dev/null || die "Parooli salvestamine ebaõnnestus."
  unset p1 p2
  ok "Parool salvestatud"
fi
if ! echo "$have" | grep -q SESSION_SECRET; then
  openssl rand -hex 32 | tr -d '\n' | W secret put SESSION_SECRET >/dev/null || die "SESSION_SECRET salvestamine ebaõnnestus."
  ok "Sessioonivõti genereeritud"
fi

# ---------- valmis ----------
printf '%s' "$URL" | pbcopy
echo
echo "${b}${g}━━━ VALMIS ━━━${n}"
echo
echo "  Klienditsoon:  ${b}$URL${n}   (kopeeritud lõikelauale)"
echo "  Sinu haldus:   ${b}$URL/admin${n}"
echo
echo "  Viimane samm: kodulehe haldus avaneb — ${b}Failid → Klienditsooni URL${n},"
echo "  kleebi (⌘V) ja vajuta Publish. Siis ilmub kliendikoodi kast kodulehele."
echo
sleep 2
open "$URL/admin"
open "https://shesta.eu/admin/"
read -rp "Vajuta Enter, et sulgeda… "
