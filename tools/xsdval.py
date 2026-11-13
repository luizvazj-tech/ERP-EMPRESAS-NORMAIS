import sys,os,re,glob,collections
from lxml import etree
XD=sys.argv[1]; OUT='/home/claude/xsd/out'
cache={}
def schema(name):
    if name not in cache: cache[name]=etree.XMLSchema(etree.parse(os.path.join(XD,name+'.xsd')))
    return cache[name]
res=collections.defaultdict(list); ok=collections.Counter(); tot=collections.Counter()
for f in sorted(glob.glob(OUT+'/*.xml')):
    reg,tipo,_=os.path.basename(f)[:-4].split('__')
    doc=etree.parse(f); ns=doc.getroot().tag
    DS='http://www.w3.org/2000/09/xmldsig#'
    if doc.getroot().find('{%s}Signature'%DS) is None:
        sg=etree.fromstring('<Signature xmlns="%s"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>AAAA</DigestValue></Reference></SignedInfo><SignatureValue>AAAA</SignatureValue><KeyInfo><X509Data><X509Certificate>AAAA</X509Certificate></X509Data></KeyInfo></Signature>'%DS)
        doc.getroot().append(sg)
    m=re.search(r'evt/(\w+)/v_S',ns)
    if not m: res[(tipo,'?')].append((reg,'namespace inesperado '+ns)); continue
    sc=schema(m.group(1)); tot[tipo]+=1
    if sc.validate(doc): ok[tipo]+=1
    else:
        for e in sc.error_log:
            msg=re.sub(r'\{[^}]*\}','',e.message)
            res[(tipo,msg)].append((reg,e.line))
print('POR EVENTO (válidos/total):')
for t in sorted(tot): print(' ',t,ok[t],'/',tot[t])
print('\nERROS DISTINTOS:')
for (t,m),v in sorted(res.items()):
    regs=sorted(set(r for r,_ in v)); print(f'[{t}] ({len(v)}x; {",".join(regs)}) {m[:330]}')
