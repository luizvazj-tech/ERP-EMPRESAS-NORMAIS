/* ===================== Contribuintes individuais, CPRB, SENAI adicional, terceiros por entidade e espelho do EFD-Reinf =====================
   Estimativas de conferência: a apuração oficial é a da DCTFWeb (S-5011/R-5011). Pontos marcados com ** dependem de confirmação em fonte oficial. */
const rfDB=()=>{DB.rf=DB.rf||{};const r=DB.rf;r.ci=r.ci||[];if(!Array.isArray(r.cprb))r.cprb=[];r.nf=r.nf||[];return r;};
const CI_TIPOS={'723':'723 – Sócio/administrador (pró-labore)','721':'721 – Diretor não empregado, com FGTS','722':'722 – Diretor não empregado, sem FGTS','701':'701 – Autônomo (RPA)','741':'741 – Cooperado (cooperativa de trabalho)'};
/* Lei 8.212/1991, art. 22, III (20% a cargo da empresa) e art. 30, §4º c/c Lei 10.666/2003, art. 4º (retenção de 11% limitada ao teto) */
function ciCalc(r,P){P=P||DB.params;const E=DB.empresa||{},v=num(r.valor),teto=num(P.tetoInss),outras=num(r.outras);
  const base=Math.max(0,Math.min(v,teto-outras)),seg=tr2(base*11/100);
  const R=regraLot(E,null,r.comp,P),pat=R.pat?tr2(v*num(E.patronal!=null&&E.patronal!==''?E.patronal:P.patronal)/100*R.fator/100):0;
  const ir=calcIrrf(Math.max(0,v),seg,num(r.dep),0,P,true);
  return{baseInss:base,seg,pat,irrf:ir.irrf,liq:r2(v-seg-ir.irrf),excedeTeto:v>base};}
crud('ciPag',{title:'Contribuintes individuais — pró-labore e autônomos',key:'id',list:()=>rfDB().ci,
  sub:'Apura o INSS do segurado (retenção de 11%, limitada ao teto), a contribuição patronal de 20% e o IRRF. Os valores alimentam a DCTFWeb. A empresa só informa o evento S-1200 (categorias 7XX) no eSocial; este cadastro não gera o XML.',
  note:()=>'<b>Base legal.</b> Retenção do segurado: Lei 10.666/2003, art. 4º, e Lei 8.212/1991, art. 30, §4º (11% do total pago no mês, até o limite máximo do salário de contribuição). Contribuição da empresa: Lei 8.212/1991, art. 22, III (20% sobre as remunerações pagas ao contribuinte individual). <b>Não incidem</b> RAT/GILRAT nem terceiros sobre a remuneração do contribuinte individual (art. 22, II, e art. 3º da Lei 11.457/2007 limitam-se a empregados e avulsos) **. No Simples Nacional (Anexos I–III e V) a patronal já está no DAS; no Anexo IV ela é devida. Cooperado: o adicional do art. 1º, §2º, da Lei 10.666/2003 sobre a nota fiscal da cooperativa <b>não</b> é calculado aqui **.',
  cols:[['comp','Comp.'],['nome','Nome'],['cat','Categoria',r=>esc(r.cat||'')],['valor','Remuneração',r=>'R$ '+brl(r.valor)],['seg','INSS retido',r=>'R$ '+brl(ciCalc(r).seg)],['pat','Patronal 20%',r=>'R$ '+brl(ciCalc(r).pat)],['ir','IRRF',r=>'R$ '+brl(ciCalc(r).irrf)]],
  novo:()=>({comp:DB.cfg.comp,cat:'723',dep:0,outras:0}),
  fields:r=>F('Competência','comp',r.comp,{t:'month',req:1,w:2})+F('Nome','nome',r.nome,{req:1,w:4})+F('CPF','cpf',r.cpf,{req:1,w:3,mask:'cpf'})+F('Categoria (Tabela 1)','cat',r.cat||'723',{t:'select',opts:Object.entries(CI_TIPOS),w:3})+F('Remuneração bruta do mês (R$)','valor',r.valor,{t:'money',req:1,w:3})+F('Remuneração de outras fontes no mês (R$)','outras',r.outras,{t:'money',w:3,hint:'Já sujeita ao INSS em outras empresas/empregos: reduz a base até o teto'})+F('Dependentes (IRRF)','dep',r.dep,{w:2})+(r.valor?`<div class="f w12"><div class="note info">Cálculo: base INSS R$ ${brl(ciCalc(r).baseInss)} · INSS 11% R$ ${brl(ciCalc(r).seg)} · patronal R$ ${brl(ciCalc(r).pat)} · IRRF R$ ${brl(ciCalc(r).irrf)} · líquido R$ ${brl(ciCalc(r).liq)}</div></div>`:''),
  validate:o=>{if(!cpfValido(o.cpf))return 'CPF inválido.';if(!(num(o.valor)>0))return 'Informe a remuneração.';if(!/^\d{4}-\d{2}$/.test(o.comp))return 'Competência inválida.';}});
