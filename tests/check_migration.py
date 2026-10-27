# Kontrollib, et content/site.json on uuel kujul (Task 3).
import json, sys
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'content/site.json'))
et = d['et']
types = [s['type'] for s in et['sections']]
assert types[0] in ('game', 'games') and types[1:] == ['hero','log','reel','web','caps','files','index'], 'sections'
assert [s['id'] for s in et['sections']] == ['ride','top','log','reel','web','caps','files','index'], 'ids'
assert len(et['works']) == 22, 'works'
assert len(et['websites']['items']) == 9, 'websites'
caps = next(s for s in et['sections'] if s['type'] == 'caps')
assert [c['title'] for c in caps['items']] == ['Liikuvgraafika','3D-animatsioon','Montaaž ja kaamera'], 'caps'
assert all(len(c['points']) == 4 for c in caps['items']), 'caps points'
idx = next(s for s in et['sections'] if s['type'] == 'index')
assert len(idx['links']) == 4 and idx['links'][0]['display'] == 'imdb.com/name/nm1848794', 'index'
reel = next(s for s in et['sections'] if s['type'] == 'reel')
assert reel['heading'] == "Tööd YouTube'is" and reel['embedUrl'].startswith('https://www.youtube.com/embed/'), 'reel'
assert 'reel' not in et['settings'] and 'draftNotices' not in et['settings'], 'settings cleanup'
assert et['settings']['languages'] == ['et','en','fi'] and et['settings']['defaultTheme'] == 'auto', 'settings new'
assert et['design'] == {} and d['en'] == {} or isinstance(d['en'], dict), 'design/en'
log = next(s for s in et['sections'] if s['type'] == 'log')
assert log['countLabel'] == 'Valitud tööd 1999–2025' and log['menuLabel'] == 'Shot Log' and log['inMenu'] is True, 'log'
assert all(s['enabled'] is True and s['notice'] == '' for s in et['sections']), 'enabled/notice'
print('migration ok')
