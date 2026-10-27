// Ühiktestid: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core.js');

test('mergeLocale: tühi väli võetakse baasist, täidetud võidab', () => {
  assert.deepEqual(C.mergeLocale({ a: 'x', b: { c: 'y' } }, { a: '', b: { c: 'z' } }), { a: 'x', b: { c: 'z' } });
});

test('mergeLocale: nimekirjad ühendatakse indeksi järgi', () => {
  assert.deepEqual(
    C.mergeLocale({ l: [{ t: 'a', u: '1' }, { t: 'b', u: '2' }] }, { l: [{ t: 'A' }] }),
    { l: [{ t: 'A', u: '1' }, { t: 'b', u: '2' }] }
  );
});

test('pickLang: URL, salvestatud, lubatud keeled', () => {
  assert.equal(C.pickLang('?lang=en', 'fi', ['et', 'en', 'fi']), 'en');
  assert.equal(C.pickLang('?lang=xx', null, ['et', 'en']), 'et');
  assert.equal(C.pickLang('', 'fi', ['et', 'en']), 'et');
  assert.equal(C.pickLang('?lang=fi', null, ['et', 'en']), 'et');
  assert.equal(C.pickLang('', 'en', ['et', 'en']), 'en');
});

test('localeData: vana kuju (ilma et-võtmeta) käib eesti keelena', () => {
  assert.equal(C.localeData({ settings: { name: 'N' } }, 'en').settings.name, 'N');
});

test('localeData: tõlkimata väli → eesti keel', () => {
  assert.equal(C.localeData({ et: { s: 't' }, en: { s: '' } }, 'en').s, 't');
  assert.equal(C.localeData({ et: { s: 't' }, en: { s: 'T' } }, 'en').s, 'T');
});

test('designToCss: tühi kujundus ei muuda midagi', () => {
  assert.equal(C.designToCss({}), '');
  assert.equal(C.designToCss(undefined), '');
  assert.equal(C.designToCss({ dark: { accent: '' }, layout: { webColumns: 2 } }), '');
});

test('designToCss: värv kirjutatakse ainult täidetud väljale', () => {
  const css = C.designToCss({ dark: { accent: '#ff0000' } });
  assert.match(css, /--accent:#ff0000/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.doesNotMatch(css, /--bg:/);
});

test('designToCss: veerud, laius, font', () => {
  assert.match(C.designToCss({ layout: { webColumns: 3 } }), /repeat\(3,/);
  assert.match(C.designToCss({ layout: { maxWidth: 1400 } }), /--maxw:1400px/);
  assert.match(C.designToCss({ fonts: { heading: 'Syne' } }), /--font-display:"Syne"/);
});

test('fontsUrl: ainult laadimata fondid', () => {
  assert.equal(C.fontsUrl({}), null);
  assert.equal(C.fontsUrl({ fonts: { heading: 'Bricolage Grotesque' } }), null);
  assert.match(C.fontsUrl({ fonts: { heading: 'Syne' } }), /family=Syne/);
});

test('buildNav: välja lülitatud ja korduvad id-d jäävad välja', () => {
  assert.deepEqual(
    C.buildNav([
      { id: 'a', menuLabel: 'A', inMenu: true },
      { id: 'b', menuLabel: 'B', inMenu: true, enabled: false },
      { id: 'a', menuLabel: 'A2', inMenu: true },
      { id: 'c', menuLabel: 'C', inMenu: false }
    ]),
    [{ id: 'a', label: 'A' }]
  );
});

test('textBlocks: lõigud ja lingid', () => {
  assert.deepEqual(C.textBlocks('Tere\n\nvt https://x.ee.'), [
    [{ t: 'text', v: 'Tere' }],
    [{ t: 'text', v: 'vt ' }, { t: 'link', v: 'https://x.ee' }, { t: 'text', v: '.' }]
  ]);
  assert.deepEqual(C.textBlocks(''), []);
});
