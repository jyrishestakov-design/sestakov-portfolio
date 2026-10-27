// Lehe joonistamine content/site.json põhjal: sektsioonid, menüü, keel, kujundus.
// Sõltub: js/core.js (SiteCore), js/i18n-strings.js (SiteStrings), js/viking.js (startViking).
(function () {
  var C = window.SiteCore;
  var lang = 'et';

  // ---- abid
  function S(key, n) {
    var d = window.SiteStrings, v = (d[lang] && d[lang][key]) || d.et[key] || key;
    return n === undefined ? v : v.replace('{n}', n);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function html(str) {
    var t = document.createElement('template'); t.innerHTML = str.trim();
    return t.content.firstChild;
  }

  // ---- teema, kuupäev, ajakood, teralisus (muutmata käitumine)
  var root = document.documentElement;
  var grainTimer = null;
  (function () {
    var btn = document.getElementById('theme');
    try { var s = localStorage.getItem('vf-theme'); if (s) root.setAttribute('data-theme', s); } catch (e) {}
    btn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme');
      var mqDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!cur) cur = mqDark ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('vf-theme', next); } catch (e) {}
    });
  })();

  (function () {
    var el = document.getElementById('tc');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var start = performance.now();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function frame(now) {
      var t = (now - start) / 1000;
      var f = Math.floor(t * 24);
      var ff = f % 24, ss = Math.floor(f / 24) % 60, mm = Math.floor(f / 1440) % 60, hh = Math.floor(f / 86400) % 24;
      el.textContent = pad(hh) + ':' + pad(mm) + ':' + pad(ss) + ':' + pad(ff);
      if (!reduce) requestAnimationFrame(frame);
    }
    if (reduce) { el.textContent = '00:00:12:07'; } else { requestAnimationFrame(frame); }
  })();

  (function () {
    var c = document.getElementById('grain'), ctx = c.getContext('2d');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tile = document.createElement('canvas'); tile.width = tile.height = 128;
    var tctx = tile.getContext('2d');
    function noise() {
      var img = tctx.createImageData(128, 128), d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
    }
    function size() { c.width = Math.ceil(innerWidth / 2); c.height = Math.ceil(innerHeight / 2); }
    function paint() {
      noise();
      ctx.clearRect(0, 0, c.width, c.height);
      for (var x = 0; x < c.width; x += 128) for (var y = 0; y < c.height; y += 128) ctx.drawImage(tile, x, y);
    }
    size(); paint();
    addEventListener('resize', function () { size(); paint(); });
    if (!reduce) grainTimer = setInterval(paint, 90);
  })();

  // ---- sektsiooni raam
  function shell(section, extraClass) {
    var sec = el('section', extraClass);
    sec.id = section.id || '';
    var wrap = el('div', 'wrap');
    sec.appendChild(wrap);
    return { sec: sec, wrap: wrap };
  }
  function secHead(section, countText) {
    var head = el('div', 'sec-head');
    head.appendChild(el('h2', null, section.title || ''));
    head.appendChild(el('span', 'count', countText !== undefined ? countText : (section.countLabel || '')));
    return head;
  }
  function flag(text, after) {
    var p = el('p', 'flag');
    if (after) p.style.marginTop = '2.5rem';
    if (!text) { p.hidden = true; return p; }
    var m = /^\*\*(.+?)\*\*\s*([\s\S]*)$/.exec(text);
    if (m) {
      p.appendChild(el('b', null, m[1]));
      p.appendChild(document.createTextNode(' ' + m[2]));
    } else {
      p.textContent = text;
    }
    return p;
  }

  // ---- Shot Log
  var FIELDS = ['role', 'type', 'year', 'duration', 'tools', 'producer', 'director',
    'cinematographer', 'source', 'format', 'camera', 'lens', 'fps', 'link'];

  function fieldRows(work) {
    var dl = document.createElement('dl');
    FIELDS.forEach(function (key) {
      if (!(key in work)) return;
      var val = work[key];
      var dt = el('dt', null, S('f_' + key));
      var dd = document.createElement('dd');
      if (!val) {
        dd.textContent = S('fill'); dd.className = 'fill';
      } else if (key === 'link') {
        var a = el('a', null, val); a.href = val; a.target = '_blank'; a.rel = 'noopener';
        dd.appendChild(a);
      } else {
        dd.textContent = val;
      }
      dl.appendChild(dt); dl.appendChild(dd);
    });
    return dl;
  }

  function buildEntry(work, idxLabel) {
    var entry = el('div', 'entry' + (work.todo ? ' todo' : ''));
    entry.setAttribute('data-open', 'false');
    var row = el('div', 'entry-row'); row.setAttribute('role', 'button'); row.tabIndex = 0;
    row.setAttribute('aria-expanded', 'false');
    var mid = el('span');
    var title = el('span', 'title');
    title.appendChild(document.createTextNode(work.title || ''));
    if (work.titleEn) title.appendChild(el('span', 'en', ' / ' + work.titleEn));
    mid.appendChild(title); mid.appendChild(el('span', 'roles', work.roles || ''));
    row.appendChild(el('span', 'idx', idxLabel)); row.appendChild(mid); row.appendChild(el('span', 'year', work.year || ''));

    var panel = el('div', 'panel'), panelInner = el('div', 'panel-inner'), frame = el('div', 'frame');
    if (work.image) {
      frame.classList.add('frame--live');
      var img = el('img'); img.src = work.image; img.alt = work.title || ''; img.loading = 'lazy';
      frame.appendChild(img);
    }
    var spec = el('div', 'spec');
    spec.appendChild(fieldRows(work));
    if (work.note) spec.appendChild(el('p', 'note', work.note));
    panelInner.appendChild(frame); panelInner.appendChild(spec);
    panel.appendChild(panelInner);
    entry.appendChild(row); entry.appendChild(panel);

    function toggle() {
      var open = entry.getAttribute('data-open') === 'true';
      entry.setAttribute('data-open', open ? 'false' : 'true');
      row.setAttribute('aria-expanded', open ? 'false' : 'true');
    }
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    return entry;
  }

  // ---- renderdajad: (section, data) -> HTMLElement
  var gameNode = null;   // mäng käivitatakse üks kord; keelevahetusel kasutatakse sama sõlme
  var gamesNode = null;

  var GAME_TEXT_KEYS = ['ufoStart', 'ufoStartTouch', 'ufoHelp', 'ufoHelpTouch', 'ufoAgain', 'ufoAgainTouch',
    'ufoWin', 'ufoOver', 'gamesBack', 'gamesPickViking', 'gamesPickUfo'];
  function gameTexts() {
    var t = {};
    GAME_TEXT_KEYS.forEach(function (k) { t[k] = S(k); });
    return t;
  }

  // Mänguriba (valikuvaade ja laiendamine: js/games.js)
  function startGameStrip(strip, opts) {
    return window.startGames ? window.startGames(strip, opts) : null;
  }
  var RENDERERS = {
    game: function (section) {
      if (gameNode) { gameNode.setAttribute('aria-label', S('gameLabel')); return gameNode; }
      var sec = gameNode = el('section', 'game-strip');
      sec.id = section.id || 'ride';
      sec.setAttribute('aria-label', S('gameLabel'));
      var mount = el('div'); mount.id = 'viking-runner';
      sec.appendChild(mount);
      sec._afterInsert = function () {
        sec._afterInsert = null;
        if (window.startViking) window.startViking(mount);
      };
      return sec;
    },

    // Minimängud (Viking Rider ja/või UFO). Riba luuakse üks kord; keelevahetusel uuendatakse ainult tekstid.
    games: function (section) {
      var texts = gameTexts();
      if (gamesNode) {
        gamesNode.setAttribute('aria-label', S('gamesLabel'));
        if (gamesNode._api && gamesNode._api.setTexts) gamesNode._api.setTexts(texts);
        return gamesNode;
      }
      var sec = gamesNode = el('section', 'game-strip games-strip');
      sec.id = section.id || 'ride';
      sec.setAttribute('aria-label', S('gamesLabel'));
      var opts = { viking: section.viking !== false, ufo: section.ufo !== false, texts: texts };
      sec._afterInsert = function () {
        sec._afterInsert = null;
        sec._api = startGameStrip(sec, opts);
      };
      return sec;
    },

    hero: function (section, data) {
      var settings = data.settings || {};
      var sec = html(
        '<section class="hero" style="border-top:0"><div class="wrap"><div class="viewfinder">' +
        '<span class="br bl"></span><span class="br brr"></span><span class="cross"></span>' +
        '<span class="hud-corner tl">A-CAM · 01</span><span class="hud-corner tr">● REC</span>' +
        '<span class="hud-corner bl">3200K · f/2.0</span><span class="hud-corner brc">24 FPS</span>' +
        '<div class="eyebrow"></div><h1></h1><div class="hero-foot"><p></p><span class="scrollcue"></span></div>' +
        '</div></div></section>');
      sec.id = section.id || 'top';
      var parts = (settings.name || '').split(' ');
      var first = parts.shift(), rest = parts.join(' ');
      var h1 = sec.querySelector('h1');
      [first, rest].forEach(function (t) {
        if (!t) return;
        var line = el('span', 'line'); line.appendChild(el('span', null, t));
        h1.appendChild(line);
      });
      var eyebrow = sec.querySelector('.eyebrow');
      (settings.roles || []).forEach(function (r) { eyebrow.appendChild(el('span', 'on', r)); });
      if (settings.location) eyebrow.appendChild(el('span', null, settings.location));
      sec.querySelector('.hero-foot p').textContent = settings.statement || '';
      sec.querySelector('.scrollcue').textContent = S('scrollcue', (data.works || []).length);
      return sec;
    },

    log: function (section, data) {
      var s = shell(section), works = data.works || [];
      s.wrap.appendChild(secHead(section));
      s.wrap.appendChild(flag(section.notice));
      var list = el('div', 'log');
      var realCount = works.filter(function (w) { return !w.todo; }).length, seen = 0;
      works.forEach(function (w) {
        var label = '— —';
        if (!w.todo) { label = String(realCount - seen).padStart(2, '0'); seen++; }
        list.appendChild(buildEntry(w, label));
      });
      s.wrap.appendChild(list);
      return s.sec;
    },

    reel: function (section) {
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      var c = el('div', 'reel'), frame = el('div', 'frame');
      if (section.embedUrl) {
        frame.classList.add('frame--live');
        var iframe = el('iframe');
        iframe.src = section.embedUrl; iframe.title = section.heading || 'Showreel';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.loading = 'lazy';
        iframe.style.cssText = 'width:100%;height:100%;border:0;display:block';
        frame.appendChild(iframe);
      } else if (section.image) {
        frame.classList.add('frame--live');
        var img = el('img'); img.src = section.image; img.alt = section.heading || '';
        frame.appendChild(img);
      }
      var right = el('div');
      right.appendChild(el('h3', null, section.heading || 'Showreel'));
      right.appendChild(el('p', null, section.note || ''));
      if (!section.embedUrl) {
        var btn = el('a', 'btn', S('addVideo')); btn.href = '/admin/#/collections/site/entries/main';
        right.appendChild(btn);
      }
      c.appendChild(frame); c.appendChild(right);
      s.wrap.appendChild(c);
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    web: function (section, data) {
      var websites = data.websites || {};
      var items = (websites.items || []).filter(function (w) { return w && w.title; });
      if (!items.length) return null;
      var s = shell(section);
      s.wrap.appendChild(secHead(section, section.countLabel || S('webCount', items.length)));
      s.wrap.appendChild(el('p', 'web-intro', websites.note || ''));
      var grid = el('div', 'web-grid');
      items.forEach(function (w) {
        var host = (w.url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
        var card = el(w.url ? 'a' : 'div', 'site');
        if (w.url) { card.href = w.url; card.target = '_blank'; card.rel = 'noopener'; }
        var shot = el('div', 'site-shot'), chrome = el('div', 'site-chrome');
        chrome.appendChild(el('i')); chrome.appendChild(el('i')); chrome.appendChild(el('i'));
        chrome.appendChild(el('span', null, host || S('noAddress')));
        var view = el('div', 'site-view');
        if (w.image) {
          var img = el('img'); img.src = w.image; img.alt = w.title; img.loading = 'lazy';
          view.appendChild(img);
        } else {
          view.appendChild(el('div', 'ph', w.title));
        }
        shot.appendChild(chrome); shot.appendChild(view);
        var meta = el('div', 'site-meta'), left = el('div');
        left.appendChild(el('span', 'site-title', w.title));
        left.appendChild(el('span', 'roles', [w.type, w.client].filter(Boolean).join(' · ')));
        meta.appendChild(left); meta.appendChild(el('span', 'year', w.year || ''));
        var foot = el('div', 'site-foot');
        foot.appendChild(el('span', 'site-stack', w.stack || ''));
        foot.appendChild(el('span', 'site-go' + (w.url ? '' : ' off'), w.url ? S('openSite') : S('linkSoon')));
        card.appendChild(shot); card.appendChild(meta);
        if (w.description) card.appendChild(el('p', null, w.description));
        card.appendChild(foot);
        grid.appendChild(card);
      });
      s.wrap.appendChild(grid);
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    caps: function (section) {
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      var caps = el('div', 'caps');
      (section.items || []).forEach(function (c) {
        var cap = el('div', 'cap');
        cap.appendChild(el('span', 'k', c.kicker || ''));
        cap.appendChild(el('h3', null, c.title || ''));
        var ul = el('ul');
        (c.points || []).forEach(function (p) { ul.appendChild(el('li', null, p)); });
        cap.appendChild(ul);
        caps.appendChild(cap);
      });
      s.wrap.appendChild(caps);
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    files: function (section, data) {
      var files = data.files || {};
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      var grid = el('div', 'files-grid'), left = el('div');
      left.appendChild(el('p', 'files-intro', files.note || ''));
      var list = el('div', 'dl-list');
      var items = (files.items || []).filter(function (f) { return f && f.file; });
      if (!items.length) list.appendChild(el('p', 'dl-empty', S('noFiles')));
      items.forEach(function (f, i) {
        var p = String(f.file).replace(/^\//, '');
        var name = p.split('/').pop();
        try { name = decodeURIComponent(name); } catch (e) {}
        var ext = (name.split('.').pop() || '').toUpperCase();
        var a = el('a'); a.href = p; a.setAttribute('download', name);
        var m = el('span', 'm', f.note || '');
        a.appendChild(el('span', 'n', String(i + 1).padStart(2, '0')));
        a.appendChild(el('span', 'l', f.title || name));
        a.appendChild(el('span', 'g', '↓ ' + ext));
        a.appendChild(m);
        list.appendChild(a);
        // Faili suurus, kui teada (sama päritolu HEAD-päring; vea korral vaikselt vahele)
        fetch(p, { method: 'HEAD' }).then(function (r) {
          var len = +r.headers.get('content-length');
          if (r.ok && len) m.textContent = [f.note, fmtSize(len)].filter(Boolean).join(' · ');
        }).catch(function () {});
      });
      left.appendChild(list);
      grid.appendChild(left);

      var portal = (files.portalUrl || '').replace(/\/+$/, '');
      var box = el('aside', 'portal'); box.hidden = !portal;
      box.appendChild(el('span', 'k', S('portalKicker')));
      box.appendChild(el('h3', null, S('portalTitle')));
      box.appendChild(el('p', null, S('portalText')));
      var form = el('form'); form.autocomplete = 'off';
      var input = el('input'); input.name = 'code'; input.placeholder = S('portalPlaceholder');
      input.setAttribute('aria-label', S('portalPlaceholder')); input.required = true;
      input.pattern = '[a-zA-Z0-9-]{2,40}'; input.setAttribute('autocapitalize', 'none'); input.spellcheck = false;
      var btn = el('button', 'btn', S('portalButton')); btn.type = 'submit';
      form.appendChild(input); form.appendChild(btn);
      form.onsubmit = function (e) {
        e.preventDefault();
        var code = input.value.trim().toLowerCase();
        if (code && portal) window.location.href = portal + '/c/' + encodeURIComponent(code);
      };
      box.appendChild(form);
      grid.appendChild(box);
      s.wrap.appendChild(grid);
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    index: function (section) {
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      s.wrap.appendChild(linkList(section.links));
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    // ---- omaniku lisatavad tüübid
    text: function (section) {
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      s.wrap.appendChild(textBody(section.body));
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    textImage: function (section) {
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      var ti = el('div', 'ti' + (section.imageSide === 'left' ? ' ti--left' : ''));
      ti.appendChild(textBody(section.body));
      if (section.image) {
        var img = el('img'); img.src = section.image; img.alt = section.title || ''; img.loading = 'lazy';
        ti.appendChild(img);
      }
      s.wrap.appendChild(ti);
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    gallery: function (section) {
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      var gal = el('div', 'gal');
      (section.images || []).forEach(function (g) {
        if (!g || !g.image) return;
        var b = el('button'); b.type = 'button';
        var img = el('img'); img.src = g.image; img.alt = g.caption || section.title || ''; img.loading = 'lazy';
        b.appendChild(img);
        if (g.caption) b.appendChild(el('span', 'cap-txt', g.caption));
        b.addEventListener('click', function () { openLightbox(g.image, g.caption); });
        gal.appendChild(b);
      });
      s.wrap.appendChild(gal);
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    video: function (section) {
      var s = shell(section);
      s.wrap.appendChild(secHead(section));
      var frame = el('div', 'frame frame--live');
      if (section.embedUrl) {
        var iframe = el('iframe');
        iframe.src = section.embedUrl; iframe.title = section.caption || section.title || 'Video';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.loading = 'lazy';
        iframe.style.cssText = 'width:100%;height:100%;border:0;display:block';
        frame.appendChild(iframe);
      }
      s.wrap.appendChild(frame);
      if (section.caption) s.wrap.appendChild(el('p', 'video-cap', section.caption));
      s.wrap.appendChild(flag(section.notice, true));
      return s.sec;
    },

    links: function (section) {
      return RENDERERS.index(section);
    }
  };

  function textBody(body) {
    var box = el('div', 'text-body');
    C.textBlocks(body).forEach(function (parts) {
      var p = el('p');
      parts.forEach(function (part) {
        if (part.t === 'link') {
          var a = el('a', null, part.v); a.href = part.v; a.target = '_blank'; a.rel = 'noopener';
          p.appendChild(a);
        } else {
          p.appendChild(document.createTextNode(part.v));
        }
      });
      box.appendChild(p);
    });
    return box;
  }

  var lightbox = null;
  function openLightbox(src, caption) {
    if (!lightbox) {
      lightbox = el('dialog', 'lightbox');
      lightbox.appendChild(el('img'));
      lightbox.appendChild(el('p'));
      var close = el('button', 'theme-btn', S('close')); close.type = 'button';
      close.addEventListener('click', function () { lightbox.close(); });
      lightbox.appendChild(close);
      lightbox.addEventListener('click', function (e) { if (e.target === lightbox) lightbox.close(); });
      document.body.appendChild(lightbox);
    }
    lightbox.querySelector('button').textContent = S('close');
    lightbox.querySelector('img').src = src;
    lightbox.querySelector('img').alt = caption || '';
    lightbox.querySelector('p').textContent = caption || '';
    lightbox.showModal();
  }

  // ---- kujundus, taust, efektid
  function applyDesign(design, settings) {
    design = design || {};
    var style = document.getElementById('design-css');
    if (!style) { style = el('style'); style.id = 'design-css'; document.head.appendChild(style); }
    style.textContent = C.designToCss(design);

    var url = C.fontsUrl(design), link = document.getElementById('design-fonts');
    if (url) {
      if (!link) { link = el('link'); link.id = 'design-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
      if (link.href !== url) link.href = url;
    } else if (link) {
      link.remove();
    }

    var fx = design.effects || {}, grain = document.getElementById('grain');
    if (fx.grain === 0 || fx.grain === '0') {
      grain.style.display = 'none';
      if (grainTimer) { clearInterval(grainTimer); grainTimer = null; }
    } else if (fx.grain !== undefined && fx.grain !== null && fx.grain !== '') {
      grain.style.opacity = String(Number(fx.grain) / 1000);
    }
    document.querySelector('.rec').style.display = fx.showRec === false ? 'none' : '';
    document.getElementById('tc').style.display = fx.showTimecode === false ? 'none' : '';

    var bg = design.background || {}, bgEl = document.getElementById('bgimg');
    if (bg.image) {
      if (!bgEl) { bgEl = el('div'); bgEl.id = 'bgimg'; bgEl.setAttribute('aria-hidden', 'true'); document.body.insertBefore(bgEl, document.body.firstChild); }
      bgEl.style.backgroundImage = 'url("' + String(bg.image).replace(/"/g, '%22') + '")';
      bgEl.style.opacity = String(num(bg.opacity, 30) / 100);
      bgEl.style.filter = 'blur(' + num(bg.blur, 0) + 'px)';
      bgEl.style.setProperty('--shade', String(num(bg.shade, 0) / 100));
    } else if (bgEl) {
      bgEl.remove();
    }

    // Vaiketeema kehtib ainult siis, kui külastaja pole ise teemat valinud
    var stored = null;
    try { stored = localStorage.getItem('vf-theme'); } catch (e) {}
    if (!stored) {
      var dt = settings && settings.defaultTheme;
      if (dt === 'dark' || dt === 'light') root.setAttribute('data-theme', dt);
      else root.removeAttribute('data-theme');
    }
  }

  function num(v, def) { var n = Number(v); return v === '' || v === null || v === undefined || isNaN(n) ? def : n; }

  function linkList(links) {
    var list = el('div', 'idx-list');
    (links || []).forEach(function (l, i) {
      if (!l || !l.url) return;
      var a = el('a'); a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
      a.appendChild(el('span', 'n', String(i + 1).padStart(2, '0')));
      a.appendChild(el('span', 'l', l.label || l.url));
      a.appendChild(el('span', 'u', l.display || l.url.replace(/^https?:\/\/(www\.)?/, '')));
      list.appendChild(a);
    });
    return list;
  }

  function fmtSize(b) {
    if (!b) return '';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return (i ? b.toFixed(1) : b) + ' ' + u[i];
  }

  var DEFAULT_SECTIONS = [
    { type: 'game', id: 'ride' },
    { type: 'hero', id: 'top' },
    { type: 'log', id: 'log', title: 'Shot Log', countLabel: 'Valitud tööd 1999–2025', menuLabel: 'Shot Log', inMenu: true },
    { type: 'reel', id: 'reel', title: 'Reel', countLabel: 'YouTube', menuLabel: 'Reel', inMenu: true },
    { type: 'web', id: 'web', title: 'Veebilehed', menuLabel: 'Veeb', inMenu: true },
    { type: 'caps', id: 'caps', title: 'Oskused', countLabel: 'Üle 30 aasta', menuLabel: 'Oskused', inMenu: true },
    { type: 'files', id: 'files', title: 'Failid', countLabel: 'Allalaadimine', menuLabel: 'Failid', inMenu: true },
    { type: 'index', id: 'index', title: 'Index', countLabel: 'Lingid', menuLabel: 'Index', inMenu: true }
  ];

  // Vana kujuga andmed (enne sektsioone): reel ja märkused olid settings'is
  function sectionsOf(data) {
    if (Array.isArray(data.sections)) return data.sections;
    var s = data.settings || {}, reel = s.reel || {}, notes = s.draftNotices || {};
    return DEFAULT_SECTIONS.map(function (d) {
      var o = {}; for (var k in d) o[k] = d[k];
      if (o.type === 'reel') { o.heading = reel.title; o.note = reel.note; o.embedUrl = reel.embedUrl; o.image = reel.image; }
      if (notes[o.type]) o.notice = notes[o.type];
      return o;
    });
  }

  // ---- menüü ja jalus
  function renderNav(sections) {
    var nav = document.getElementById('nav');
    nav.textContent = '';
    C.buildNav(sections).forEach(function (n) {
      var a = el('a', null, n.label); a.href = '#' + n.id;
      nav.appendChild(a);
    });
  }

  function renderFooter(settings) {
    // E-post on site.json-is tükeldatud (user/domain) ja pannakse kokku alles siin, et
    // lähtekoodist või JSON-ist "@"-mustrit otsiv bot seda ei leiaks.
    document.getElementById('footContact').textContent = S('contact');
    document.getElementById('theme').setAttribute('aria-label', S('themeLabel'));
    var link = document.getElementById('footEmailLink');
    var em = settings.contactEmail;
    var email = (em && em.user && em.domain) ? (em.user + '@' + em.domain) : '';
    link.textContent = email;
    link.href = email ? ('mailto:' + email) : '#';
    document.getElementById('footPhone').textContent = settings.contactPhone || '';
    document.getElementById('footLocation').textContent = settings.location || '';
    var roles = document.getElementById('footRoles');
    roles.textContent = '';
    (settings.roles || []).forEach(function (r, i) {
      if (i > 0) roles.appendChild(document.createElement('br'));
      roles.appendChild(document.createTextNode(r));
    });
  }

  // ---- keelevalik
  function enabledLangs(file) {
    var et = (file && (file.et || file)) || {};
    var l = (et.settings && et.settings.languages) || ['et'];
    return C.LANGS.filter(function (x) { return x === 'et' || l.indexOf(x) >= 0; });
  }

  function renderLangs(file) {
    var langs = enabledLangs(file), box = document.getElementById('langs');
    box.textContent = '';
    box.hidden = langs.length < 2;
    box.setAttribute('aria-label', S('langLabel'));
    langs.forEach(function (l) {
      var b = el('button', null, l.toUpperCase()); b.type = 'button';
      b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (l === lang) return;
        lang = l;
        try { localStorage.setItem('vf-lang', l); } catch (e) {}
        var url = new URL(location.href);
        if (l === 'et') url.searchParams.delete('lang'); else url.searchParams.set('lang', l);
        history.replaceState(null, '', url.pathname + url.search + url.hash);
        render(file);
      });
      box.appendChild(b);
    });
  }

  // ---- käivitus
  function render(file) {
    root.setAttribute('lang', lang);
    renderLangs(file);
    var data = C.localeData(file, lang);
    var settings = data.settings || {};
    var sections = sectionsOf(data);
    var main = document.getElementById('sections');
    main.textContent = '';
    var after = [];
    sections.forEach(function (section) {
      if (!section || section.enabled === false) return;
      var fn = RENDERERS[section.type];
      if (!fn) return;
      var node;
      // Üks vigane sektsioon ei tohi peatada ülejäänud lehte
      try { node = fn(section, data); } catch (err) {
        console.warn('Sektsioon "' + (section.id || section.type) + '" jäi vahele:', err);
        return;
      }
      if (!node) return;
      main.appendChild(node);
      if (node._afterInsert) after.push(node._afterInsert);
    });
    after.forEach(function (f) { f(); });
    renderNav(sections);
    renderFooter(settings);
    applyDesign(data.design, settings);
  }

  document.getElementById('today').textContent =
    new Date().toLocaleDateString('et-EE', { year: 'numeric', month: 'long', day: 'numeric' });

  fetch('content/site.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .catch(function (err) {
      // Sisu puudub → näita vaikimisi raami (minimäng, avaplokk), mitte tühja lehte
      console.error('Sisu (content/site.json) laadimine ebaõnnestus:', err);
      return {};
    })
    .then(function (file) {
      var stored = null;
      try { stored = localStorage.getItem('vf-lang'); } catch (e) {}
      lang = C.pickLang(location.search, stored, enabledLangs(file));
      render(file);
    });
})();
