# UFO-mängu testandmed failist content/site.json: python3 tests/make_ufo_fixtures.py
import copy
import json

base = json.load(open('content/site.json', encoding='utf-8'))


def with_games(viking, ufo):
    d = copy.deepcopy(base)
    secs = d['et']['sections']
    i = next(i for i, s in enumerate(secs) if s['id'] == 'ride')
    secs[i] = {'type': 'games', 'id': 'ride', 'enabled': True, 'title': '', 'countLabel': '',
               'menuLabel': '', 'inMenu': False, 'notice': '', 'viking': viking, 'ufo': ufo}
    return d


for name, v, u in (('ufo-only', False, True), ('games-both', True, True)):
    json.dump(with_games(v, u), open(f'tests/fixtures/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('ok')
