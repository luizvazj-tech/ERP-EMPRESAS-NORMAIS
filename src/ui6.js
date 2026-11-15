/* ===================== Gráficos (SVG/HTML, sem dependências) ===================== */
const SER=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#6250d6','#e34948'];
const brlK=n=>{const a=Math.abs(n);return (n<0?'-':'')+(a>=1e6?(a/1e6).toFixed(a>=1e7?0:1).replace('.',',')+' mi':a>=1e3?(a/1e3).toFixed(a>=1e4?0:1).replace('.',',')+' mil':String(Math.round(a)));};
const niceMax=v=>{if(v<=0)return 1;const e=Math.pow(10,Math.floor(Math.log10(v))),f=v/e;return (f<=1?1:f<=2?2:f<=4?4:f<=8?8:10)*e;};
const legendHtml=(names,cols)=>`<div class="legend">${names.map((n,i)=>`<span><i class="sw" style="background:${(cols||SER)[i]}"></i>${esc(n)}</span>`).join('')}</div>`;
function vbars(cats,series,o){o=o||{};const W=640,H=o.h||250,m={l:50,r:8,t:12,b:30},iw=W-m.l-m.r,ih=H-m.t-m.b;
  const tot=cats.map((_,i)=>series.reduce((a,s)=>a+(s.v[i]||0),0)),mx=niceMax(Math.max(...tot,1)),step=iw/Math.max(cats.length,1),bw=Math.min(54,step*0.6);
  let g='';for(let k=0;k<=4;k++){const y=m.t+ih-ih*k/4;g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}" stroke="#e3e8ee" stroke-width="1"/><text x="${m.l-6}" y="${y+4}" text-anchor="end" font-size="11" fill="#5d6b79">${brlK(mx*k/4)}</text>`;}
  let b='';cats.forEach((c,i)=>{let acc=0;const x=m.l+step*i+(step-bw)/2;series.forEach((s,j)=>{const v=s.v[i]||0;if(v<=0)return;const h=ih*v/mx,y=m.t+ih-ih*acc/mx-h;acc+=v;
    b+=`<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h,0)}" rx="${j===series.length-1?3:0}" fill="${(o.cols||SER)[j]}" stroke="#fff" stroke-width="2" data-tip="${esc(c+' — '+s.n+': R$ '+brl(v))}"/>`;});
    b+=`<text x="${x+bw/2}" y="${H-10}" text-anchor="middle" font-size="11" fill="#5d6b79">${esc(c)}</text>`;if(o.totals)b+=`<text x="${x+bw/2}" y="${m.t+ih-ih*acc/mx-5}" text-anchor="middle" font-size="11" font-weight="600" fill="#17212b">${brlK(acc)}</text>`;});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.label||'gráfico de barras')}">${g}${b}</svg>`;}
function hbars(items,o){o=o||{};const mx=Math.max(...items.map(x=>Math.abs(x.v)),1);
  return `<div class="hb">${items.map((x,i)=>`<div class="hrow" data-tip="${esc(x.l+': '+(o.fmt?o.fmt(x.v):'R$ '+brl(x.v)))}"><span class="hl">${esc(x.l)}</span><span class="ht"><i style="width:${Math.max(1,Math.abs(x.v)/mx*100)}%;background:${x.c||SER[0]}"></i></span><b>${o.fmt?o.fmt(x.v):brl(x.v)}</b></div>`).join('')}</div>`;}
