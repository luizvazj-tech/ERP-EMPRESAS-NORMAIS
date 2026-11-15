/* ===================== DARF (espelho para pagamento) e calendário de feriados ===================== */
function darfLinhas(comp,pag,selic){
  const A=dctfApurar(comp);if(!A)return null;
  const venc=vencGuia(comp,DB.params.venc.inss),m={};
  A.L.forEach(l=>{if(l.saldo<=0)return;const k=l.cr+'|'+l.cat;m[k]=m[k]||{cr:l.cr,cat:l.cat,descs:[],valor:0};m[k].descs.push(l.desc);m[k].valor=r2(m[k].valor+l.saldo);});
  const out=Object.values(m).map(x=>{const mo=pag&&pag>venc?moraCalc({valor:x.valor,venc,pag,selic}):{dias:0,multa:0,juros:0,total:x.valor};
    return{cr:x.cr,cat:x.cat,desc:x.descs.join('; '),pa:comp,venc,principal:x.valor,multa:mo.multa,juros:mo.juros,total:mo.total,dias:mo.dias,semCod:/^\(/.test(x.cr)};});
  return{L:out,venc,total:r2(out.reduce((a,l)=>a+l.total,0)),A};}
function darfHTML(comp,d,pag){const E=DB.empresa||{},cnpj=fmtCNPJ(E.cnpj||'');
  return d.L.map(l=>`<div class="card" style="page-break-inside:avoid"><h3>DARF — ${esc(l.semCod?'código a definir **':l.cr)}${l.cat==='D'?' (13º salário)':''}</h3><p class="sub">${esc(l.desc)}</p>
  <table><tbody><tr><th>01 Nome</th><td>${esc(E.razao||'')}</td><th>03 CNPJ</th><td>${cnpj}</td></tr>
  <tr><th>02 Período de apuração</th><td>${esc(compLabel(l.pa))}</td><th>04 Código da receita</th><td>${esc(l.semCod?'** conforme entidade/FPAS':l.cr)}</td></tr>
  <tr><th>05 Número de referência</th><td>— (gerado pela RFB na emissão)</td><th>06 Vencimento</th><td>${fmtData(l.venc)}</td></tr>
  <tr><th>07 Valor do principal</th><td class="r">${brl(l.principal)}</td><th>08 Multa</th><td class="r">${brl(l.multa)}</td></tr>
  <tr><th>09 Juros/encargos</th><td class="r">${brl(l.juros)}</td><th>10 Valor total</th><td class="r"><b>${brl(l.total)}</b></td></tr></tbody></table>
  ${l.dias?`<p class="sub">Pagamento em ${fmtData(pag)}: ${l.dias} dia(s) de atraso — multa de mora de 0,33% ao dia (teto de 20%) e juros Selic + 1% (estimativa; o sistema da RFB calcula o valor oficial).</p>`:''}</div>`).join('');}
SC.darf={view(p){const comp=p.comp||DB.cfg.comp,q=p.q||{},pag=q.pag||'',selic=q.selic||0,d=darfLinhas(comp,pag,selic);
  return `<h1>DARF — espelho para pagamento</h1><p class="sub">Monta os dados de cada DARF da competência a partir da apuração da DCTFWeb. <b>Este documento não é o DARF oficial nem transmite a declaração:</b> o DARF numerado só é emitido pela Receita Federal após a transmissão da DCTFWeb (e-CAC) ou pelo Sicalcweb; use este espelho para conferir valores, códigos e vencimento. Transmissão pelo sistema depende de certificado digital e e-CAC (ou Serpro Integra Contador contratado).</p>
  <div class="card" id="fd"><div class="grid">${F('Competência','comp',comp,{t:'month',w:3})+F('Data prevista de pagamento (para acréscimos)','pag',pag,{t:'date',w:3})+F('Selic acumulada (%)','selic',selic||'',{w:3,hint:'Mês seguinte ao vencimento até o mês anterior ao do pagamento'})}</div><div class="row"><button class="btn pri" data-act="darfCalc">Atualizar</button>${d?'<button class="btn" data-act="darfImp">Imprimir</button>':''}</div></div>
  ${d&&d.L.length?`<div class="note info">Vencimento: <b>${fmtData(d.venc)}</b> (dia ${DB.params.venc.inss}, antecipado para o dia útil anterior, considerados feriados nacionais e móveis). Total dos DARFs: <b>R$ ${brl(d.total)}</b>. O FGTS (R$ ${brl(d.A.fgts)}) é recolhido pelo FGTS Digital, fora deste documento.</div>${darfHTML(comp,d,pag)}`:'<div class="note warn">Calcule a folha da competência (ou não há saldo a pagar) para gerar o espelho do DARF.</div>'}`;},actions:()=>[]};
ACT.darfCalc=()=>{const o=readForm($('#fd'));go('darf',{comp:o.comp||DB.cfg.comp,q:{pag:o.pag,selic:o.selic}});};
ACT.darfImp=()=>{const comp=NAV.cur.params.comp||DB.cfg.comp,q=NAV.cur.params.q||{},d=darfLinhas(comp,q.pag||'',q.selic||0);if(!d)return;$('#printarea').innerHTML='<h2>DARF — espelho de conferência — '+esc(compLabel(comp))+'</h2>'+darfHTML(comp,d,q.pag||'');document.body.classList.add('printing');try{window.print();}catch(e){toast('Impressão indisponível neste ambiente.','err');}setTimeout(()=>{document.body.classList.remove('printing');$('#printarea').innerHTML='';},800);};
SC.feriados={view(p){const ano=+(p.ano||new Date().getFullYear()),c=Object.assign({},FER_MOV_PAD,DB.cfg.ferMov||{}),ex=DB.cfg.feriadosExtra||[];
  const lista=feriadosAno(ano);
  return `<h1>Feriados e dias não úteis</h1><p class="sub">Usados no cálculo de vencimentos (DARF, FGTS, DCTFWeb), prazos do eSocial e 5º dia útil. Os feriados móveis são calculados a partir da Páscoa (algoritmo gregoriano). Feriados nacionais fixos: Lei 662/1949 e Lei 6.802/1980; Consciência Negra (20/11): Lei 14.759/2023. Carnaval, Sexta-feira Santa e Corpus Christi não são feriados nacionais por lei federal geral — considere o calendário bancário da sua praça e desative o que não se aplica **. Feriados estaduais e municipais: cadastre abaixo.</p>
  <div class="card" id="ff"><div class="grid">${F('Ano','ano',ano,{w:2})+F('Carnaval (seg. e ter.)','carnaval',c.carnaval,{t:'check',cl:'Considerar',w:3})+F('Sexta-feira Santa','sextaSanta',c.sextaSanta,{t:'check',cl:'Considerar',w:3})+F('Corpus Christi','corpus',c.corpus,{t:'check',cl:'Considerar',w:3})}</div>
  <h3>Feriados estaduais/municipais (um por linha: AAAA-MM-DD ou MM-DD; separe o nome por ponto e vírgula)</h3><div class="grid">${F('Lista','extra',ex.map(x=>x.d+(x.n?';'+x.n:'')).join('\n'),{t:'textarea',w:12})}</div>
  <div class="row"><button class="btn pri" data-act="ferSave">Salvar</button></div></div>
  <div class="card"><h2>Feriados de ${ano}</h2><table><thead><tr><th>Data</th><th>Dia da semana</th><th>Feriado</th></tr></thead><tbody>${lista.map(x=>`<tr><td>${fmtData(x[0])}</td><td>${['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][new Date(x[0]+'T00:00:00Z').getUTCDay()]}</td><td>${esc(x[1])}</td></tr>`).join('')}</tbody></table></div>`;},actions:()=>[]};
ACT.ferSave=()=>{const o=readForm($('#ff'));DB.cfg.ferMov={carnaval:!!o.carnaval,sextaSanta:!!o.sextaSanta,corpus:!!o.corpus};
  DB.cfg.feriadosExtra=String(o.extra||'').split('\n').map(s=>s.trim()).filter(Boolean).map(s=>{const [d,n]=s.split(';');return{d:d.trim(),n:(n||'').trim()};}).filter(x=>/^(\d{4}-)?\d{2}-\d{2}$/.test(x.d));
  audit('Feriados','Calendário de feriados atualizado');saveDB();toast('Feriados salvos.','ok');go('feriados',{ano:o.ano});};
