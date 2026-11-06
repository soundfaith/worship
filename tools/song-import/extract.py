import zipfile, re, json, sys, collections
import xml.etree.ElementTree as etree

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def slide_order(z):
    pres = etree.fromstring(z.read('ppt/presentation.xml'))
    rels = etree.fromstring(z.read('ppt/_rels/presentation.xml.rels'))
    rmap = {r.get('Id'): r.get('Target') for r in rels}
    out = []
    for s in pres.findall('.//p:sldId', NS):
        t = rmap[s.get('{%s}id' % NS['r'])]
        out.append('ppt/' + t.lstrip('/').replace('ppt/', '', 1) if not t.startswith('/') else t.lstrip('/'))
    return out


def parse_slide(xml):
    root = etree.fromstring(xml)
    shapes = []
    for sp in root.findall('.//p:sp', NS):
        ph = sp.find('.//p:nvPr/p:ph', NS)
        phtype = ph.get('type') if ph is not None else None
        paras = []
        for p in sp.findall('.//a:p', NS):
            s = ''
            for el in p.iter():
                tag = el.tag.split("}")[-1]
                if tag == 't':
                    s += el.text or ''
                elif tag == 'br':
                    s += '\n'
            paras.append(s)
        text = '\n'.join(paras).strip('\n')
        if text.strip():
            shapes.append({'ph': phtype, 'text': text})
    return shapes


def load(path):
    z = zipfile.ZipFile(path)
    slides = []
    for i, name in enumerate(slide_order(z), 1):
        slides.append({'n': i, 'shapes': parse_slide(z.read(name))})
    return slides


if __name__ == '__main__':
    slides = load(sys.argv[1])
    json.dump(slides, open('raw_slides.json', 'w', encoding='utf-8'), ensure_ascii=False)
    c = collections.Counter()
    for s in slides:
        c[(len(s['shapes']), tuple(sh['ph'] for sh in s['shapes']))] += 1
    print(len(slides))
    for k, v in c.most_common(12):
        print(v, k)

