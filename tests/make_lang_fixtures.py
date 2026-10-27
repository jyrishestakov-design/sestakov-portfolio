# Teeb keeletestide andmed failist content/site.json: python3 tests/make_lang_fixtures.py
import copy
import json

base = json.load(open('content/site.json', encoding='utf-8'))
n = len(base['et']['sections'])
d = copy.deepcopy(base)
secs = [{} for _ in range(n)]
secs[2] = {'menuLabel': 'Log', 'title': 'Shot Log EN'}
d['en'] = {'settings': {'statement': ''}, 'sections': secs}
d['fi'] = {'settings': {'statement': 'Suomeksi.'}}
json.dump(d, open('tests/fixtures/lang.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

d2 = copy.deepcopy(d)
d2['et']['settings']['languages'] = ['et', 'en']
json.dump(d2, open('tests/fixtures/lang-nofi.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('ok')