/* CPRB — Lei 12.546/2011, arts. 7º-A, 8º-A e 9º-A (transição da Lei 14.973/2024): fração da alíquota sobre a receita bruta */
const cprbFracRb=ano=>{const m=(DB.params.cprbRb||{})[ano];return m!=null?m:(ano<2025?100:0);};
crud('cprbRb',{title:'CPRB — contribuição sobre a receita bruta',key:'id',list:()=>rfDB().cprb,
  sub:'Receita bruta mensal por atividade desonerada e alíquota cheia da Lei 12.546/2011. A transição de 2025 a 2027 aplica 80%, 60% e 40% da alíquota (art. 9º-A); a contribuição sobre a folha cresce em paralelo (25%, 50% e 75% dos 20%). A partir de 2028 a CPRB é extinta.',
  note:()=>'<b>Base legal.</b> Lei 12.546/2011, arts. 7º-A, 8º-A, 9º-A e 9º-B, na redação da Lei 14.973/2024. A parcela da folha já é calculada no cálculo mensal (fator '+fatorCprb(DB.params,DB.cfg.comp)+'% da CPP em '+DB.cfg.comp+'). Alíquotas cheias variam de 1,0% a 4,5% por atividade (confira a atividade e o CNAE no art. 7º-A ou 8º-A) **. A receita bruta deve observar as exclusões legais (art. 9º, V e VI) **. Em atividades mistas aplica-se a proporcionalidade do art. 9º, §§ 1º e 13 **, não calculada aqui. Retenção de 11% de cessão de mão de obra para prestador optante: 3,5% (Solução de Consulta Cosit nº 153/2026) **.',
  cols:[['comp','Comp.'],['ativ','Atividade'],['rb','Receita bruta',r=>'R$ '+brl(r.rb)],['aliq','Alíq. cheia %'],['cprb','CPRB devida',r=>'R$ '+brl(cprbVal(r))]],
  novo:()=>({comp:DB.cfg.comp,aliq:2}),
  fields:r=>F('Competência','comp',r.comp,{t:'month',req:1,w:2})+F('Atividade/CNAE desonerado','ativ',r.ativ,{req:1,w:5})+F('Receita bruta do mês (R$)','rb',r.rb,{t:'money',req:1,w:3})+F('Alíquota cheia da atividade (%)','aliq',r.aliq,{req:1,w:2,hint:'Ex.: 1; 1,5; 2; 2,5; 3; 3,5; 4,5'}),
  validate:o=>{if(!(num(o.rb)>=0))return 'Informe a receita bruta.';if(!(num(o.aliq)>0&&num(o.aliq)<=4.5))return 'Alíquota fora do intervalo de 0,1% a 4,5%.';if(!/^\d{4}-\d{2}$/.test(o.comp))return 'Competência inválida.';}});
