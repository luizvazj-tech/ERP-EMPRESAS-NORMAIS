import glob,os,re,collections
from lxml import etree
OUT='/home/claude/xsd/out'; NS=lambda t:'{*}'+t
def val(e,t):
    x=e.find('.//'+NS(t)); return x.text if x is not None else None
def inss(b):
    b=min(b,8475.55);f=[(1621,7.5),(2902.84,9),(4354.27,12),(8475.55,14)];p=0;t=0
    for l,a in f:
        if b>p:t+=(min(b,l)-p)*a/100
        p=l
    return round(t+1e-9,2)
def imposto(b):
    for l,a,d in [(2428.80,0,0),(2826.65,7.5,182.16),(3751.05,15,394.16),(4664.68,22.5,675.49),(1e12,27.5,908.73)]:
        if b<=l:return max(0,round(b*a/100-d,2))
def irrf(rend,inss_,ndep):
    bl=max(0,rend-inss_-ndep*189.59);bs=max(0,rend-607.20);imp=min(imposto(bl),imposto(bs))
    red=imp if rend<=5000 else (min(imp,max(0,978.62-0.133145*rend)) if rend<7350 else 0)
    return round(max(0,imp-red),2)
probs=[];n=0
for reg in ['sn','sn4','lp','lr','lpcprb']:
    fs=glob.glob(f'{OUT}/{reg}__*.xml')
    rub={}
    for f in fs:
        if '__S-1010__' in f:
            d=etree.parse(f).getroot()
            rub[val(d,'codRubr')]=dict(tp=int(val(d,'tpRubr')),cp=val(d,'codIncCP'),ir=val(d,'codIncIRRF'),fg=val(d,'codIncFGTS'),nat=val(d,'natRubr'))
    deps={}
    for f in fs:
        if '__S-2200__' in f:
            d=etree.parse(f).getroot(); deps[val(d,'cpfTrab')]=sum(1 for x in d.iter(NS('dependente')) if val(x,'depIRRF')=='S')
    liq={}
    for f in fs:
        if '__S-1210__' in f:
            d=etree.parse(f).getroot(); liq[val(d,'cpfBenef')]=float(val(d,'vrLiq'))
    for f in fs:
        if '__S-1200__' in f:
            d=etree.parse(f).getroot(); cpf=val(d,'cpfTrab'); n+=1
            ven=des=0;base_cp=0;base_ir=0;i_inss=0;i_ir=0
            for it in d.iter(NS('itensRemun')):
                r=rub[val(it,'codRubr')];v=float(val(it,'vrRubr'))
                if r['tp']==1:ven+=v
                if r['tp']==2:des+=v
                if r['cp'] in('11','12'):base_cp+= v if r['tp']==1 else -v
                if r['ir'] in('11','12','13'):base_ir+= v if r['tp']==1 else -v
                if r['nat']=='9201':i_inss+=v
                if r['nat']=='9203':i_ir+=v
            # líquido x S-1210
            if cpf in liq and abs((ven-des)-liq[cpf])>0.011:probs.append(f'{reg} {cpf}: líquido do S-1200 {ven-des:.2f} difere do vrLiq do S-1210 {liq[cpf]:.2f}')
            ri=inss(base_cp)
            if abs(ri-i_inss)>0.011:probs.append(f'{reg} {cpf}: INSS informado {i_inss:.2f} x recálculo {ri:.2f} (base CP {base_cp:.2f})')
            rr=irrf(base_ir,ri,deps.get(cpf,0))
            if abs(rr-i_ir)>0.011:probs.append(f'{reg} {cpf}: IRRF informado {i_ir:.2f} x recálculo {rr:.2f} (rend. trib. {base_ir:.2f}, dep {deps.get(cpf,0)})')
print('S-1200 conferidos:',n); print('\n'.join(sorted(set(probs))) or 'sem divergência')
