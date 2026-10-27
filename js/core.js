// Puhtad abifunktsioonid: keeled, andmete ühendamine, kujundus → CSS, menüü, tekst.
// Brauseris: window.SiteCore. Node'is (testid): require('./js/core.js').
(function (root) {
  var LANGS = ['et', 'en', 'fi'];

  // Fondid, mis on index.html-is juba laaditud
  var LOADED_FONTS = ['Bricolage Grotesque', 'IBM Plex Sans', 'IBM Plex Mono'];

  var FONT_CHOICES = [
    'Bricolage Grotesque', 'IBM Plex Sans', 'Inter', 'Manrope', 'Space Grotesk', 'DM Sans',
    'Work Sans', 'Archivo', 'Syne', 'Fraunces', 'Playfair Display', 'Cormorant Garamond',
    'Libre Baskerville', 'Source Serif 4'
  ];

  var SERIF = ['Fraunces', 'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Source Serif 4'];

  function isEmpty(v) { return v === '' || v === null || v === undefined; }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  // Sügav ühendamine: tühi väärtus `over`-is ei kirjuta `base`-i üle.
  function mergeLocale(base, over) {
    if (isEmpty(over)) return base;
    if (Array.isArray(base)) {
      if (!Array.isArray(over)) return base;
      return base.map(function (b, i) { return mergeLocale(b, over[i]); });
    }
    if (isObj(base)) {
      if (!isObj(over)) return base;
      var out = {};
      Object.keys(base).forEach(function (k) { out[k] = mergeLocale(base[k], over[k]); });
      Object.keys(over).forEach(function (k) { if (!(k in base)) out[k] = over[k]; });
      return out;
    }
    if (isEmpty(base) || typeof over === typeof base) return over;
    return base;
  }

  function pickLang(search, stored, enabled) {
    var ok = function (l) { return l === 'et' || (LANGS.indexOf(l) >= 0 && (enabled || []).indexOf(l) >= 0); };
    var m = /[?&]lang=([a-z]+)/.exec(search || '');
    if (m) return ok(m[1]) ? m[1] : 'et';
    if (stored && ok(stored)) return stored;
    return 'et';
  }

  // Vana kuju (ilma et-võtmeta) käsitletakse eestikeelsena.
  function localeData(file, lang) {
    file = file || {};
    var et = file.et || file;
    if (lang === 'et' || !file.et) return et;
    return mergeLocale(et, file[lang] || {});
  }

  var COLOR_VARS = { bg: '--bg', surface: '--surface', line: '--line', ink: '--ink', inkDim: '--ink-dim', accent: '--accent' };

  function colorDecls(c) {
    if (!isObj(c)) return '';
    return Object.keys(COLOR_VARS).filter(function (k) { return !isEmpty(c[k]); })
      .map(function (k) { return COLOR_VARS[k] + ':' + c[k] + ';'; }).join('');
  }

  function fontStack(name) {
    return '"' + name + '", ' + (SERIF.indexOf(name) >= 0 ? 'Georgia, serif' : 'system-ui, sans-serif');
  }

  var SPACING = { tight: 'clamp(2.2rem, 6vw, 4rem)', airy: 'clamp(5rem, 12vw, 9rem)' };

  function designToCss(design) {
    if (!isObj(design)) return '';
    var css = '';
    var dark = colorDecls(design.dark), light = colorDecls(design.light);
    if (dark) {
      css += ':root[data-theme="dark"]{' + dark + '}';
      css += '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){' + dark + '}}';
    }
    if (light) {
      css += ':root[data-theme="light"]{' + light + '}';
      css += '@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){' + light + '}}';
    }
    var f = design.fonts || {}, l = design.layout || {}, rootDecl = '';
    if (!isEmpty(f.heading)) rootDecl += '--font-display:' + fontStack(f.heading) + ';';
    if (!isEmpty(f.body)) rootDecl += '--font-body:' + fontStack(f.body) + ';';
    if (!isEmpty(l.maxWidth)) rootDecl += '--maxw:' + Number(l.maxWidth) + 'px;';
    if (rootDecl) css += ':root{' + rootDecl + '}';
    if (!isEmpty(f.baseSize)) css += 'body{font-size:' + Number(f.baseSize) + 'px}';
    if (SPACING[l.spacing]) css += 'main section:not(.game-strip):not(.hero){padding-block:' + SPACING[l.spacing] + '}';
    var cols = Number(l.webColumns);
    if (cols === 1 || cols === 3) {
      css += '@media (min-width: 761px){.web-grid{grid-template-columns:repeat(' + cols + ',minmax(0,1fr))}}';
    }
    return css;
  }

  function fontsUrl(design) {
    var f = (design && design.fonts) || {};
    var need = [f.heading, f.body].filter(function (n, i, a) {
      return !isEmpty(n) && LOADED_FONTS.indexOf(n) < 0 && FONT_CHOICES.indexOf(n) >= 0 && a.indexOf(n) === i;
    });
    if (!need.length) return null;
    return 'https://fonts.googleapis.com/css2?' + need.map(function (n) {
      return 'family=' + n.replace(/ /g, '+') + ':wght@400;600;700;800';
    }).join('&') + '&display=swap';
  }

  function buildNav(sections) {
    var seen = {}, out = [];
    (sections || []).forEach(function (s) {
      if (!s || s.enabled === false || !s.inMenu || !s.menuLabel || !s.id || seen[s.id]) return;
      seen[s.id] = true;
      out.push({ id: s.id, label: s.menuLabel });
    });
    return out;
  }

  function textBlocks(body) {
    return String(body || '').split(/\n\s*\n/).map(function (p) { return p.trim(); })
      .filter(Boolean).map(function (p) {
        var parts = [], re = /https?:\/\/\S+/g, last = 0, m;
        while ((m = re.exec(p))) {
          var url = m[0].replace(/[.,;:!?)]+$/, '');
          if (m.index > last) parts.push({ t: 'text', v: p.slice(last, m.index) });
          parts.push({ t: 'link', v: url });
          last = m.index + url.length;
          re.lastIndex = last;
        }
        if (last < p.length) parts.push({ t: 'text', v: p.slice(last) });
        return parts;
      });
  }

  var api = {
    LANGS: LANGS, FONT_CHOICES: FONT_CHOICES, mergeLocale: mergeLocale, pickLang: pickLang,
    localeData: localeData, designToCss: designToCss, fontsUrl: fontsUrl, buildNav: buildNav,
    textBlocks: textBlocks
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SiteCore = api;
})(this);