const cprbVal=r=>tr2(num(r.rb)*num(r.aliq)/100*cprbFracRb(+String(r.comp).slice(0,4))/100);
/* Terceiros por entidade (conferir a tabela do FPAS na IN RFB 2.110/2022) ** */
const TERC_ENT={'507':[['Salário-Educação',2.5],['INCRA',0.2],['SENAI',1.0],['SESI',1.5],['SEBRAE',0.6]],'515':[['Salário-Educação',2.5],['INCRA',0.2],['SENAC',1.0],['SESC',1.5],['SEBRAE',0.6]]};
function fpasPrincipal(comp){const c=DB.comps[comp];if(!c)return '';const m={};Object.keys(c.res||{}).forEach(id=>{const e=byId(DB.empregados,id),l=e&&byId(DB.lotacoes,e.lotacao);if(l&&l.fpas)m[l.fpas]=(m[l.fpas]||0)+1;});return Object.keys(m).sort((a,b)=>m[b]-m[a])[0]||'';}
function tercSplit(valor,fpas){const t=TERC_ENT[String(fpas)];if(!t)return[['Terceiros (FPAS '+(fpas||'?')+': detalhar por entidade) **',valor]];const s=t.reduce((a,x)=>a+x[1],0);let rest=valor;return t.map((x,i)=>{const v=i===t.length-1?r2(rest):r2(valor*x[1]/s);rest=r2(rest-v);return[x[0]+' ('+brl(x[1])+'%)',v];});}
/* gancho chamado por dctfApurar: devolve linhas adicionais e ajusta as de terceiros */
function dctfExtras(comp,L,E){const C=DB.comps[comp],P=DB.params,out=[];if(!C)return out;
  let adM=0,adD=0,senaiBase=0,nEmp=0;const fp=fpasPrincipal(comp);
  for(const id in C.res){const r=C.res[id],e=byId(DB.empregados,id);if(!e)continue;if(String(e.categoria||'')[0]==='1')nEmp++;
    const em=encargosEmpresa(Object.assign({},r,{baseCP13:0}),P,E,e,comp,true),ed=encargosEmpresa(Object.assign({},r,{baseCP:0}),P,E,e,comp,true);adM+=em.adic;adD+=ed.adic;
    const l=byId(DB.lotacoes,e.lotacao);if(l&&['507','833'].includes(String(l.fpas)))senaiBase+=num(r.baseCP)+num(r.baseCP13);}
  adM=tr2(adM);adD=tr2(adD);
  if(adM>0)out.push({cr:'1141-01',desc:'Adicional ao GILRAT — aposentadoria especial (6, 9 ou 12 p.p.) **',grp:'pat',deb:adM,cat:'M',cred:0,creditos:{}});
  if(adD>0)out.push({cr:'1141-21',desc:'Adicional ao GILRAT — 13º salário **',grp:'pat',deb:adD,cat:'D',cred:0,creditos:{}});
  /* SENAI adicional: acima de 500 empregados (Nota Orientativa S-1.3 nº 09/2026; DL 4.048/1942, art. 6º; DL 6.246/1944, art. 3º): 20% sobre a contribuição de 1% ** */
  if(compAtualCmp(comp,'2026-05')>=0&&nEmp>500&&senaiBase>0)out.push({cr:'1664-01',desc:'Contribuição adicional ao SENAI — acima de 500 empregados (20% sobre 1%) **',grp:'terc',deb:tr2(senaiBase*0.2/100),cat:'M',cred:0,creditos:{}});
  /* contribuintes individuais */
  let seg=0,pat=0,ir=0;rfDB().ci.filter(x=>x.comp===comp).forEach(x=>{const c=ciCalc(x);seg+=c.seg;pat+=c.pat;ir+=c.irrf;});seg=tr2(seg);pat=tr2(pat);ir=tr2(ir);
  if(seg>0)out.push({cr:'1082-01',desc:'CP Segurados — contribuintes individuais (retenção de 11%)',grp:'seg',deb:seg,cat:'M',cred:0,creditos:{}});
  if(pat>0)out.push({cr:'1138-01',desc:'CP Patronal — contribuintes individuais (20%) **',grp:'pat',deb:pat,cat:'M',cred:0,creditos:{}});
  if(ir>0)out.push({cr:'0588-**',desc:'IRRF — rendimentos do trabalho sem vínculo (contribuintes individuais): conferir código na tabela da DCTFWeb **',grp:'ir',deb:ir,cat:'M',cred:0,creditos:{}});
  /* CPRB */
  const cp=tr2(rfDB().cprb.filter(x=>x.comp===comp).reduce((a,x)=>a+cprbVal(x),0));
  if(cp>0)out.push({cr:'(CPRB)',desc:'CPRB — contribuição sobre a receita bruta (código a conferir) **',grp:'cprb',deb:cp,cat:'M',cred:0,creditos:{}});
  /* terceiros por entidade: divide a linha agregada */
  for(let i=L.length-1;i>=0;i--){if(L[i].grp==='terc'&&L[i].cr==='(por entidade)'){const l=L[i],parts=tercSplit(l.deb,fp);if(parts.length>1||true){const novos=parts.map(p=>Object.assign({},l,{desc:'CP Terceiros — '+p[0]+(l.cat==='D'?' — 13º salário':''),deb:p[1],creditos:{},cred:0}));L.splice(i,1,...novos);}}}
  return out;}
