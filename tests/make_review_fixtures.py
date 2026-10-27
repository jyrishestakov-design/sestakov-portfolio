# Lõppülevaatuse leidude testandmed: python3 tests/make_review_fixtures.py
import copy
import json

base = json.load(open('content/site.json', encoding='utf-8'))
LONG = 'https://example.com/' + 'a' * 200

# Pikk URL märkuses ja oskuste reas (mitte ainult tekstiplokis)
d = json.load(open('tests/fixtures/long-url.json', encoding='utf-8'))
for s in d['et']['sections']:
    if s['type'] == 'caps':
        s['notice'] = 'Vaata ' + LONG
        s['items'][0]['points'][0] = LONG
json.dump(d, open('tests/fixtures/long-url.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# Fail, mille nimi ei ole kehtiv URI-kodeering (decodeURIComponent viskab vea)
d = copy.deepcopy(base)
d['et']['files']['items'] = [{'title': 'Halb nimi', 'file': '/content/uploads/100%.pdf', 'note': ''}]
json.dump(d, open('tests/fixtures/bad-file.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('ok')
