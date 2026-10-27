# Inglise ja soome esialgsed tõlked (masintõlke stiilis, omanik vaatab üle /admin kaudu).
# Kirjutab content/site.json võtmetesse "en" ja "fi". Nimekirjad on samas järjekorras kui "et".
# Käivita repo juurest: python3 scripts/translations.py
import json

PATH = 'content/site.json'

SETTINGS = {
    'en': {
        'roles': ['Computer graphics · motion design', '3D animation · VFX', 'Editing · camera'],
        'location': 'Saaremaa, Estonia',
        'statement': 'Over 30 years in television, film and advertising: from news graphics at ERR and animation '
                     'for commercial TV to VFX, editing and song festival visuals for feature films and major events.',
    },
    'fi': {
        'roles': ['Tietokonegrafiikka · motion design', '3D-animaatio · VFX', 'Leikkaus · kuvaus'],
        'location': 'Saarenmaa, Viro',
        'statement': 'Yli 30 vuotta televisio-, elokuva- ja mainostyötä: ERR:n uutisgrafiikasta ja kaupallisen '
                     'television animaatioista pitkien elokuvien VFX:ään, leikkaukseen ja laulujuhlien visuaaleihin.',
    },
}

# Sektsioonid järjekorras: game, hero, log, reel, web, caps, files, index
SECTIONS = {
    'en': [
        {}, {},
        {'title': 'Shot Log', 'countLabel': 'Selected works 1999–2025', 'menuLabel': 'Shot Log'},
        {'title': 'Reel', 'countLabel': 'YouTube', 'menuLabel': 'Reel', 'heading': 'Work on YouTube',
         'note': 'A selection of my videos and animations. All videos: youtube.com/@jurishestakov7458'},
        {'title': 'Websites', 'menuLabel': 'Web'},
        {'title': 'Skills', 'countLabel': 'Over 30 years', 'menuLabel': 'Skills', 'items': [
            {'kicker': '01 — Motion & VFX', 'title': 'Motion graphics', 'points': [
                'Broadcast graphics, titles and motion design', 'VFX and compositing for film',
                'Commercials and event visuals', 'After Effects, Fusion, Motion']},
            {'kicker': '02 — 3D', 'title': '3D animation', 'points': [
                'Modelling, animation, rendering', 'Virtual studios and visualisation',
                'Blender, 3ds Max', 'AI tools for image and video creation']},
            {'kicker': '03 — Film', 'title': 'Editing and camera', 'points': [
                'Editing documentaries and feature films', 'Camera work, interviews',
                'Directing: commercials and short films', 'DaVinci Resolve, Premiere Pro, Final Cut Pro']},
        ]},
        {'title': 'Files', 'countLabel': 'Downloads', 'menuLabel': 'Files'},
        {'title': 'Index', 'countLabel': 'Links', 'menuLabel': 'Index', 'links': [
            {'label': 'IMDb — Jüri Shestakov'}, {'label': 'Estonian Film Database'},
            {'label': 'LinkedIn'}, {'label': 'YouTube — work'}]},
    ],
    'fi': [
        {}, {},
        {'title': 'Shot Log', 'countLabel': 'Valitut työt 1999–2025', 'menuLabel': 'Shot Log'},
        {'title': 'Reel', 'countLabel': 'YouTube', 'menuLabel': 'Reel', 'heading': 'Töitä YouTubessa',
         'note': 'Valikoima videoitani ja animaatioitani. Kaikki videot: youtube.com/@jurishestakov7458'},
        {'title': 'Verkkosivustot', 'menuLabel': 'Verkko'},
        {'title': 'Osaaminen', 'countLabel': 'Yli 30 vuotta', 'menuLabel': 'Osaaminen', 'items': [
            {'kicker': '01 — Motion & VFX', 'title': 'Liikegrafiikka', 'points': [
                'Lähetysgrafiikka, tekstit ja motion design', 'VFX ja compositing elokuviin',
                'Mainokset ja tapahtumien visuaalit', 'After Effects, Fusion, Motion']},
            {'kicker': '02 — 3D', 'title': '3D-animaatio', 'points': [
                'Mallinnus, animaatio, renderöinti', 'Virtuaalistudiot ja visualisointi',
                'Blender, 3ds Max', 'Tekoälytyökalut kuvan- ja videontekoon']},
            {'kicker': '03 — Film', 'title': 'Leikkaus ja kuvaus', 'points': [
                'Dokumentti- ja pitkien elokuvien leikkaus', 'Kuvaustyö, haastattelut',
                'Ohjaus: mainokset ja lyhytelokuvat', 'DaVinci Resolve, Premiere Pro, Final Cut Pro']},
        ]},
        {'title': 'Tiedostot', 'countLabel': 'Lataukset', 'menuLabel': 'Tiedostot'},
        {'title': 'Index', 'countLabel': 'Linkit', 'menuLabel': 'Index', 'links': [
            {'label': 'IMDb — Jüri Shestakov'}, {'label': 'Viron elokuvatietokanta'},
            {'label': 'LinkedIn'}, {'label': 'YouTube — työt'}]},
    ],
}