const compAtualCmp=(a,b)=>a<b?-1:a>b?1:0;
/* Reinf: espelho de R-2060 (CPRB), R-2010/R-2020 (retenção previdenciária em notas) e checklist de fechamento R-2099 */
crud('reinfNf',{title:'EFD-Reinf — notas com retenção previdenciária (R-2010 / R-2020)',key:'id',list:()=>rfDB().nf,
  sub:'Registre as notas de serviços com cessão de mão de obra ou empreitada. Tomador (R-2010): retenção de 11% retida do prestador. Prestador (R-2020): retenção sofrida. A transmissão do Reinf (XML assinado) não é feita por este sistema.',
  note:()=>'<b>Base legal.</b> Lei 8.212/1991, art. 31 (retenção de 11% sobre o valor bruto da nota), com a redação da Lei 9.711/1998; IN RFB 2.110/2022. Prestador optante pela CPRB: retenção de 3,5% (Solução de Consulta Cosit nº 153/2026) **. A retenção sofrida é crédito na DCTFWeb (Lei 9.711/1998), informado na tela de apuração.',
  cols:[['comp','Comp.'],['tipo','Evento',r=>r.tipo==='prest'?'R-2020 (prestador)':'R-2010 (tomador)'],['nome','Parte'],['nf','NF'],['valor','Valor bruto',r=>'R$ '+brl(r.valor)],['aliq','Alíq. %'],['ret','Retenção',r=>'R$ '+brl(r2(num(r.valor)*num(r.aliq)/100))]],
  novo:()=>({comp:DB.cfg.comp,tipo:'tom',aliq:11}),
  fields:r=>F('Competência','comp',r.comp,{t:'month',req:1,w:2})+F('Evento','tipo',r.tipo||'tom',{t:'select',opts:[['tom','R-2010 — sou o tomador (retenho)'],['prest','R-2020 — sou o prestador (sofri retenção)']],w:4})+F('Parte (CNPJ e nome)','nome',r.nome,{req:1,w:6})+F('Nº da nota','nf',r.nf,{req:1,w:3})+F('Valor bruto (R$)','valor',r.valor,{t:'money',req:1,w:3})+F('Alíquota de retenção (%)','aliq',r.aliq,{req:1,w:3,hint:'11 (regra geral); 3,5 se o prestador for optante pela CPRB **'}),
  validate:o=>{if(!(num(o.valor)>0))return 'Informe o valor da nota.';}});
SC.reinfEsp={view(p){const comp=p.comp||DB.cfg.comp,R=rfDB(),nfs=R.nf.filter(x=>x.comp===comp),cps=R.cprb.filter(x=>x.comp===comp),cis=R.ci.filter(x=>x.comp===comp);
  const ret=tp=>r2(nfs.filter(x=>x.tipo===tp).reduce((a,x)=>a+num(x.valor)*num(x.aliq)/100,0)),tom=ret('tom'),pre=ret('prest'),cp=tr2(cps.reduce((a,x)=>a+cprbVal(x),0));
  return `<h1>EFD-Reinf — espelho da competência</h1><p class="sub">Resumo dos eventos que o Reinf exige para a competência e do fechamento (R-2099), conferido contra a folha e a DCTFWeb. <b>Não gera nem transmite o XML do Reinf</b> (assinatura digital e envio ao ambiente nacional) **.</p>
  <div class="card" id="fr"><div class="grid">${F('Competência','comp',comp,{t:'month',w:3})}</div><div class="row"><button class="btn pri" data-act="reinfGo">Atualizar</button></div></div>
  <div class="card"><h2>Eventos periódicos</h2><table><thead><tr><th>Evento</th><th>Descrição</th><th class="r">Registros</th><th class="r">Valor (R$)</th></tr></thead><tbody>
  <tr><td>R-2010</td><td>Retenção de contribuição previdenciária — serviços tomados (11%)</td><td class="r">${nfs.filter(x=>x.tipo==='tom').length}</td><td class="r">${brl(tom)}</td></tr>
  <tr><td>R-2020</td><td>Retenção de contribuição previdenciária — serviços prestados (crédito na DCTFWeb)</td><td class="r">${nfs.filter(x=>x.tipo==='prest').length}</td><td class="r">${brl(pre)}</td></tr>
  <tr><td>R-2060</td><td>Contribuição previdenciária sobre a receita bruta (CPRB)</td><td class="r">${cps.length}</td><td class="r">${brl(cp)}</td></tr>
  <tr><td>S-1200 (eSocial)</td><td>Contribuintes individuais com INSS e IRRF</td><td class="r">${cis.length}</td><td class="r">${brl(tr2(cis.reduce((a,x)=>a+ciCalc(x).seg,0)))}</td></tr></tbody></table></div>
  <div class="card"><h2>Fechamento (R-2099)</h2><div class="note ${(nfs.length||cps.length)?'info':'warn'}">${(nfs.length||cps.length)?'Há movimento a declarar: transmita R-2010/R-2020/R-2060 e, em seguida, o R-2099 (fechamento) até o dia 15 do mês seguinte (prorrogado para o dia útil seguinte) **, para que a DCTFWeb possa ser gerada.':'Sem movimento registrado. Se a empresa não teve operações sujeitas ao Reinf, o fechamento é "sem movimento" **.'} Prazo: <b>${fmtData(esocPrazo15(comp))}</b>. A retenção sofrida de R$ ${brl(pre)} pode ser informada como crédito na apuração da DCTFWeb.</div></div>`;},actions:()=>[]};
ACT.reinfGo=()=>{const o=readForm($('#fr'));go('reinfEsp',{comp:o.comp||DB.cfg.comp});};
