#!/usr/bin/env python3
"""Generador del sitio multilingüe (es en la raíz, de/, en/ y fr/).

Fuente de verdad:
  src/pages/*.html        plantillas (diseño, estructura, JS) con marcadores {{t:clave}}
  src/i18n/es.json        textos en español (clave -> texto)
  src/i18n/de.json        traducciones al alemán  (clave -> {"t": texto, "s": hash del texto es)
  src/i18n/en.json        traducciones al inglés
  src/i18n/fr.json        traducciones al francés
  src/data.json           datos compartidos (precios)

Uso:
  python3 build.py                 genera todo y muestra qué falta traducir
  python3 build.py --plain         solo español, sin añadidos (para comprobar que coincide con el sitio)
  python3 build.py --status        solo informe de traducciones
  python3 build.py --import de f.json   importa traducciones {clave: texto} (calcula el hash del español)
"""
import json, os, re, sys, html, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
SITE = 'https://clastours.ch'
LANGS = ['es', 'de', 'en', 'fr']
PAGES = ['index', 'clastours-caminatas-v4', 'clastours-calendario', 'clastours-contacto',
         'clastours-nosotros', 'clastours-legal', 'guia-creux-du-van', 'guia-kandersteg-bluemlisalphutte']
LOCALE = {'es': 'es_LA', 'de': 'de_CH', 'en': 'en_US', 'fr': 'fr_CH'}
THOUSANDS = {'es': '.', 'de': '’', 'en': ',', 'fr': '’'}

def load(p, default=None):
    p = os.path.join(SRC, p)
    if not os.path.exists(p): return default
    return json.load(open(p, encoding='utf-8'))

def h(text): return hashlib.sha1(text.encode('utf-8')).hexdigest()[:8]

def fmt_num(n, lang):
    s = '{:,}'.format(n)
    return s.replace(',', THOUSANDS[lang])

class Strings:
    def __init__(self):
        self.es = load('i18n/es.json')
        self.tr = {l: load('i18n/%s.json' % l, {}) for l in LANGS if l != 'es'}
        self.missing = {l: set() for l in self.tr}
        self.stale = {l: set() for l in self.tr}
    def get(self, lang, key):
        if key not in self.es: raise KeyError('clave inexistente: ' + key)
        if lang == 'es': return self.es[key]
        e = self.tr[lang].get(key)
        if e is None:
            self.missing[lang].add(key); return self.es[key]
        if e.get('s') != h(self.es[key]): self.stale[lang].add(key)
        return e['t']

def json_escape(s):
    return json.dumps(s, ensure_ascii=False)[1:-1]

# Banderas en SVG (los emojis de bandera no se ven en Windows)
FLAGS = {
 'es': '<svg class="fl" viewBox="0 0 18 12" aria-hidden="true"><rect width="18" height="12" fill="#003893"/><rect width="18" height="6" fill="#FCD116"/><rect y="9" width="18" height="3" fill="#CE1126"/></svg>',
 'de': '<svg class="fl" viewBox="0 0 18 12" aria-hidden="true"><rect width="18" height="12" fill="#D52B1E"/><path d="M7.5 2.5h3v2.5h2.5v3h-2.5v2.5h-3V8H5V5h2.5z" fill="#fff"/></svg>',
 'en': '<svg class="fl" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="7"/></svg>',
 'fr': '<svg class="fl" viewBox="0 0 18 12" aria-hidden="true"><rect width="18" height="12" fill="#ED2939"/><rect width="12" height="12" fill="#fff"/><rect width="6" height="12" fill="#002395"/></svg>',
}