# Tööd järjekorras (pealkirju ei tõlgita): (roles, role, type)
WORKS = {
    'en': [
        ('Promotional materials · animated visuals', 'Animated visuals, promotional materials (with Marko Kekishev)', 'Major event'),
        ('VFX · animation', 'Promotional materials, VFX and animation (with Mart Andersson)', 'Major event'),
        ('VFX · music videos', 'VFX, music videos', 'AI-created theatre performance'),
        ('Title animation · VFX', 'Title animation, VFX', 'Feature film'),
        ('VFX', 'VFX', 'Film'),
        ('VFX · animation', 'VFX, animation', 'Short clips'),
        ('VFX · multimedia', 'VFX', 'Multimedia performance'),
        ('Graphics · UI/UX', 'Graphics, UI/UX', 'Point-and-click adventure game'),
        ('VFX · lead editor', 'VFX, lead editor', 'Feature-length documentary'),
        ('VFX · editing', 'VFX, editing', 'Concert performance, St Nicholas Church'),
        ('Camera · VFX · editing', 'Camera, VFX, editing', 'Music documentary'),
        ('Camera · editor · ETV', 'Camera, editor', 'TV documentary, 28 min (ETV)'),
        ('Editing · VFX', 'Editing, VFX', 'Film'),
        ('Editing · VFX · feature film', 'Editing, VFX', 'Feature film'),
        ('Directing · editing · VFX', 'Director, editor, VFX', 'Short film, premiered at Sõprus cinema'),
        ('VFX · animation · editing', 'VFX, animation, editing', 'Feature film'),
        ('Editing · directing · graphics', 'Editing, directing, graphics', 'TV series (8 + 7 episodes)'),
        ('Animated backgrounds', 'Animated stage backgrounds', 'TV broadcast, Tallinn'),
        ('Graphics · print ads', 'Graphics, print advertising', 'TV series, 64 episodes'),
        ('Graphics · Discovery', 'Graphics', 'Discovery series'),
        ('Animation · VFX', 'Animation, VFX', 'Multimedia performance, Von Krahl Theatre'),
        ('VFX', 'VFX', 'Sci-fi series, 8 episodes'),
    ],
    'fi': [
        ('Mainosmateriaalit · animoidut visuaalit', 'Animoidut visuaalit, mainosmateriaalit (yhdessä Marko Kekishevin kanssa)', 'Suurtapahtuma'),
        ('VFX · animaatio', 'Mainosmateriaalit, VFX ja animaatio (yhdessä Mart Anderssonin kanssa)', 'Suurtapahtuma'),
        ('VFX · musiikkivideot', 'VFX, musiikkivideot', 'Tekoälyn luoma teatteriesitys'),
        ('Alkutekstien animaatio · VFX', 'Alkutekstien animaatio, VFX', 'Pitkä elokuva'),
        ('VFX', 'VFX', 'Elokuva'),
        ('VFX · animaatio', 'VFX, animaatio', 'Lyhyet klipit'),
        ('VFX · multimedia', 'VFX', 'Multimediaesitys'),
        ('Grafiikka · UI/UX', 'Grafiikka, UI/UX', 'Point-and-click-seikkailupeli'),
        ('VFX · vastaava leikkaaja', 'VFX, vastaava leikkaaja', 'Pitkä dokumenttielokuva'),
        ('VFX · leikkaus', 'VFX, leikkaus', 'Konserttiesitys, Nigulisten kirkko'),
        ('Kuvaus · VFX · leikkaus', 'Kuvaus, VFX, leikkaus', 'Musiikkidokumentti'),
        ('Kuvaus · leikkaaja · ETV', 'Kuvaaja, leikkaaja', 'TV-dokumentti, 28 min (ETV)'),
        ('Leikkaus · VFX', 'Leikkaus, VFX', 'Elokuva'),
        ('Leikkaus · VFX · pitkä elokuva', 'Leikkaus, VFX', 'Pitkä elokuva'),
        ('Ohjaus · leikkaus · VFX', 'Ohjaaja, leikkaaja, VFX', 'Lyhytelokuva, ensi-ilta Sõprus-elokuvateatterissa'),
        ('VFX · animaatio · leikkaus', 'VFX, animaatio, leikkaus', 'Pitkä elokuva'),
        ('Leikkaus · ohjaus · grafiikka', 'Leikkaus, ohjaus, grafiikka', 'TV-sarjat (8 + 7 jaksoa)'),
        ('Animoidut taustat', 'Animoidut lavataustat', 'TV-lähetys, Tallinna'),
        ('Grafiikka · printtimainokset', 'Grafiikka, printtimainokset', 'TV-sarja, 64 jaksoa'),
        ('Grafiikka · Discovery', 'Grafiikka', 'Discovery-sarjat'),
        ('Animaatio · VFX', 'Animaatio, VFX', 'Multimediaesitys, Von Krahlin teatteri'),
        ('VFX', 'VFX', 'Scifi-sarja, 8 jaksoa'),
    ],
}

