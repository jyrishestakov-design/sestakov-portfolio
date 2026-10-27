// Mänguriba: Viking Rider ja/või UFO. Kui mõlemad on sees, jooksevad demod kõrvuti
// (valikuvaade); valitud mäng laieneb täislaiusse, nupp „← Mängud“ toob tagasi.
// Käivita: window.startGames(stripEl, { viking, ufo, texts }) → { setTexts(texts) }
window.startGames = function (strip, opts) {
  var games = [];
  if (opts.viking) games.push('viking');
  if (opts.ufo) games.push('ufo');
  if (!games.length) return { setTexts: function () {} };
  var texts = opts.texts || {};
  var halves = {}, picks = {}, ufoApi = null;

  games.forEach(function (g) {
    var half = document.createElement('div');
    half.className = 'gm-half'; half.dataset.game = g;
    var mount = document.createElement('div');
    if (g === 'viking') mount.id = 'viking-runner'; else mount.className = 'ufo-runner';
    half.appendChild(mount);
    strip.appendChild(half);
    halves[g] = half;
    if (g === 'viking') window.startViking(mount);
    else ufoApi = window.startUfo(mount, texts);
  });

  if (games.length === 1) {
    strip.dataset.view = games[0];
    return { setTexts: function (t) { texts = t || {}; if (ufoApi) ufoApi.setTexts(texts); } };
  }

  // ---- valikuvaade
  var focus = 'viking';
  var back = document.createElement('button');
  back.type = 'button'; back.className = 'gm-back'; back.hidden = true;
  strip.appendChild(back);

  games.forEach(function (g) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'gm-pick';
    var label = document.createElement('span');
    b.appendChild(label);
    b.addEventListener('click', function () { open(g); });
    halves[g].appendChild(b);
    picks[g] = label;
  });

  function setTexts(t) {
    texts = t || {};
    back.textContent = texts.gamesBack || '←';
    picks.viking.textContent = texts.gamesPickViking || 'VIKING RIDER';
    picks.ufo.textContent = texts.gamesPickUfo || 'UFO';
    if (ufoApi) ufoApi.setTexts(texts);
  }

  function show(view) {
    strip.dataset.view = view;
    games.forEach(function (g) {
      halves[g].hidden = view !== 'pick' && view !== g;
      halves[g].classList.toggle('is-focus', view === 'pick' && g === focus);
      halves[g].querySelector('.gm-pick').hidden = view !== 'pick';
    });
    back.hidden = view === 'pick';
  }
  function open(g) { focus = g; show(g); }

  function onScreen() {
    var r = strip.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }

  // Valikuvaates ei jõua tühik ega X mängudeni (püüdev kuulaja käib enne mängude oma)
  window.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t !== document.body && t !== document.documentElement && !strip.contains(t)) return;
    if (e.metaKey || e.ctrlKey || e.altKey || !onScreen()) return;
    var view = strip.dataset.view;
    if (view !== 'pick') {
      if (e.code === 'Escape') { e.preventDefault(); show('pick'); }
      return;
    }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault(); e.stopImmediatePropagation();
      focus = e.code === 'ArrowLeft' ? 'viking' : 'ufo';
      show('pick');
    } else if (e.code === 'Enter') {
      e.preventDefault(); e.stopImmediatePropagation();
      open(focus);
    } else if (e.code === 'Space' || e.code === 'KeyX') {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);

  back.addEventListener('click', function () { show('pick'); });

  setTexts(texts);
  show('pick');
  return { setTexts: setTexts };
};
