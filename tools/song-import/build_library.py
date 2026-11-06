import json, re, hashlib, sys, collections
from extract import load

src = sys.argv[1]
slides = load(src)
total = len(slides)
warnings = []
orphans = []
runs = []  # {title, section, slides:[(n,text)]}


def body(x):
    return '\n'.join(s['text'] for s in x['shapes'] if s['ph'] not in ('title', 'sldNum'))


def is_index(x):
    return x['n'] <= 15 and any(len(s['text'].split('\n')) > 12 for s in x['shapes'] if s['ph'] not in ('title', 'sldNum'))


prev_key = None
for x in slides:
    n = x['n']
    shapes = x['shapes']
    title = next((s['text'] for s in shapes if s['ph'] == 'title'), None)
    if n == 1 or is_index(x):
        prev_key = None
        continue
    non_num = [s for s in shapes if s['ph'] != 'sldNum']
    if title is not None:
        section, key, t = 'main', ('main', title.strip()), re.sub(r'\s*\n\s*', ' ', title.strip())
        text = body(x)
    elif n >= 1631 and len(non_num) >= 2:
        # untitled section: label is the trailing shape
        t = non_num[-1]['text'].strip()
        text = non_num[0]['text']
        section, key = 'supplement', ('supplement', t)
    else:
        orphans.append(n)
        warnings.append(f'slide {n}: no title/unclassified, skipped')
        prev_key = None
        continue
    if not text.strip():
        orphans.append(n)
        warnings.append(f'slide {n}: empty lyrics under title, skipped')
        continue
    if key != prev_key:
        runs.append({'title': t, 'section': section, 'slides': [], 'nums': []})
    runs[-1]['slides'].append(text)
    runs[-1]['nums'].append(n)
    prev_key = key

songs = []
seen = {}  # content hash -> id
by_title = collections.defaultdict(list)
dups = 0
for r in runs:
    h = hashlib.sha1('\x1f'.join(r['slides']).encode('utf-8')).hexdigest()
    tkey = r['title']
    if (tkey, h) in seen:
        dups += 1
        continue
    seen[(tkey, h)] = True
    by_title[tkey].append(r)
    r['hash'] = h

used = set()
for r in runs:
    if 'hash' not in r:
        continue
    vs = by_title[r['title']]
    idx = vs.index(r) + 1
    base = re.sub(r'[^a-z0-9]+', '-', r['title'].lower()).strip('-') or 'untitled'
    sid = base if len(vs) == 1 else f'{base}-v{idx}'
    while sid in used:
        sid += '-x'
    used.add(sid)
    s = {'id': sid, 'title': r['title'], 'slides': r['slides']}
    if len(vs) > 1:
        s['version'] = idx
        s['versionCount'] = len(vs)
    s['section'] = r['section']
    s['sourceSlides'] = [r['nums'][0], r['nums'][-1]]
    songs.append(s)

multi = sum(1 for v in by_title.values() if len(v) > 1)
if multi:
    warnings.append(f'{multi} titles have multiple distinct versions (kept separately, marked version/versionCount)')

import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data')
os.makedirs(OUT, exist_ok=True)
json.dump({'songs': songs}, open(os.path.join(OUT, 'songs.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
rep = {'totalSlides': total, 'totalSongs': len(songs), 'duplicateSongs': dups,
       'orphanSlides': len(orphans), 'warnings': warnings}
json.dump(rep, open(os.path.join(OUT, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print({k: v for k, v in rep.items() if k != 'warnings'}, 'warnings', len(warnings), 'multiVersionTitles', multi)
print('index/cover skipped', total - sum(len(r['slides']) for r in runs) - len(orphans))
print('slides/song avg', round(sum(len(s['slides']) for s in songs) / len(songs), 2),
      'max', max(len(s['slides']) for s in songs), 'supplement', sum(1 for s in songs if s['section'] == 'supplement'))