function linhas(xs,series,o){o=o||{};const W=640,H=o.h||260,m={l:46,r:12,t:12,b:34},iw=W-m.l-m.r,ih=H-m.t-m.b;
  const vals=series.flatMap(s=>s.v.filter(v=>v!=null)),mx=niceMax(Math.max(...vals,1));const X=i=>m.l+iw*i/Math.max(xs.length-1,1),Y=v=>m.t+ih-ih*v/mx;
  let g='';for(let k=0;k<=4;k++){const y=m.t+ih-ih*k/4;g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}" stroke="#e3e8ee"/><text x="${m.l-6}" y="${y+4}" text-anchor="end" font-size="11" fill="#5d6b79">${(v=>Number.isInteger(v)?v:v.toFixed(1).replace('.',','))(mx*k/4)}%</text>`;}
  xs.forEach((x,i)=>{g+=`<text x="${X(i)}" y="${H-12}" text-anchor="middle" font-size="11" fill="#5d6b79">${esc(x)}</text>`;});
  let l='';series.forEach((s,j)=>{let d='',pen=false;s.v.forEach((v,i)=>{if(v==null){pen=false;return;}d+=(pen?'L':'M')+X(i)+' '+Y(v)+' ';pen=true;});
    l+=`<path d="${d}" fill="none" stroke="${(o.cols||SER)[j]}" stroke-width="2" stroke-linejoin="round"/>`;
    s.v.forEach((v,i)=>{if(v==null)return;l+=`<circle cx="${X(i)}" cy="${Y(v)}" r="4.5" fill="${(o.cols||SER)[j]}" stroke="#fff" stroke-width="2" data-tip="${esc(s.n+' — receita anual R$ '+xs[i]+': '+v.toFixed(1).replace('.',',')+'% de carga')}"/>`;});});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.label||'gráfico de linhas')}">${g}${l}</svg>`;}
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]'),tip=$('#tip');if(!tip)return;if(!t){tip.style.display='none';return;}tip.textContent=t.dataset.tip;tip.style.display='block';});
document.addEventListener('mousemove',e=>{const tip=$('#tip');if(tip&&tip.style.display==='block'){tip.style.left=Math.min(e.clientX+14,window.innerWidth-260)+'px';tip.style.top=(e.clientY+16)+'px';}});

