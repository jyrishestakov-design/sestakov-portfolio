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
