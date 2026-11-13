import sys
from lxml import etree
X='{http://www.w3.org/2001/XMLSchema}'
D='/home/claude/xsd/a/'
tip=etree.parse(D+'tipos.xsd')
types={c.get('name'):c for c in tip.getroot() if c.tag in (X+'complexType',X+'simpleType')}
def enum(st):
    v=[e.get('value') for e in st.iter(X+'enumeration')]
    return v
def simple_info(el):
    st=el.find(X+'simpleType')
    t=el.get('type')
    if st is None and t and t in types and types[t].tag==X+'simpleType': st=types[t]
    if st is None: return t or ''
    r=st.find(X+'restriction'); out=(r.get('base') if r is not None else '')
    e=enum(st)
    if e: out+=' enum='+'|'.join(e[:14])
    if r is not None:
        for p in r:
            if p.tag in (X+'pattern',X+'maxLength',X+'minLength',X+'length'): out+=' '+p.tag.replace(X,'')+'='+p.get('value')
    return (t+' ' if t else '')+out
def pr(node,ind,maxd):
    for c in node:
        if c.tag==X+'element':
            nm=c.get('name') or c.get('ref')
            occ=f"{c.get('minOccurs','1')}..{c.get('maxOccurs','1')}"
            t=c.get('type')
            ct=c.find(X+'complexType')
            if ct is None and t in types and types[t].tag==X+'complexType': ct=types[t]
            if ct is not None:
                print('  '*ind+f"{nm} [{occ}]"+(f" <{t}>" if t else ''))
                if ind<maxd: pr(ct,ind+1,maxd)
            else:
                print('  '*ind+f"{nm} [{occ}] {simple_info(c)}")
        elif c.tag in (X+'sequence',X+'all'): pr(c,ind,maxd)
        elif c.tag==X+'choice':
            print('  '*ind+f"(CHOICE {c.get('minOccurs','1')}..{c.get('maxOccurs','1')})"); pr(c,ind+1,maxd)
        elif c.tag in (X+'complexType',X+'complexContent',X+'extension'): pr(c,ind,maxd)
fn,root=sys.argv[1],sys.argv[2]; maxd=int(sys.argv[3]) if len(sys.argv)>3 else 9
t=etree.parse(D+fn)
for c in t.getroot():
    if c.tag in (X+'complexType',X+'simpleType'): types[c.get('name')]=c
for e in t.iter(X+'element'):
    if e.get('name')==root:
        pr(e,0,maxd);break