# Envío de solicitudes: va a un script de Google (hoja + emails). Sin endpoint configurado, cae al WhatsApp de siempre.
CT_JS = (
 "CT.send=function(d){d.lang=CT.lang;d.page=location.pathname;d.sent=new Date().toISOString();"
 "return fetch(CT.endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(d)});};"
 "CT.notice=function(title,text,waUrl){var o=document.createElement('div');o.className='ct-notice';"
 "o.innerHTML='<div class=\"ct-notice-box\" role=\"dialog\" aria-modal=\"true\"><h3></h3><p></p><div class=\"ct-notice-btns\"></div></div>';"
 "o.querySelector('h3').textContent=title;o.querySelector('p').textContent=text;var bt=o.querySelector('.ct-notice-btns');"
 "if(waUrl){var a=document.createElement('a');a.href=waUrl;a.target='_blank';a.rel='noopener';a.className='ct-notice-wa';a.textContent=L('js.sent.wa');bt.appendChild(a);}"
 "var c=document.createElement('button');c.type='button';c.textContent=L('js.sent.close');c.onclick=function(){o.remove();};bt.appendChild(c);"
 "o.onclick=function(e){if(e.target===o)o.remove();};document.body.appendChild(o);};"
 "CT.submit=function(d,waUrl,opt){opt=opt||{};if(!CT.endpoint){window.open(waUrl,'_blank');if(opt.okCb)opt.okCb('wa');return;}"
 "if(opt.btn)opt.btn.disabled=true;"
 "CT.send(d).then(function(){if(opt.okCb)opt.okCb('ok');else CT.notice(L('js.sent.title'),L('js.sent.text'),waUrl);})"
 ".catch(function(){CT.notice(L('js.fail.title'),L('js.fail.text'),waUrl);})"
 ".then(function(){if(opt.btn)opt.btn.disabled=false;});};"
)
CT_CSS = ('.ct-notice{position:fixed;inset:0;background:rgba(10,30,42,.72);display:flex;align-items:center;justify-content:center;z-index:99999;padding:1rem}'
 '.ct-notice-box{background:#fff;color:#1a2a33;max-width:420px;width:100%;border-radius:8px;padding:1.75rem;font-family:inherit;text-align:center}'
 '.ct-notice-box h3{margin:0 0 .6rem;font-size:1.25rem;color:#0F3D52}.ct-notice-box p{margin:0 0 1.2rem;line-height:1.55;font-size:.95rem}'
 '.ct-notice-btns{display:flex;flex-direction:column;gap:.6rem}.ct-notice-btns button,.ct-notice-btns a{display:block;padding:.7rem 1rem;border-radius:4px;border:0;font:inherit;font-size:.9rem;cursor:pointer;text-decoration:none}'
 '.ct-notice-btns button{background:#A8704A;color:#fff}.ct-notice-wa{background:#25D366;color:#fff}')