/* ===================== Painel gerencial (dashboards) ===================== */
const compsComDados=()=>Object.keys(DB.comps).filter(c=>DB.comps[c].res&&Object.keys(DB.comps[c].res).length).sort();
SC.painel={view(p){const comp=compSel(p),c=DB.comps[comp],T=totaisComp(comp),all=compsComDados().slice(-12);
  const serie=all.map(k=>{const t=totaisComp(k);return{k,t};});
  const cats=serie.map(x=>compLabel(x.k).replace(/ de /,'/')),pct=(a,b)=>b?(a/b*100).toFixed(1).replace('.',',')+'%':'—';
  const custo=T.prov+T.fgts+T.pat+T.rat+T.terc,R=c&&c.status!=='aberta'?resumoEstrutura(comp):null;
  const ev={};DB.eventos.forEach(e=>{ev[e.tipo]=ev[e.tipo]||{processado:0,gerado:0,enviado:0,rejeitado:0};ev[e.tipo][e.status]=(ev[e.tipo][e.status]||0)+1;});
  const tipos=Object.keys(ev).sort((a,b)=>ORDEM.indexOf(a)-ORDEM.indexOf(b));
  const lotN={};DB.empregados.filter(e=>e.situacao!=='desligado').forEach(e=>{const l=byId(DB.lotacoes,e.lotacao);const k=l?l.cod+' – '+l.desc:'Sem lotação';lotN[k]=(lotN[k]||0)+1;});
  const tabela=(heads,rows)=>`<details class="tv"><summary>Ver como tabela</summary><div class="tw"><table class="t"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td class="${i?'r':''}">${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  return `<h1>Painel gerencial</h1><p class="sub">Visão da folha, dos encargos, da estrutura e do eSocial. Os números vêm das folhas calculadas; o regime atual é <b>${esc(regimeTxt(DB.empresa))}</b>.</p>${exigeEmpresa()}${compBar(comp)}
  ${T.n?`<div class="kpis"><div class="kpi"><span>Empregados na folha</span><b>${T.n}</b></div><div class="kpi"><span>Custo total da folha</span><b>R$ ${brl(custo)}</b></div><div class="kpi"><span>Encargos patronais</span><b>R$ ${brl(T.pat+T.rat+T.terc)}</b></div><div class="kpi"><span>Encargos ÷ proventos</span><b>${pct(T.pat+T.rat+T.terc,T.prov)}</b></div><div class="kpi"><span>Líquido a pagar</span><b>R$ ${brl(T.liq)}</b></div></div>`:'<div class="note">Calcule a folha da competência para ver os indicadores.</div>'}
  <div class="card"><h2>Custo da folha por competência</h2>${serie.length?legendHtml(['Proventos','FGTS','CPP patronal','RAT','Terceiros']).concat(vbars(cats,[{n:'Proventos',v:serie.map(x=>x.t.prov)},{n:'FGTS',v:serie.map(x=>x.t.fgts)},{n:'CPP patronal',v:serie.map(x=>x.t.pat)},{n:'RAT',v:serie.map(x=>x.t.rat)},{n:'Terceiros',v:serie.map(x=>x.t.terc)}],{totals:true,label:'Custo da folha por competência'}))+tabela(['Competência','Proventos','FGTS','CPP','RAT','Terceiros'],serie.map(x=>[compLabel(x.k),brl(x.t.prov),brl(x.t.fgts),brl(x.t.pat),brl(x.t.rat),brl(x.t.terc)])):'<p class="sub">Sem competências calculadas.</p>'}</div>
  ${T.n?`<div class="grid"><div class="card" style="grid-column:span 6"><h2>Para onde vai o dinheiro — ${compLabel(comp)}</h2>${hbars([{l:'Líquido aos empregados',v:T.liq,c:SER[0]},{l:'INSS dos empregados',v:T.inss,c:SER[1]},{l:'IRRF retido',v:T.irrf,c:SER[2]},{l:'FGTS',v:T.fgts,c:SER[3]},{l:'CPP patronal',v:T.pat,c:SER[4]},{l:'RAT',v:T.rat,c:SER[5]},{l:'Terceiros',v:T.terc,c:SER[6]}])}</div>
  <div class="card" style="grid-column:span 6"><h2>Empregados por lotação</h2>${hbars(Object.entries(lotN).map(([l,v],i)=>({l,v,c:SER[i%8]})),{fmt:v=>String(v)})}</div></div>`:''}
  ${R?`<div class="grid"><div class="card" style="grid-column:span 6"><h2>Custo previdenciário por estabelecimento</h2>${hbars(Object.entries(R.estab).map(([k,o],i)=>({l:(byId(DB.estabs,k)||{nome:k}).nome,v:r2(o.inss+o.pat+o.rat+o.terc),c:SER[i%8]})))}<p class="sub" style="margin:6px 0 0">INSS dos empregados + CPP + RAT + terceiros.</p></div>
  <div class="card" style="grid-column:span 6"><h2>Custo previdenciário por lotação</h2>${hbars(Object.entries(R.lot).map(([k,o],i)=>({l:(l=>l?l.cod+' – '+l.desc:k)(byId(DB.lotacoes,k)),v:r2(o.inss+o.pat+o.rat+o.terc),c:SER[i%8]})))}<p class="sub" style="margin:6px 0 0">Em Simples (Anexos I–III/V) os encargos patronais ficam no DAS.</p></div></div>`:''}
  <div class="card"><h2>Situação dos eventos eSocial</h2>${tipos.length?legendHtml(['Processado','Enviado','Gerado','Rejeitado'],[SER[2],SER[0],SER[3],SER[7]]).concat(vbars(tipos,[{n:'Processado',v:tipos.map(t=>ev[t].processado||0)},{n:'Enviado',v:tipos.map(t=>ev[t].enviado||0)},{n:'Gerado',v:tipos.map(t=>ev[t].gerado||0)},{n:'Rejeitado',v:tipos.map(t=>ev[t].rejeitado||0)}],{cols:[SER[2],SER[0],SER[3],SER[7]],h:230,label:'Eventos eSocial por tipo e situação'}).replace(/R\$ /g,'')):'<p class="sub">Nenhum evento gerado ainda.</p>'}</div>
  <div class="note info">Quer saber qual regime tributário custa menos para a empresa? Use o <a style="cursor:pointer;text-decoration:underline" data-act="nav" data-to="cmp">Comparativo de regimes</a>.</div>`;},
  mount(){bindComp();},actions:()=>[{label:'Comparativo de regimes →',act:'goCmp',cls:'pri'}]};
ACT.goCmp=()=>go('cmp');

/* ===================== Comparativo de regimes ===================== */
const CMP_PARTES=[['das','DAS (Simples)'],['irpj','IRPJ'],['csll','CSLL'],['pc','PIS/COFINS'],['iss','ISS / ICMS'],['enc','CPP, RAT e terceiros']];
function cmpDefaults(){const d=Object.assign({},CMP_DEF);const E=DB.empresa;if(E){d.rat=num(E.rat)*num(E.fap)||d.rat;if(E.terceiros!=null&&E.terceiros!=='')d.terc=num(E.terceiros);}return d;}
function cmpEntrada(){return Object.assign(cmpDefaults(),DB.cmp||{});}
function cmpResultadoHtml(i){const R=compararRegimes(i),Rv=num(i.rec)*12;const el=R.filter(o=>o.elegivel);
  const cards=R.map(o=>o.elegivel?`<div class="card cmpc ${o.melhor?'best':''}"><div class="row sp"><h3>${o.nome}${o.anexo?' — Anexo '+o.anexo:''}</h3>${o.melhor?badge('Menor carga','ok'):''}</div><div class="big">R$ ${brl(o.total)}</div><div class="sub" style="margin:0">por ano · ${o.carga.toFixed(2).replace('.',',')}% da receita${o.dif>0?` · <b>+R$ ${brl(o.dif)}</b> que o menor`:''}</div><p style="margin:8px 0 0">Resultado após tributos: <b>R$ ${brl(o.resultado)}</b>/ano</p></div>`
   :`<div class="card cmpc off"><h3>${o.nome}</h3>${badge('Inelegível','err')}<p class="sub" style="margin:8px 0 0">${esc(o.motivo)}</p></div>`).join('');
  const cols=CMP_PARTES.map((_,k)=>SER[k]);
  const stack=vbars(el.map(o=>o.nome),CMP_PARTES.map(([k,n])=>({n,v:el.map(o=>o.key==='lp'||o.key==='lr'||o.key==='sn'?(k==='iss'?o.partes.iss+o.partes.icms:o.partes[k]):0)})),{totals:true,h:280,label:'Tributos por regime (anual)'});
  const tab=`<div class="tw"><table class="t"><thead><tr><th>Componente (anual)</th>${R.map(o=>`<th class="r">${o.nome}</th>`).join('')}</tr></thead><tbody>${CMP_PARTES.map(([k,n])=>`<tr><td>${n}</td>${R.map(o=>`<td class="r">${o.elegivel?brl(k==='iss'?o.partes.iss+o.partes.icms:o.partes[k]):'—'}</td>`).join('')}</tr>`).join('')}<tr><td><b>Total de tributos e encargos</b></td>${R.map(o=>`<td class="r"><b>${o.elegivel?brl(o.total):'—'}</b></td>`).join('')}</tr><tr><td>Carga sobre a receita</td>${R.map(o=>`<td class="r">${o.elegivel?o.carga.toFixed(2).replace('.',',')+'%':'—'}</td>`).join('')}</tr><tr><td>Resultado após tributos</td>${R.map(o=>`<td class="r">${o.elegivel?brl(o.resultado):'—'}</td>`).join('')}</tr></tbody></table></div>`;
  const mult=[0.25,0.5,0.75,1,1.5,2,3,5,8],sw=varrerReceita(i,mult),xs=sw.map(s=>brlK(s.rec));
  const line=linhas(xs,[{n:'Simples Nacional',v:sw.map(s=>s.v[0])},{n:'Lucro Presumido',v:sw.map(s=>s.v[1])},{n:'Lucro Real',v:sw.map(s=>s.v[2])}],{cols:[SER[0],SER[1],SER[2]],label:'Carga tributária por faixa de receita'});
  const notas=R.flatMap(o=>(o.notas||[]).map(n=>o.nome+': '+n));
  return `<div class="cmpg">${cards}</div>
  <div class="card"><h2>Composição dos tributos e encargos (anual)</h2>${legendHtml(CMP_PARTES.map(x=>x[1]),cols)}${stack}<details class="tv" open><summary>Tabela</summary>${tab}</details></div>
  <div class="card"><h2>E se a receita mudar? Carga tributária por faixa de receita anual</h2><p class="sub" style="margin:0 0 6px">Escala a receita, a folha, as despesas e a base de créditos proporcionalmente (pró-labore fixo). Lacuna na linha do Simples = receita acima de R$ 4,8 milhões.</p>${legendHtml(['Simples Nacional','Lucro Presumido','Lucro Real'],[SER[0],SER[1],SER[2]])}${line}</div>
  ${notas.length?`<div class="card"><h2>Observações deste cenário</h2>${notas.map(n=>`<p style="margin:4px 0">• ${esc(n)}</p>`).join('')}</div>`:''}`;}
SC.cmp={view(){const i=cmpEntrada();const serv=i.ativ==='serv';
  return `<h1>Comparativo de enquadramentos tributários</h1><p class="sub">Simples Nacional × Lucro Presumido × Lucro Real, com a mesma receita, folha e despesas. Estimativa anual com base em valores mensais médios.</p>${exigeEmpresa()}
  <div class="card" data-form id="f"><h2>Dados da empresa</h2><div class="grid">
  ${F('Receita bruta mensal (R$)','rec',i.rec,{t:'money',req:1,w:3})+F('RBT12 (receita dos 12 meses; vazio = mensal × 12)','rbt12',i.rbt12||'',{t:'money',w:3})+F('Atividade','ativ',i.ativ,{t:'select',opts:[['serv','Serviços'],['com','Comércio'],['ind','Indústria']],w:3})
  +F('Serviços no Simples','snServ',i.snServ,{t:'select',opts:[['fatorR','Anexo III ou V conforme fator R'],['III','Anexo III (fixo)'],['IV','Anexo IV (CPP fora do DAS)'],['V','Anexo V (fixo)']],w:3})
  +F('Presunção no Lucro Presumido','pres',i.pres,{t:'select',opts:Object.entries(PRES).map(([k,v])=>[k,v[0]+' — IRPJ '+v[1]+'% / CSLL '+v[2]+'%']),w:6})
  +F('ISS (% da receita de serviços)','iss',i.iss,{w:2,hint:'2% a 5%'})+F('ICMS líquido (% da receita)','icms',i.icms,{w:2,hint:'Após créditos'})
  +F('Salários CLT por mês (R$)','sal',i.sal,{t:'money',w:3})+F('Pró-labore por mês (R$)','prol',i.prol,{t:'money',w:3})+F('Demais custos e despesas por mês (R$)','desp',i.desp,{t:'money',w:3,hint:'Exceto folha e encargos'})+F('Base de créditos PIS/COFINS por mês (R$)','credBase',i.credBase,{t:'money',w:3,hint:'Insumos, energia, aluguel etc. (Lucro Real)'})
  +F('RAT × FAP (%)','rat',i.rat,{w:2})+F('Terceiros (%)','terc',i.terc,{w:2})+F('Acréscimo da LC 224/2025','lc224',i.lc224,{t:'check',cl:'Aplicar +10% na presunção acima de R$ 5 mi',w:4})}</div>
  <p class="sub" style="margin:8px 0 0">Os resultados são recalculados a cada alteração. Valores salvos neste navegador.</p></div>
  <div id="cmpOut">${cmpResultadoHtml(i)}</div>
  <div class="card"><h2>Premissas, limites e base legal</h2>
  <p style="margin:4px 0">• <b>Simples Nacional:</b> alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12 (LC 123/2006, art. 18 e Anexos I a V, redação da LC 155/2016). Fator R de 28% (art. 18, §§ 5º-I, 5º-J e 5º-M): folha dos 12 meses, com pró-labore e FGTS, dividida pela receita. Limite de R$ 4,8 milhões (art. 3º, II) e sublimite de R$ 3,6 milhões para ICMS/ISS (art. 13-A). Anexos IV: CPP fora do DAS (art. 18, §5º-C).</p>
  <p style="margin:4px 0">• <b>Lucro Presumido:</b> presunção da Lei 9.249/1995, arts. 15 e 20; IRPJ de 15% com adicional de 10% sobre o que passar de R$ 20 mil por mês (art. 3º, caput e §1º); CSLL de 9%; PIS 0,65% e COFINS 3% cumulativos (Lei 9.718/1998). <b>LC 224/2025</b>: acréscimo de 10% nos percentuais de presunção sobre a parcela da receita anual acima de R$ 5 milhões (IN RFB 2.305/2025 e 2.306/2026); há ações judiciais em curso **.</p>
  <p style="margin:4px 0">• <b>Lucro Real:</b> IRPJ 15% + adicional de 10% e CSLL 9% sobre o lucro contábil ajustado; PIS 1,65% e COFINS 7,6% não cumulativos, com créditos (Leis 10.637/2002 e 10.833/2003). Sem adições e exclusões, sem compensação de prejuízos e sem JCP.</p>
  <p style="margin:4px 0">• <b>Encargos patronais</b> (Presumido, Real e Simples Anexo IV): 20% sobre salários e pró-labore, RAT×FAP e terceiros só sobre salários (Lei 8.212/1991, art. 22, I a III; terceiros dispensados no Simples — LC 123/2006, art. 13, §3º). FGTS de 8% é igual em todos os regimes.</p>
  <p style="margin:4px 0">• <b>Reforma do consumo em 2026:</b> CBS 0,9% e IBS 0,1% são alíquotas de teste, compensadas com PIS/COFINS, sem aumento de carga; o Simples fica fora do teste (LC 214/2025, arts. 343 e 346).</p>
  <p style="margin:4px 0">• <b>Não considerado:</b> CPRB, retenções na fonte, atividades mistas, ICMS-ST, IPI, JCP, compensação de prejuízos, tributação dos lucros distribuídos (IRRF de 10% sobre dividendos acima de R$ 50 mil por mês — Lei 15.270/2025 **) e variações sazonais. O resultado é uma <b>estimativa para decisão preliminar</b>, não substitui o estudo de planejamento tributário.</p></div>`;},
  mount(){const f=$('#f');if(!f)return;const upd=()=>{const o=readForm(f);o.lc224=!!o.lc224;DB.cmp=Object.assign({},o);saveDB();$('#cmpOut').innerHTML=cmpResultadoHtml(cmpEntrada());DIRTY=false;};
    $$('[name]',f).forEach(el=>{el.addEventListener('input',upd);el.addEventListener('change',upd);});},
  actions:()=>[{label:'Usar folha calculada',act:'cmpFolha'},{label:'Restaurar padrão',act:'cmpReset'},{label:'🖨 Imprimir',act:'cmpPrint',cls:'pri',key:'save'}]};
ACT.cmpFolha=()=>{const comp=DB.cfg.comp,c=DB.comps[comp];if(!c||!Object.keys(c.res||{}).length){toast('Calcule a folha da competência para importar.','err');return;}
  let sal=0;Object.values(c.res).forEach(r=>sal+=r.baseCP);DB.cmp=Object.assign(cmpEntrada(),{sal:r2(sal)});saveDB();toast('Salários importados da folha de '+compLabel(comp)+': R$ '+brl(sal)+'.','ok');refresh();};
ACT.cmpReset=()=>{DB.cmp={};saveDB();refresh();};
ACT.cmpPrint=()=>{$('#printarea').innerHTML='<div style="padding:12px"><h2>Comparativo de regimes — '+esc((DB.empresa||{}).razao||'')+'</h2>'+$('#cmpOut').innerHTML+'</div>';document.body.classList.add('printing');try{window.print();}catch(e){toast('Impressão indisponível neste ambiente.','err');}setTimeout(()=>{document.body.classList.remove('printing');$('#printarea').innerHTML='';},800);};
