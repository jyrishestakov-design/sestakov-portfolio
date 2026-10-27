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
