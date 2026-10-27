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
