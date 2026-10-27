# Ühekordne üleminek: content/site.json vanast kujust kujule { et, en, fi } koos sektsioonidega.
# Käivita repo juurest: python3 scripts/migrate.py
# Kui fail on juba uuel kujul, ei muudeta midagi.
import json

PATH = 'content/site.json'

CAPS = [
    {'kicker': '01 — Motion & VFX', 'title': 'Liikuvgraafika', 'points': [
        'Saategraafika, tiitrid ja motion design',
        'VFX ja compositing filmidele',
        'Reklaamid ja sündmuste visuaalid',
        'After Effects, Fusion, Motion']},
    {'kicker': '02 — 3D', 'title': '3D-animatsioon', 'points': [
        'Modelleerimine, animatsioon, render',
        'Virtuaalstuudiod ja visualiseerimine',
        'Blender, 3ds Max',
        'AI-tööriistad pildi- ja videoloomes']},
    {'kicker': '03 — Film', 'title': 'Montaaž ja kaamera', 'points': [
        'Dokumentaal- ja mängufilmide montaaž',
        'Operaatoritöö, intervjuud',
        'Režii: reklaamid ja lühifilmid',
        'DaVinci Resolve, Premiere Pro, Final Cut Pro']},
]

LINKS = [
    {'label': 'IMDb — Jüri Shestakov', 'url': 'https://www.imdb.com/name/nm1848794/', 'display': 'imdb.com/name/nm1848794'},
    {'label': 'Eesti Filmi Andmebaas', 'url': 'https://www.efis.ee/en/person/12420', 'display': 'efis.ee/en/person/12420'},
    {'label': 'LinkedIn', 'url': 'https://ee.linkedin.com/in/j%C3%BCri-illimar-reinberg-shestakov-049a4325', 'display': 'linkedin.com/in/…-049a4325'},
    {'label': 'YouTube — tööd', 'url': 'https://www.youtube.com/@jurishestakov7458', 'display': 'youtube.com/@jurishestakov7458'},
]


def section(type_, id_, title='', count='', menu='', in_menu=False, notice='', **extra):
    s = {'type': type_, 'id': id_, 'enabled': True, 'title': title, 'countLabel': count,
         'menuLabel': menu, 'inMenu': in_menu, 'notice': notice or ''}
    s.update(extra)
    return s


def migrate(old):
    settings = dict(old['settings'])
    reel = settings.pop('reel', {}) or {}
    notices = settings.pop('draftNotices', {}) or {}
    settings['languages'] = ['et', 'en', 'fi']
    settings['defaultTheme'] = 'auto'
    sections = [
        section('game', 'ride'),
        section('hero', 'top'),
        section('log', 'log', 'Shot Log', 'Valitud tööd 1999–2025', 'Shot Log', True, notices.get('log')),
        section('reel', 'reel', 'Reel', 'YouTube', 'Reel', True,
                heading=reel.get('title', ''), note=reel.get('note', ''),
                embedUrl=reel.get('embedUrl', ''), image=reel.get('image', '')),
        section('web', 'web', 'Veebilehed', '', 'Veeb', True),
        section('caps', 'caps', 'Oskused', 'Üle 30 aasta', 'Oskused', True, notices.get('caps'), items=CAPS),
        section('files', 'files', 'Failid', 'Allalaadimine', 'Failid', True),
        section('index', 'index', 'Index', 'Lingid', 'Index', True, notices.get('index'), links=LINKS),
    ]
    et = {'settings': settings, 'sections': sections, 'works': old['works'],
          'websites': old['websites'], 'files': old['files'], 'design': {}}
    return {'et': et, 'en': {}, 'fi': {}}


if __name__ == '__main__':
    data = json.load(open(PATH, encoding='utf-8'))
    if 'et' in data:
        print('juba uuel kujul, muudatusi pole')
    else:
        with open(PATH, 'w', encoding='utf-8') as f:
            json.dump(migrate(data), f, ensure_ascii=False, indent=2)
            f.write('\n')
        print('üle viidud')