def render(page, lang, S, data, plain=False):
    t = open(os.path.join(SRC, 'pages', page + '.html'), encoding='utf-8').read()
    # --- textos
    t = re.sub(r'\{\{t:([^}]+)\}\}', lambda m: S.get(lang, m.group(1)), t)
    t = re.sub(r'\{\{w:([^}]+)\}\}', lambda m: __import__('urllib.parse', fromlist=['quote']).quote(S.get(lang, m.group(1)), safe=''), t)
    t = re.sub(r'\{\{j:([^}]+)\}\}', lambda m: json_escape(re.sub(r'<[^>]+>', '', html.unescape(S.get(lang, m.group(1))))), t)
    t = t.replace('{{lang}}', lang)
    # --- precios
    P = data['prices']
    t = re.sub(r'\{\{p\.(\w+)\}\}', lambda m: fmt_num(P[m.group(1)]['p'], lang), t)
    t = re.sub(r'\{\{g\.(\w+)\}\}', lambda m: fmt_num(P[m.group(1)]['g'], lang), t)
    t = re.sub(r'\{\{t\.(\w+)\.(\d+)\}\}', lambda m: fmt_num(P[m.group(1)]['p'] * int(m.group(2)), lang), t)
    if plain: return t
    # --- cadenas de JS
    js = {k: S.get(lang, k) for k in S.es if k.startswith('js.')}
    inject = '<script>window.I18N=%s;</script>\n' % json.dumps(js, ensure_ascii=False).replace('</', '<\\/')
    inject += '<script>window.CT=%s;%s</script>\n' % (json.dumps({'endpoint': data.get('booking', {}).get('endpoint', ''), 'lang': lang}), CT_JS)
    # --- idioma, SEO
    t = re.sub(r'<html lang="[^"]*"', '<html lang="%s"' % lang, t, count=1)
    t = re.sub(r'(<meta property="og:locale" content=")[^"]*"', r'\g<1>%s"' % LOCALE[lang], t)
    m = re.search(r'<link rel="canonical" href="([^"]+)">', t)
    if m:
        es_url = m.group(1)
        path = es_url[len(SITE) + 1:]
        alts = ''.join('\n<link rel="alternate" hreflang="%s" href="%s">' % (l, SITE + '/' + ('' if l == 'es' else l + '/') + path) for l in LANGS)
        alts += '\n<link rel="alternate" hreflang="x-default" href="%s">' % es_url
        t = t.replace(m.group(0), m.group(0) + alts, 1)
    # --- selector de idioma
    cur = re.search(r'<link rel="canonical" href="%s/([^"]*)">' % re.escape(SITE), t)
    path = cur.group(1) if cur else ''
    def lurl(l): return '/' + ('' if l == 'es' else l + '/') + path
    sw = '<div class="lang-switch" role="navigation" aria-label="Idioma / Sprache / Language / Langue">' + ''.join(
        '<a href="%s" hreflang="%s" lang="%s"%s>%s%s</a>' % (lurl(l), l, l, ' class="active" aria-current="true"' if l == lang else '', FLAGS[l], l.upper()) for l in LANGS) + '</div>'
    css = '<style>.lang-switch{display:flex;align-items:center;gap:.1rem;margin:0 1rem 0 auto;font-family:inherit;font-size:.72rem;letter-spacing:.08em}.lang-switch a{color:rgba(255,255,255,.62);text-decoration:none;padding:.25rem .4rem;border-bottom:1px solid transparent}.lang-switch a{display:inline-flex;align-items:center;gap:.35rem}.lang-switch .fl{width:18px;height:12px;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.25);opacity:.8}.lang-switch a.active .fl,.lang-switch a:hover .fl{opacity:1}.lang-switch a:hover{color:#fff}.lang-switch a.active{color:#fff;border-bottom-color:#C48A62}.nav>.logo,.nav>.nav-logo,.ct-nav>.ct-logo,.ct-nav>.ct-nav-logo{margin-right:2rem}@media(max-width:768px){.lang-switch{margin:0 .4rem 0 auto;gap:0}.lang-switch a{font-size:0;gap:0;padding:.25rem .3rem}}' + CT_CSS + '</style>\n'
    if re.search(r'<a [^>]*class="(?:ct-)?nav-cta"', t):
        t = re.sub(r'(<a [^>]*class="(?:ct-)?nav-cta")', sw + r'\n  \1', t, count=1)
    else:
        t = t.replace('</nav>', sw + '\n</nav>', 1)
    t = t.replace('</head>', css + inject + '</head>', 1)
    if lang != 'es':
        # rutas de recursos (imágenes, etc.) relativas -> absolutas, porque las páginas viven en /de/, /en/ y /fr/
        def abs_asset(m):
            attr, q, val = m.group(1), m.group(2), m.group(3)
            if re.match(r'(?:[a-z]+:|//|/|#|\{)', val) or val.endswith('.html') or '.html#' in val or val == '': return m.group(0)
            return '%s=%s/%s' % (attr, q, val + q) if False else '%s=%s/%s%s' % (attr, q, val, q)
        t = re.sub(r'\b(src|poster)=(["\'])([^"\']*)\2', lambda m: abs_asset(m) if True else m.group(0), t)
        # URLs absolutas de páginas del sitio -> versión del idioma (canonical, og:url, JSON-LD)
        _rw = re.compile(r'%s/((?:index|clastours-[a-z0-9-]+|guia-[a-z0-9-]+)\.html|)(?=["#])' % re.escape(SITE))
        # los <link hreflang> conservan su propio idioma: no se reescriben
        t = '\n'.join(ln if 'hreflang=' in ln and 'rel="alternate"' in ln else _rw.sub(SITE + '/' + lang + '/' + r'\1', ln) for ln in t.split('\n'))
    return t