# Veebilehed järjekorras: (client, type, description)
SITES = {
    'en': {
        'note': 'Websites I have designed and built with a content management system, so the owner can update the content themselves.',
        'items': [
            ('Own project', 'Photography and online shop', 'Clouds photographed in nature, printed on products to order. Cloud series, gallery, online shop and enquiry form; bilingual (ET/EN).'),
            ('Saaremaa motorcycle club Ösel MC', 'Club website', 'Site for the motorcycle club and its annual international MOTOTOOBER rally: news, calendar, gallery, history and a members’ forum.'),
            ('Kuressaare Art School', 'School website', 'New bilingual site with content management: news, teachers, gallery and pages built from content blocks. Galleries migrated from the old site.'),
            ('Mixed folk dance group Kakerdaja', 'Society website', 'Dance group site: news, performances, gallery and joining info. Old posts from 2008 onwards migrated from the blog.'),
            ('Artist Sandra Jõgeva', 'Artist portfolio', 'Portfolio of the artist’s works, exhibitions and press coverage, which the artist can update through a simple admin.'),
            ('Art Container', 'Art project archive', 'Rescue of an old PHP site: 233 pages (ET + EN) migrated with the original look into an editable static site with a CMS.'),
            ('Writer Made Luiga (Mudlum)', 'Author website and bookshop', 'Site of a writer, critic and performer: books, performances, press coverage, news and a bookshop with bank-link payments.'),
            ('Muhu Wine Farm', 'Tourism farm and wine shop', 'New site for the wine farm with bookings and a wine shop: accommodation, restaurant, tastings and Modena payments.'),
            ('Learning environment', '3D learning platform', 'Blender learning environment for students: tutorials, videos, student portfolios, files and messages; with login.'),
        ],
    },
    'fi': {
        'note': 'Verkkosivustot, jotka olen suunnitellut ja toteuttanut sisällönhallinnan kanssa, jotta omistaja voi päivittää sisältöä itse.',
        'items': [
            ('Oma projekti', 'Valokuvaus ja verkkokauppa', 'Luonnossa kuvattuja pilviä tilattaviin tuotteisiin painettuna. Pilvisarjat, galleria, verkkokauppa ja yhteydenottolomake; kaksikielinen (ET/EN).'),
            ('Saarenmaan moottoripyöräkerho Ösel MC', 'Kerhon kotisivu', 'Moottoripyöräkerhon ja sen vuosittaisen kansainvälisen MOTOTOOBER-tapaamisen sivusto: uutiset, kalenteri, galleria, historia ja jäsenten foorumi.'),
            ('Kuressaaren taidekoulu', 'Koulun kotisivu', 'Uusi kaksikielinen sivusto sisällönhallinnalla: uutiset, opettajat, galleria ja sisältölohkoista kootut sivut. Vanhan sivuston galleriat siirretty.'),
            ('Sekakansantanssiryhmä Kakerdaja', 'Yhdistyksen kotisivu', 'Tanssiryhmän sivusto: uutiset, esiintymiset, galleria ja liittymisohjeet. Vanhat kirjoitukset vuodesta 2008 siirretty blogista.'),
            ('Taiteilija Sandra Jõgeva', 'Taiteilijan portfolio', 'Taiteilijan teosten, näyttelyiden ja mediakuvausten portfolio, jota taiteilija voi päivittää yksinkertaisen hallintapaneelin kautta.'),
            ('Art Container', 'Taideprojektin arkisto', 'Vanhan PHP-sivuston pelastus: 233 sivua (ET + EN) siirretty alkuperäisellä ulkoasulla muokattavaksi staattiseksi sivustoksi sisällönhallinnan kera.'),
            ('Kirjailija Made Luiga (Mudlum)', 'Kirjailijan kotisivu ja kirjakauppa', 'Kirjailijan, kriitikon ja esiintyjän sivusto: kirjat, esiintymiset, mediakuvaukset, uutiset ja kirjakauppa pankkimaksuilla.'),
            ('Muhun viinitila', 'Matkailutila ja viinikauppa', 'Viinitilan uusi sivusto varauksineen ja viinikauppoineen: majoitus, ravintola, viininmaistelut ja Modena-maksut.'),
            ('Oppimisympäristö', '3D-oppimisalusta', 'Blenderin oppimisympäristö opiskelijoille: opetusohjelmat, videot, opiskelijoiden portfoliot, tiedostot ja viestit; kirjautumisella.'),
        ],
    },
}

