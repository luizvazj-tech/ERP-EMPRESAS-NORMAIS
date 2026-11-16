#!/usr/bin/env python3
"""Converte os .md de docs/ em .docx (Times New Roman 12, 1,5, justificado, cabeçalho/rodapé com página)."""
import subprocess, sys, os, glob, re
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','docs')
REF='/tmp/ref_fp.docx'
def mkref():
    subprocess.check_call(['pandoc','-o',REF,'--print-default-data-file','reference.docx']) if False else open(REF,'wb').write(subprocess.check_output(['pandoc','--print-default-data-file','reference.docx']))
    d=Document(REF)
    def S(n):
        for x in d.styles:
            if x.name and x.name.lower()==n.lower(): return x
        raise KeyError(n)
    def fnt(st,size=None,bold=None,italic=None):
        st.font.name='Times New Roman';st.font.color.rgb=RGBColor(0,0,0)
        rpr=st.element.get_or_add_rPr();rf=rpr.find(qn('w:rFonts'))
        if rf is None: rf=OxmlElement('w:rFonts');rpr.append(rf)
        for a in ('w:ascii','w:hAnsi','w:cs','w:eastAsia'): rf.set(qn(a),'Times New Roman')
        for a in ('w:asciiTheme','w:hAnsiTheme','w:cstheme','w:eastAsiaTheme'):
            if rf.get(qn(a)) is not None: del rf.attrib[qn(a)]
        if size: st.font.size=Pt(size)
        if bold is not None: st.font.bold=bold
        if italic is not None: st.font.italic=italic
    for n in ('Normal','Body Text','First Paragraph','Compact','Block Text'):
        try:
            st=S(n);fnt(st,12)
            pf=st.paragraph_format;pf.line_spacing=1.5;pf.space_after=Pt(6);pf.space_before=Pt(0)
            if n!='Compact': st.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
        except KeyError: pass
    for n,sz in (('Heading 1',14),('Heading 2',12),('Heading 3',12),('Heading 4',12)):
        st=S(n);fnt(st,sz,True,False);pf=st.paragraph_format;pf.space_before=Pt(14);pf.space_after=Pt(6);pf.keep_with_next=True;pf.line_spacing=1.15;pf.alignment=WD_ALIGN_PARAGRAPH.LEFT
    t=S('Title');fnt(t,14,True);t.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER;t.paragraph_format.space_after=Pt(6)
    s=S('Subtitle');fnt(s,11,False,True);s.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER;s.paragraph_format.space_after=Pt(14)
    try:
        c=S('Source Code');c.font.name='Courier New';c.font.size=Pt(9);c.paragraph_format.line_spacing=1.0
    except KeyError: pass
    sec=d.sections[0];sec.page_width=Cm(21);sec.page_height=Cm(29.7);sec.left_margin=Cm(3);sec.right_margin=Cm(2);sec.top_margin=Cm(3);sec.bottom_margin=Cm(2)
    d.save(REF)
def fld(run,code):
    for t,txt in (('begin',None),(None,code),('end',None)):
        if t:
            e=OxmlElement('w:fldChar');e.set(qn('w:fldCharType'),t);run._r.append(e)
        else:
            i=OxmlElement('w:instrText');i.set(qn('xml:space'),'preserve');i.text=txt;run._r.append(i)
def borders(tbl):
    tblPr=tbl._tbl.tblPr;b=OxmlElement('w:tblBorders')
    for k in ('top','left','bottom','right','insideH','insideV'):
        e=OxmlElement('w:'+k);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'000000');b.append(e)
    tblPr.append(b)
def post(path,titulo):
    d=Document(path)
    for tb in d.tables:
        borders(tb)
        for ri,row in enumerate(tb.rows):
            for c in row.cells:
                for p in c.paragraphs:
                    p.paragraph_format.line_spacing=1.0;p.paragraph_format.space_after=Pt(2);p.alignment=WD_ALIGN_PARAGRAPH.LEFT
                    for r in p.runs:
                        r.font.size=Pt(9.5);r.font.name='Times New Roman'
                        if ri==0:r.font.bold=True
            if ri==0:
                for c in row.cells:
                    sh=OxmlElement('w:shd');sh.set(qn('w:val'),'clear');sh.set(qn('w:fill'),'E7E7E7');c._tc.get_or_add_tcPr().append(sh)
    sec=d.sections[0]
    hp=sec.header.paragraphs[0];hp.text=titulo[:110];hp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    for r in hp.runs:r.font.size=Pt(9);r.font.name='Times New Roman'
    fp=sec.footer.paragraphs[0];fp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    r=fp.add_run('Página ');r.font.size=Pt(9);r2=fp.add_run();fld(r2,'PAGE');r2.font.size=Pt(9);r3=fp.add_run(' de ');r3.font.size=Pt(9);r4=fp.add_run();fld(r4,'NUMPAGES');r4.font.size=Pt(9)
    d.save(path)
def main():
    mkref();n=0
    for md in sorted(glob.glob(ROOT+'/*.md')+glob.glob(ROOT+'/juridico/*.md')+glob.glob(ROOT+'/manuais/*.md')):
        out=md[:-3]+'.docx'
        src=open(md,encoding='utf8').read()
        m=re.match(r'(?s)(---\n.*?\n---\n)(.*)',src);hd,bd=(m.group(1),m.group(2)) if m else ('',src)
        bd=re.sub(r'(?m)(?<=\s)\*\*(?=[\s.,;:)\]|]|$)',r'\\*\\*',bd);src=hd+bd
        tmp='/tmp/_fp_src.md';open(tmp,'w',encoding='utf8').write(src)
        subprocess.check_call(['pandoc',tmp,'-o',out,'--reference-doc='+REF,'-f','markdown+pipe_tables+yaml_metadata_block'])
        t=re.search(r'^title:\s*"(.*)"',open(md,encoding='utf8').read(),re.M)
        post(out,(t.group(1) if t else os.path.basename(md)));n+=1
    print('DOCX gerados:',n)
main()
