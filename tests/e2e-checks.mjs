// Funktsionaalsed brauseritestid; käivitab: node tests/e2e.mjs check
export default async function ({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0];
  const navTexts = (p) => p.$$eval('#nav a', (as) => as.filter((a) => !a.hidden).map((a) => a.textContent));

  // ---- Task 4: olemasolevad sektsioonid
  await t('menüü tekib sektsioonidest', async () => {
    const p = await openPage(browser, dark);
    eq(await navTexts(p), ['Shot Log', 'Reel', 'Veeb', 'Oskused', 'Failid', 'Index'], 'menüü');
    eq(await p.$$eval('#log .entry', (e) => e.length), 22, 'Shot Log kirjed');
    eq(await p.$$eval('#web .site', (e) => e.length), 9, 'veebilehed');
    eq(await p.$$eval('#caps .cap', (e) => e.length), 3, 'oskused');
    eq(await p.$$eval('#index .idx-list a', (e) => e.length), 4, 'index lingid');
    ok(await p.$('#viking-runner canvas'), 'minimäng käivitus');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('vana kujuga site.json joonistub (Review Focus 1)', async () => {
    const p = await openPage(browser, dark, { fixture: 'old-shape.json' });
    eq(await p.$$eval('main > section', (e) => e.length), 8, 'sektsioone');
    eq(await p.$$eval('#log .entry', (e) => e.length), 22, 'Shot Log kirjed');
    eq(await p.$eval('#reel h3', (e) => e.textContent), "Tööd YouTube'is", 'reel pealkiri');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('sama id-ga sektsioonid: mõlemad lehel, menüüs üks (Review Focus 2)', async () => {
    const p = await openPage(browser, dark, { fixture: 'dup-ids.json' });
    eq(await p.$$eval('main > section[id="index"]', (e) => e.length), 2, 'index sektsioone');
    eq(await p.$$eval('#nav a[href="#index"]', (e) => e.length), 1, 'menüülinke');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });
}

// ---- Task 5: uued tüübid, kujundus, taust, efektid
export async function task5({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0], phone = VIEWS[2];

  await t('uued sektsioonitüübid joonistuvad', async () => {
    const p = await openPage(browser, dark, { fixture: 'all-types.json' });
    eq(await p.$$eval('#t1 .text-body p', (e) => e.length), 2, 'tekst: lõike');
    ok(await p.$('#t1 a[href="https://x.ee"]'), 'tekst: link');
    ok(await p.$('#ti1 .ti img'), 'tekst+pilt: pilt');
    eq(await p.$$eval('#g1 .gal img', (e) => e.length), 3, 'galerii: pilte');
    await p.click('#g1 .gal button');
    ok(await p.$('dialog.lightbox[open]'), 'galerii: suur pilt avaneb');
    await p.keyboard.press('Escape');
    ok(!(await p.$('dialog.lightbox[open]')), 'galerii: Esc sulgeb');
    ok(await p.$('#v1 iframe[src="https://www.youtube.com/embed/abc"]'), 'video');
    eq(await p.$$eval('#l1 .idx-list a', (e) => e.length), 2, 'lingid');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('kujundus: värv, font, efektid, taust, veerud', async () => {
    const p = await openPage(browser, dark, { fixture: 'all-types.json' });
    await p.waitForSelector('#design-css', { state: 'attached' });
    eq(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()), '#ff0000', 'rõhuvärv');
    ok(await p.$('link[href*="family=Syne"]'), 'Syne font laaditud');
    ok(await p.$eval('#grain', (e) => getComputedStyle(e).display === 'none'), 'teralisus väljas');
    ok(await p.$eval('#tc', (e) => getComputedStyle(e).display === 'none'), 'ajakood peidus');
    ok(await p.$eval('.rec', (e) => getComputedStyle(e).display !== 'none'), 'REC nähtav');
    ok(await p.$('#bgimg'), 'taustapilt');
    eq(await p.$eval('#bgimg', (e) => getComputedStyle(e).opacity), '0.5', 'tausta nähtavus');
    eq(await p.$eval('.web-grid', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length), 3, 'veerge');
    await p.close();
  });

  await t('pikk URL telefonis ei tee horisontaalset kerimist (Review Focus 4)', async () => {
    const p = await openPage(browser, phone, { fixture: 'long-url.json' });
    await p.waitForSelector('#t2 a');
    eq(await p.evaluate(() => document.documentElement.scrollWidth), 390, 'scrollWidth');
    await p.close();
  });

  await t('kõik sektsioonid väljas: päis ja jalus jäävad (Review Focus 5)', async () => {
    const p = await openPage(browser, dark, { fixture: 'all-off.json' });
    await p.waitForTimeout(500);
    eq(await p.$$eval('main > section', (e) => e.length), 0, 'sektsioone');
    ok(await p.$eval('header', (e) => e.offsetHeight > 0), 'päis');
    ok(await p.$eval('footer', (e) => e.offsetHeight > 0), 'jalus');
    eq(await p.$$eval('#nav a', (e) => e.length), 0, 'menüü tühi');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });
}

// ---- Task 6: keeled
export async function task6({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0];
  const { readFileSync } = await import('node:fs');
  const etStatement = JSON.parse(readFileSync(new URL('./fixtures/lang.json', import.meta.url))).et.settings.statement;

  await t('?lang=en: keel, menüü, tõlkimata tekst eesti keeles', async () => {
    const p = await openPage(browser, dark, { fixture: 'lang.json', query: '?lang=en' });
    await p.waitForSelector('.langs button');
    eq(await p.getAttribute('html', 'lang'), 'en', 'html lang');
    eq(await p.$eval('.langs button[aria-pressed="true"]', (b) => b.textContent), 'EN', 'aktiivne nupp');
    eq(await p.$eval('#nav a', (a) => a.textContent), 'Log', 'menüü EN');
    eq(await p.$eval('#log h2', (h) => h.textContent), 'Shot Log EN', 'pealkiri EN');
    eq(await p.$eval('.hero-foot p', (e) => e.textContent), etStatement, 'tõlkimata → eesti');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('keelenupp vahetab keele ja URL-i', async () => {
    const p = await openPage(browser, dark, { fixture: 'lang.json' });
    await p.waitForSelector('.langs button');
    eq(await p.getAttribute('html', 'lang'), 'et', 'algus et');
    await p.click('.langs button:has-text("FI")');
    eq(await p.evaluate(() => location.search), '?lang=fi', 'URL');
    eq(await p.getAttribute('html', 'lang'), 'fi', 'html lang');
    eq(await p.$eval('.hero-foot p', (e) => e.textContent), 'Suomeksi.', 'soome tekst');
    await p.click('.langs button:has-text("ET")');
    eq(await p.evaluate(() => location.search), '', 'et → parameeter kaob');
    await p.close();
  });

  await t('peidetud keel: nuppu pole, ?lang=fi → et (Review Focus 3)', async () => {
    const p = await openPage(browser, dark, { fixture: 'lang-nofi.json', query: '?lang=fi' });
    await p.waitForSelector('.langs button');
    eq(await p.$$eval('.langs button', (b) => b.map((x) => x.textContent)), ['ET', 'EN'], 'nupud');
    eq(await p.getAttribute('html', 'lang'), 'et', 'html lang');
    await p.close();
  });
}

// ---- Lõppülevaatuse leiud
export async function review({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0];

  await t('site.json ei laadi (404): vaikimisi sektsioonid ja mäng jäävad', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p.route('**/content/site.json*', (r) => r.fulfill({ status: 404, body: 'not found' }));
    await p.goto('http://localhost:8765/');
    await p.waitForTimeout(800);
    ok(await p.$('#viking-runner canvas'), 'mäng käivitus');
    ok(await p.$('main > section.hero'), 'avaplokk');
    await p.close();
  });

  await t('vigane failinimi ei peata ülejäänud lehte', async () => {
    const p = await openPage(browser, dark, { fixture: 'bad-file.json' });
    await p.waitForTimeout(500);
    ok(await p.$('#index .idx-list a'), 'Index joonistus pärast Faile');
    ok((await p.$eval('#footEmailLink', (a) => a.textContent)).includes('@'), 'jaluse e-post');
    eq(await p.$$eval('#nav a', (e) => e.length), 6, 'menüü');
    await p.close();
  });
}

// ---- UFO-mäng (ainult UFO sees)
const UFO_INIT = () => { window.__UFO_TEST__ = true; };
export async function ufo({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0];
  const dbg = (p, expr) => p.evaluate(expr);

  await t('UFO: käivitub, tühik alustab, kiir teleporteerib', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForSelector('.ufo-runner canvas');
    ok(!(await p.$('#viking-runner')), 'Viking Rider pole lehel');
    await p.waitForFunction(() => window.__ufoDebug);
    eq(await dbg(p, () => __ufoDebug.mode()), 'demo', 'algus demo');
    await p.keyboard.press('Space');
    eq(await dbg(p, () => __ufoDebug.mode()), 'play', 'tühik → play');
    await dbg(p, () => __ufoDebug.spawnBelow('cow'));
    await p.keyboard.press('KeyX');
    await p.waitForTimeout(700);
    eq(await dbg(p, () => __ufoDebug.state().cows), 1, 'lehm emalaevas');
    eq(await dbg(p, () => __ufoDebug.state().total), 1, 'kokku');
    // jahtumise ajal ei tabata
    await dbg(p, () => __ufoDebug.spawnBelow('man'));
    await p.keyboard.press('KeyX');
    await p.waitForTimeout(150);
    eq(await dbg(p, () => __ufoDebug.state().men), 0, 'jahtumise ajal mees jääb maha');
    await p.waitForTimeout(1000);
    await dbg(p, () => __ufoDebug.spawnBelow('man'));
    await p.keyboard.press('KeyX');
    await p.waitForTimeout(700);
    eq(await dbg(p, () => __ufoDebug.state().men), 1, 'mees emalaevas');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('UFO telefonis: ei teki horisontaalset kerimist', async () => {
    const p = await openPage(browser, VIEWS[2], { fixture: 'ufo-only.json' });
    await p.waitForSelector('.ufo-runner canvas');
    eq(await p.evaluate(() => document.documentElement.scrollWidth), 390, 'scrollWidth');
    await p.close();
  });
}

// ---- Mänguriba: mõlemad mängud
export async function games({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0], phone = VIEWS[2];
  const view = (p) => p.$eval('#ride', (s) => s.dataset.view);
  const shown = (p, g) => p.$eval(`.gm-half[data-game="${g}"]`, (e) => getComputedStyle(e).display !== 'none');

  await t('mänguriba: kaks demot, tühik ei käivita, klõps laiendab, tagasi', async () => {
    const p = await openPage(browser, dark, { fixture: 'games-both.json', init: UFO_INIT });
    await p.waitForSelector('.ufo-runner canvas');
    await p.waitForSelector('#viking-runner canvas');
    eq(await view(p), 'pick', 'valikuvaade');
    await p.keyboard.press('Space');
    eq(await p.evaluate(() => __ufoDebug.mode()), 'demo', 'tühik valikuvaates ei käivita UFO-t');
    eq(await view(p), 'pick', 'jääb valikuvaatesse');
    await p.click('.gm-half[data-game="ufo"] .gm-pick');
    eq(await view(p), 'ufo', 'UFO laiendatud');
    ok(!(await shown(p, 'viking')), 'Viking peidus');
    await p.waitForTimeout(200);
    const w = await p.evaluate(() => [document.querySelector('.ufo-runner canvas').clientWidth, document.getElementById('ride').clientWidth]);
    ok(w[0] >= 0.95 * w[1], 'UFO canvas täislaiuses (' + w + ') (Review Focus 2)');
    await p.click('.gm-back');
    eq(await view(p), 'pick', 'tagasi valikuvaatesse');
    ok((await shown(p, 'viking')) && (await shown(p, 'ufo')), 'mõlemad nähtavad');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('mänguriba: ← → + Enter valib; keelevahetus ei katkesta mängu', async () => {
    const p = await openPage(browser, dark, { fixture: 'games-both.json', init: UFO_INIT });
    await p.waitForSelector('.ufo-runner canvas');
    await p.keyboard.press('ArrowRight');
    await p.keyboard.press('Enter');
    eq(await view(p), 'ufo', 'klaviatuuriga UFO');
    await p.keyboard.press('Space');
    eq(await p.evaluate(() => __ufoDebug.mode()), 'play', 'UFO mängib');
    await p.click('.langs button:has-text("EN")');
    eq(await p.evaluate(() => __ufoDebug.mode()), 'play', 'keelevahetus ei katkesta (Review Focus 1)');
    eq(await p.$eval('.gm-back', (b) => b.textContent), '← Games', 'nupp inglise keeles');
    eq(await p.$$eval('.ufo-runner canvas', (c) => c.length), 1, 'üks canvas (ei dubleeru)');
    await p.close();
  });

  await t('mänguriba telefonis: ei teki horisontaalset kerimist', async () => {
    const p = await openPage(browser, phone, { fixture: 'games-both.json' });
    await p.waitForSelector('.ufo-runner canvas');
    eq(await p.evaluate(() => document.documentElement.scrollWidth), 390, 'valikuvaade');
    await p.click('.gm-half[data-game="viking"] .gm-pick');
    eq(await p.evaluate(() => document.documentElement.scrollWidth), 390, 'laiendatud');
    await p.close();
  });

  // ---- Lõppülevaatuse leiud
  await t('UFO: pärast tühikut vajub ufo ise (demo klahvid ei jää külge)', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.evaluate(() => __ufoDebug.latch());                    // demo-autopiloot hoiab ↑ all
    await p.keyboard.press('Space');
    const y0 = await p.evaluate(() => __ufoDebug.info().ufo.y);
    await p.waitForTimeout(300);
    const dy = (await p.evaluate(() => __ufoDebug.info().ufo.y)) - y0;
    ok(dy > 0 && dy < 15, 'ufo vajub aeglaselt, dy=' + dy.toFixed(1));
    await p.close();
  });

  await t('„← Mängud“ mängu ajal: mäng läheb tagasi demoks; nooled kerivad lehte', async () => {
    const p = await openPage(browser, dark, { fixture: 'games-both.json', init: UFO_INIT });
    await p.waitForSelector('.ufo-runner canvas');
    await p.click('.gm-half[data-game="ufo"] .gm-pick');
    await p.keyboard.press('Space');
    eq(await p.evaluate(() => __ufoDebug.mode()), 'play', 'mängib');
    await p.click('.gm-back');
    eq(await p.evaluate(() => __ufoDebug.mode()), 'demo', 'tagasi demoks');
    const prevented = await p.evaluate(() => {
      const e = new KeyboardEvent('keydown', { code: 'ArrowDown', key: 'ArrowDown', bubbles: true, cancelable: true });
      document.body.dispatchEvent(e);
      return e.defaultPrevented;
    });
    eq(prevented, false, 'ArrowDown valikuvaates ei blokeeri kerimist');
    await p.close();
  });

  await t('Tab + Enter / tühik valikunupul avab just selle mängu', async () => {
    const p = await openPage(browser, dark, { fixture: 'games-both.json', init: UFO_INIT });
    await p.waitForSelector('.ufo-runner canvas');
    await p.focus('.gm-half[data-game="ufo"] .gm-pick');
    await p.keyboard.press('Enter');
    eq(await view(p), 'ufo', 'Enter avab UFO');
    await p.click('.gm-back');
    await p.focus('.gm-half[data-game="ufo"] .gm-pick');
    await p.keyboard.press('Space');
    eq(await view(p), 'ufo', 'tühik avab UFO');
    eq(await p.evaluate(() => __ufoDebug.mode()), 'demo', 'tühik ainult avab, ei alusta');
    await p.close();
  });
}

// ---- UFO tasemed, punktid, rekord
export async function ufoLevels({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0];
  const D = (p, f, a) => p.evaluate(f, a);

  await t('UFO: tase 2 pärast 20. objekti, ufo kasvab', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.keyboard.press('Space');
    const base = await D(p, () => __ufoDebug.info().ufoW);
    await D(p, () => __ufoDebug.setTotal(19));
    await D(p, () => __ufoDebug.spawnBelow('cow'));
    await p.keyboard.press('KeyX');
    await p.waitForTimeout(700);
    const s = await D(p, () => __ufoDebug.state());
    eq(s.level, 2, 'tase');
    ok(s.score > 0, 'punktid');
    const w = await D(p, () => __ufoDebug.info().ufoW);
    ok(Math.abs(w - base * 1.15) < 0.5, 'ufo laius ' + w + ' ≈ ' + base + '×1.15');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('UFO: 5. tasemel suur ufo ei vaju maast läbi (Review Focus 3)', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.keyboard.press('Space');
    await D(p, () => __ufoDebug.setTotal(80));
    await p.waitForTimeout(3000);
    const i = await D(p, () => __ufoDebug.info());
    ok(i.ufo.y + i.ufoH <= 94.01, 'ufo alaserv ' + (i.ufo.y + i.ufoH));
    await p.close();
  });

  await t('UFO: rekord salvestub ja püsib pärast uuesti laadimist', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.keyboard.press('Space');
    await D(p, () => __ufoDebug.spawnBelow('cow'));
    await p.keyboard.press('KeyX');
    await p.waitForTimeout(700);
    await D(p, () => __ufoDebug.kill());
    eq(await D(p, () => __ufoDebug.mode()), 'over', 'mäng läbi');
    eq(await D(p, () => localStorage.getItem('ufoHi')), '10', 'salvestatud');
    await p.reload();
    await p.waitForFunction(() => window.__ufoDebug);
    eq(await D(p, () => __ufoDebug.hi()), 10, 'loetud');
    await p.close();
  });

  await t('UFO: blokeeritud localStorage ei riku mängu (Review Focus 4)', async () => {
    const init = () => {
      window.__UFO_TEST__ = true;
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
    };
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init });
    await p.waitForFunction(() => window.__ufoDebug);
    eq(await D(p, () => __ufoDebug.hi()), 0, 'rekord 0');
    await p.keyboard.press('Space');
    await D(p, () => __ufoDebug.kill());
    eq(await D(p, () => __ufoDebug.mode()), 'over', 'mäng läbi');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });
}

// ---- UFO mürsud, Z-laser, superjõud
export async function ufoMissiles({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0];
  const D = (p, f) => p.evaluate(f);
  const open = async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.keyboard.press('Space');
    return p;
  };

  await t('Z-laser laseb mürsu alla (+5 punkti)', async () => {
    const p = await open();
    await D(p, () => __ufoDebug.spawnMissile(4));
    await p.keyboard.press('KeyZ');
    await p.waitForTimeout(300);
    eq(await D(p, () => __ufoDebug.info().missiles.length), 0, 'mürske');
    eq(await D(p, () => __ufoDebug.state().score), 5, 'punktid');
    eq(await D(p, () => __ufoDebug.state().lives), 3, 'elud');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });

  await t('mürsk ufosse: elu maha; haavamatuse ajal ainult üks (Review Focus 5)', async () => {
    const p = await open();
    await D(p, () => __ufoDebug.spawnMissile(4));
    await p.waitForTimeout(600);
    eq(await D(p, () => __ufoDebug.state().lives), 2, 'elud pärast 1. mürsku');
    await D(p, () => { __ufoDebug.spawnMissile(4); __ufoDebug.spawnMissile(2); });
    await p.waitForTimeout(600);
    eq(await D(p, () => __ufoDebug.state().lives), 2, 'haavamatuse ajal elu ei kao');
    eq(await D(p, () => __ufoDebug.info().missiles.length), 0, 'mürsud kadusid');
    await p.close();
  });

  await t('superjõud: pooliku laenguga ei vallandu, täis laenguga 1 s Z → kõik emalaeva (Review Focus 1)', async () => {
    const p = await open();
    await D(p, () => { __ufoDebug.spawnBelow('cow'); __ufoDebug.setCharge(0.5); });
    await p.keyboard.down('KeyZ'); await p.waitForTimeout(1200); await p.keyboard.up('KeyZ');
    eq(await D(p, () => __ufoDebug.state().total), 0, 'pooliku laenguga ei vallandu');
    await D(p, () => { __ufoDebug.spawnBelow('man'); __ufoDebug.spawnBelow('cow'); __ufoDebug.spawnMissile(30); __ufoDebug.setCharge(1); });
    await p.keyboard.down('KeyZ'); await p.waitForTimeout(1150); await p.keyboard.up('KeyZ');
    const s = await D(p, () => __ufoDebug.state());
    ok(s.total >= 2, 'objektid emalaevas: ' + s.total);
    ok(s.charge < 0.05, 'laeng tühi: ' + s.charge);
    eq(await D(p, () => __ufoDebug.info().missiles.length), 0, 'mürsud hävinud');
    await p.close();
  });

  await t('superjõud GAME OVER ajal ei tee midagi (Review Focus 2)', async () => {
    const p = await open();
    await D(p, () => __ufoDebug.kill());
    await D(p, () => { __ufoDebug.spawnBelow('cow'); __ufoDebug.setCharge(1); });
    await p.keyboard.down('KeyZ'); await p.waitForTimeout(1150); await p.keyboard.up('KeyZ');
    eq(await D(p, () => __ufoDebug.state().total), 0, 'midagi ei teleporteeritud');
    await p.close();
  });
}

// ---- Lõppülevaatuse leiud (tasemed)
export async function ufoLevelsReview({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0], phone = VIEWS[2];
  const D = (p, f) => p.evaluate(f);

  await t('Z valikuvaates ei käivita UFO mängu', async () => {
    const p = await openPage(browser, dark, { fixture: 'games-both.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.keyboard.press('KeyZ');
    await p.waitForTimeout(100);
    eq(await D(p, () => __ufoDebug.mode()), 'demo', 'jääb demoks');
    await p.close();
  });

  await t('puude: teise sõrme tõstmine ei katkesta Z hoidmist', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.keyboard.press('Space');
    const r = await D(p, () => { const b = document.querySelector('.ufo-runner').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    const fire = (type, id, fx, fy) => p.evaluate(([type, id, x, y]) => {
      document.querySelector('.ufo-runner').dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    }, [type, id, r.x + r.w * fx, r.y + r.h * fy]);
    await fire('pointerdown', 1, 0.9, 0.2);          // Z
    await fire('pointerdown', 2, 0.3, 0.2);          // üles
    await fire('pointerup', 2, 0.3, 0.2);
    eq(await D(p, () => __ufoDebug.info().zHeld), true, 'Z hoitakse edasi');
    await fire('pointerup', 1, 0.9, 0.2);
    eq(await D(p, () => __ufoDebug.info().zHeld), false, 'Z vabastatud');
    await p.close();
  });

  await t('telefoni valikuvaates mahub juhiste rida ära (FI)', async () => {
    const p = await openPage(browser, phone, { fixture: 'games-both.json', init: UFO_INIT, query: '?lang=fi' });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.waitForTimeout(1500);
    const i = await D(p, () => __ufoDebug.info());
    ok(i.helpW > 0 && i.helpW <= i.LW - 8, 'abitekst ' + i.helpW + ' ≤ ' + (i.LW - 8));
    await p.close();
  });
}

// ---- Edasi-tagasi sõit ja parallaks
export async function ufoParallax({ browser, openPage, t, eq, ok, VIEWS }) {
  const dark = VIEWS[0];
  const D = (p, f) => p.evaluate(f);

  await t('← → liigutavad ufot (kuni keskkohani), kiirus ei muutu', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    await p.keyboard.press('Space');
    const a = await D(p, () => __ufoDebug.info());
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(3000); await p.keyboard.up('ArrowRight');
    const b = await D(p, () => __ufoDebug.info());
    ok(b.ufo.x > a.ufo.x + 20, 'edasi: ' + a.ufo.x + ' → ' + b.ufo.x);
    ok(b.ufo.x + b.ufoW <= b.LW * 0.5 + 0.5, 'mitte üle keskkoha');
    ok(Math.abs(b.speed - a.speed) < 0.2, 'kiirus ei hüppa: ' + a.speed + ' → ' + b.speed);
    await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(400); await p.keyboard.up('ArrowLeft');
    ok((await D(p, () => __ufoDebug.info().ufo.x)) < b.ufo.x, 'tagasi');
    await p.close();
  });

  await t('taust: pilvekihid, tuled ja udu on olemas ning liiguvad', async () => {
    const p = await openPage(browser, dark, { fixture: 'ufo-only.json', init: UFO_INIT });
    await p.waitForFunction(() => window.__ufoDebug);
    const s1 = await D(p, () => __ufoDebug.scene());
    ok(s1.cloudLayers === 3 && s1.clouds > 0, 'pilved: ' + JSON.stringify(s1));
    ok(s1.lights > 0, 'tuled');
    eq(s1.fogLayers, 2, 'udukihid');
    await p.waitForTimeout(500);
    const s2 = await D(p, () => __ufoDebug.scene());
    ok(s2.fogX !== s1.fogX, 'udu liigub');
    eq(p.errors, [], 'konsooli vead');
    await p.close();
  });
}
