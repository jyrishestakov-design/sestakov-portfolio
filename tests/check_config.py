# Kontrollib admin/config.yml vastavust content/site.json-ile ja lehe renderdajatele (Task 7).
# Käivita repo juurest: python3 tests/check_config.py
import json
import yaml

cfg = yaml.safe_load(open('admin/config.yml', encoding='utf-8'))
site = json.load(open('content/site.json', encoding='utf-8'))
errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


# 1. i18n seadistus
i18n = cfg.get('i18n') or {}
check(i18n.get('structure') == 'single_file', 'i18n.structure peab olema single_file')
check(i18n.get('locales') == ['et', 'en', 'fi'], 'i18n.locales peab olema [et, en, fi]')
check(i18n.get('default_locale') == 'et', 'i18n.default_locale peab olema et')

# 2. Kõik kirjed osutavad content/site.json-ile ja on i18n: true
coll = next(c for c in cfg['collections'] if c['name'] == 'site')
check(coll.get('i18n') is True, 'kogumik site peab olema i18n: true')
files = coll['files']
check(all(f['file'] == 'content/site.json' for f in files), 'kõik kirjed peavad osutama content/site.json-ile')
check(all(f.get('i18n') is True for f in files), 'iga kirje peab olema i18n: true')

# 3. Iga site.json et-ülataseme võti on kirjeldatud
top = {}
for f in files:
    for fld in f['fields']:
        top[fld['name']] = fld
for key in site['et']:
    check(key in top, f'site.json võti "{key}" puudub configist')

# 4. Sektsioonitüübid ja nende väljad
COMMON = {'id', 'enabled', 'title', 'countLabel', 'menuLabel', 'inMenu', 'notice'}
RENDER_KEYS = {
    'game': set(), 'hero': set(), 'log': set(), 'web': set(), 'files': set(),
    'reel': {'heading', 'note', 'embedUrl', 'image'},
    'caps': {'items'}, 'index': {'links'}, 'links': {'links'},
    'text': {'body'}, 'textImage': {'body', 'image', 'imageSide'},
    'gallery': {'images'}, 'video': {'embedUrl', 'caption'},
    'games': {'viking', 'ufo'},
}
types = {t['name']: t for t in top['sections'].get('types', [])}
check(set(types) == set(RENDER_KEYS), f'sektsioonitüübid erinevad: {sorted(set(types) ^ set(RENDER_KEYS))}')
for name, t in types.items():
    names = {f['name'] for f in t.get('fields', [])}
    want = COMMON | RENDER_KEYS.get(name, set())
    check(names == want, f'tüüp {name}: väljad {sorted(names ^ want)} ei klapi')

# 5. Keelest sõltumatud väljad on i18n: duplicate (kõikjal configis)
DUP = {'image', 'file', 'url', 'link', 'embedUrl', 'year', 'todo', 'enabled', 'inMenu', 'id',
       'design', 'languages', 'defaultTheme', 'contactEmail', 'contactPhone', 'portalUrl',
       'imageSide', 'format', 'camera', 'lens', 'fps', 'tools', 'stack', 'viking', 'ufo'}


def walk(fields):
    for fld in fields or []:
        if fld['name'] in DUP:
            check(fld.get('i18n') == 'duplicate', f'väli {fld["name"]} peab olema i18n: duplicate')
        walk(fld.get('fields'))
        for t in fld.get('types', []) or []:
            walk(t.get('fields'))
        if isinstance(fld.get('field'), dict):
            walk([fld['field']])


for f in files:
    walk(f['fields'])


# 5b. Tõlgitavad väljad ei tohi olla kohustuslikud, muidu ei saa salvestada enne,
#     kui kõik keeled on täidetud (tõlkimata tekst peab jääma eesti keelde)
def walk_required(fields, path=''):
    for fld in fields or []:
        p = path + '/' + fld['name']
        if fld.get('i18n') is True and fld.get('widget') in ('string', 'text', 'list') and fld.get('required', True) is not False:
            check(False, f'tõlgitav väli {p} peab olema required: false')
        walk_required(fld.get('fields'), p)
        for t in fld.get('types', []) or []:
            walk_required(t.get('fields'), p + ':' + t['name'])
        if isinstance(fld.get('field'), dict):
            walk_required([fld['field']], p)


for f in files:
    for fld in f['fields']:
        # ülataseme objektid (settings, websites, files, works) ise võivad jääda vaikimisi
        if fld.get('widget') == 'object':
            walk_required(fld.get('fields'), '/' + fld['name'])
        else:
            walk_required(fld.get('fields'), '/' + fld['name'])
            for t in fld.get('types', []) or []:
                walk_required(t.get('fields'), '/' + fld['name'] + ':' + t['name'])

# 6. Fondivalik vastab js/core.js FONT_CHOICES-ile
core = open('js/core.js', encoding='utf-8').read()
design = top['design']
fonts = next(x for x in design['fields'] if x['name'] == 'fonts')
heading = next(x for x in fonts['fields'] if x['name'] == 'heading')
for opt in heading['options']:
    check(f"'{opt}'" in core, f'font {opt} puudub js/core.js FONT_CHOICES-ist')

if errors:
    print('\n'.join('FAIL ' + e for e in errors))
    raise SystemExit(1)
print('config ok')