FILES_NOTE = {
    'en': 'Public files below can be downloaded freely. Clients: you will find private files in the client area with your code and password.',
    'fi': 'Alla olevat julkiset tiedostot voi ladata vapaasti. Asiakkaat: yksityiset tiedostot löydät asiakasalueelta koodillasi ja salasanallasi.',
}


def build(lang, et):
    assert len(WORKS[lang]) == len(et['works']), 'works pikkus'
    assert len(SITES[lang]['items']) == len(et['websites']['items']), 'websites pikkus'
    assert len(SECTIONS[lang]) == len(et['sections']), 'sections pikkus'
    return {
        'settings': SETTINGS[lang],
        # id seob tõlke õige sektsiooniga ka siis, kui järjekord adminis muutub
        'sections': [dict(s, id=et['sections'][i]['id']) for i, s in enumerate(SECTIONS[lang])],
        'works': [{'roles': r, 'role': ro, 'type': t} for r, ro, t in WORKS[lang]],
        'websites': {'note': SITES[lang]['note'],
                     'items': [{'client': c, 'type': t, 'description': d} for c, t, d in SITES[lang]['items']]},
        'files': {'note': FILES_NOTE[lang]},
    }


if __name__ == '__main__':
    data = json.load(open(PATH, encoding='utf-8'))
    for lang in ('en', 'fi'):
        data[lang] = build(lang, data['et'])
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('tõlked kirjutatud')
