// Lehe enda tekstid (mitte sisu). {n} asendatakse arvuga.
// Brauseris: window.SiteStrings. Node'is: require('./js/i18n-strings.js').
(function (root) {
  var api = {
    et: {
      fill: '— täida —',
      scrollcue: '↓ Keri — {n} logitud tööd',
      f_role: 'Roll', f_type: 'Tüüp', f_year: 'Aasta', f_duration: 'Kestus', f_tools: 'Tööriistad',
      f_producer: 'Tootja / klient', f_director: 'Režii', f_cinematographer: 'Operaator',
      f_source: 'Allikas', f_format: 'Formaat', f_camera: 'Kaamera', f_lens: 'Objektiiv',
      f_fps: 'FPS', f_link: 'Link',
      addVideo: 'Lisa video link →',
      webCount: '{n} lehte · disain + arendus',
      openSite: 'Ava leht ↗',
      linkSoon: 'Link tulekul',
      noAddress: 'aadress lisamata',
      noFiles: 'Avalikke faile praegu pole.',
      portalKicker: '● Klienditsoon',
      portalTitle: 'Sinu failid',
      portalText: 'Sisesta kliendikood, mille said minult. Järgmisel lehel küsitakse parooli.',
      portalPlaceholder: 'kliendikood',
      portalButton: 'Ava →',
      themeLabel: 'Vaheta teema',
      gameLabel: 'Minimäng: Viking Rider',
      contact: 'Kontakt',
      langLabel: 'Keel',
      close: 'Sulge'
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SiteStrings = api;
})(this);