def outpath(page, lang):
    d = ROOT if lang == 'es' else os.path.join(ROOT, lang)
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, page + '.html')

def report(S):
    ok = True
    for l in S.tr:
        total = len([k for k in S.es])
        miss = [k for k in S.es if k not in S.tr[l]]
        stale = [k for k in S.es if k in S.tr[l] and S.tr[l][k].get('s') != h(S.es[k])]
        print('[%s] %d/%d traducidos · faltan %d · desactualizados %d' % (l, total - len(miss), total, len(miss), len(stale)))
        if miss or stale: ok = False
        for k in (miss + stale)[:15]: print('   -', k)
        if len(miss + stale) > 15: print('   ... y %d más' % (len(miss + stale) - 15))
    return ok

def build_sitemap():
    """Regenera sitemap.xml: cada URL en español con sus alternativas /de/, /en/ y /fr/ (hreflang)."""
    p = os.path.join(ROOT, 'sitemap.xml')
    xml = open(p, encoding='utf-8').read()
    ents = re.findall(r'<url>\s*<loc>([^<]+)</loc>(.*?)</url>', xml, flags=re.S)
    seen, rows = set(), []
    for loc, rest in ents:
        path = loc[len(SITE) + 1:]
        if path.startswith(('de/', 'en/', 'fr/')): continue
        if path in seen: continue
        seen.add(path)
        lm = re.search(r'<lastmod>[^<]+</lastmod>', rest); pr = re.search(r'<priority>[^<]+</priority>', rest)
        rows.append((path, lm.group(0) if lm else '', pr.group(0) if pr else ''))
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for path, lm, pr in rows:
        for l in LANGS:
            u = SITE + '/' + ('' if l == 'es' else l + '/') + path
            alts = ''.join('\n    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (x, SITE + '/' + ('' if x == 'es' else x + '/') + path) for x in LANGS)
            alts += '\n    <xhtml:link rel="alternate" hreflang="x-default" href="%s/%s"/>' % (SITE, path)
            out.append('  <url>\n    <loc>%s</loc>%s%s%s%s\n  </url>' % (u, ('\n    ' + lm) if lm else '', ('\n    ' + pr) if pr else '', alts, ''))
    out.append('</urlset>\n')
    open(p, 'w', encoding='utf-8').write('\n'.join(out))

def main():
    a = sys.argv[1:]
    S = Strings(); data = load('data.json')
    if a[:1] == ['--import']:
        lang, f = a[1], a[2]
        cur = load('i18n/%s.json' % lang, {})
        new = json.load(open(f, encoding='utf-8'))
        for k, v in new.items():
            if k not in S.es: print('clave desconocida, se omite:', k); continue
            cur[k] = {'t': (S.es[k] if v == '=' else v), 's': h(S.es[k])}
        json.dump(cur, open(os.path.join(SRC, 'i18n/%s.json' % lang), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(lang, 'importadas', len(new)); return
    if a[:1] == ['--status']:
        report(S); return
    plain = a[:1] == ['--plain']
    langs = ['es'] if plain else LANGS
    for lang in langs:
        for p in PAGES:
            out = render(p, lang, S, data, plain)
            if plain:
                out_dir = a[1] if len(a) > 1 else os.path.join(ROOT, '_plain'); os.makedirs(out_dir, exist_ok=True)
                open(os.path.join(out_dir, p + '.html'), 'w', encoding='utf-8').write(out)
            else:
                open(outpath(p, lang), 'w', encoding='utf-8').write(out)
    if not plain:
        build_sitemap()
        report(S)

if __name__ == '__main__':
    main()
