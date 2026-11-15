
/* ===================== Comparativo de regimes (Simples × Presumido × Real) ===================== */
/* Tabelas dos Anexos I a V — LC 123/2006, redação da LC 155/2016: [RBT12 até, alíquota nominal %, parcela a deduzir R$] */
const SN_TAB={
 I:[[180000,4,0],[360000,7.3,5940],[720000,9.5,13860],[1800000,10.7,22500],[3600000,14.3,87300],[4800000,19,378000]],
 II:[[180000,4.5,0],[360000,7.8,5940],[720000,10,13860],[1800000,11.2,22500],[3600000,14.7,85500],[4800000,30,720000]],
 III:[[180000,6,0],[360000,11.2,9360],[720000,13.5,17640],[1800000,16,35640],[3600000,21,125640],[4800000,33,648000]],
 IV:[[180000,4.5,0],[360000,9,8100],[720000,10.2,12420],[1800000,14,39780],[3600000,22,183780],[4800000,33,828000]],
 V:[[180000,15.5,0],[360000,18,4500],[720000,19.5,9900],[1800000,20.5,17100],[3600000,23,62100],[4800000,30.5,540000]]};
function snEfetiva(anexo,rbt12){const t=SN_TAB[anexo];const f=t.find(x=>rbt12<=x[0]);if(!f)return null;
  const rb=Math.max(rbt12,1);return{nom:f[1],pd:f[2],faixa:t.indexOf(f)+1,ef:rbt12<=0?f[1]:Math.max(0,(rb*f[1]/100-f[2])/rb*100)};}
/* Percentuais de presunção: [IRPJ %, CSLL %] — Lei 9.249/1995, arts. 15 e 20 */
const PRES={com:['Comércio e indústria',8,12],serv:['Serviços em geral, intermediação, locação (32%)',32,32],carga:['Transporte de cargas',8,12],hosp:['Serviços hospitalares',8,12],pass:['Transporte de passageiros',16,12]};
const CMP_DEF={rec:100000,rbt12:0,ativ:'serv',snServ:'fatorR',pres:'serv',iss:3,icms:0,sal:15000,prol:5000,desp:20000,credBase:5000,rat:2,terc:5.8,lc224:true};
function cmpEncargos(i,regime,anexoIV){ /* valor ANUAL */ // CPP patronal, RAT, terceiros — Lei 8.212/91, art. 22, I a III
  const pat=num(DB&&DB.params?DB.params.patronal:20);
  if(regime==='sn'&&!anexoIV)return 0;
  const temTerc=regime!=='sn';
  return r2((num(i.sal)*(pat+num(i.rat)+(temTerc?num(i.terc):0))/100+num(i.prol)*pat/100)*12);}
function calcSimplesCmp(i){const rec=num(i.rec),rbt=num(i.rbt12)>0?num(i.rbt12):rec*12,fgts=num(i.sal)*0.08;
  const o={key:'sn',nome:'Simples Nacional',notas:[]};
  if(rbt>4800000){o.elegivel=false;o.motivo='RBT12 acima de R$ 4,8 milhões: ultrapassa o limite do Simples (LC 123/2006, art. 3º, II).';return o;}
  const fatorR=rbt>0?(num(i.sal)+num(i.prol)+fgts)*12/rbt:0;o.fatorR=fatorR;
  let anexo=i.ativ==='com'?'I':i.ativ==='ind'?'II':(i.snServ==='fatorR'?(fatorR>=0.28?'III':'V'):i.snServ);
  if(i.ativ==='ind')anexo='II';
  const e=snEfetiva(anexo,rbt);o.anexo=anexo;o.efetiva=e.ef;o.faixa=e.faixa;
  if(i.ativ==='serv'&&i.snServ==='fatorR')o.notas.push('Fator R = '+(fatorR*100).toFixed(1).replace('.',',')+'% → '+(fatorR>=0.28?'Anexo III (fator R ≥ 28%)':'Anexo V (fator R < 28%)')+'.');
  const das=r2(rec*12*e.ef/100);const iv=anexo==='IV';const enc=cmpEncargos(i,'sn',iv);
  let fora=0;if(rbt>3600000){fora=r2(rec*12*(i.ativ==='serv'?num(i.iss):num(i.icms))/100);o.notas.push('RBT12 acima de R$ 3,6 milhões: ICMS/ISS são recolhidos fora do DAS (LC 123/2006, art. 13-A). Estimativa conservadora: o ISS/ICMS informado foi somado integralmente, sem abater sua parcela do DAS.');}
  if(iv)o.notas.push('Anexo IV: a CPP patronal (20%) e o RAT não estão no DAS e são recolhidos à parte (LC 123/2006, art. 18, §5º-C); terceiros dispensados.');
  o.partes={das,irpj:0,csll:0,pc:0,iss:i.ativ==='serv'?fora:0,icms:i.ativ==='serv'?0:fora,enc};o.elegivel=true;return o;}
function calcPresumidoCmp(i){const R=num(i.rec)*12,P=PRES[i.pres]||PRES.serv,lim=5000000,f=i.lc224?1.1:1;
  const o={key:'lp',nome:'Lucro Presumido',notas:[],elegivel:true};
  if(R>78000000){o.elegivel=false;o.motivo='Receita bruta anual acima de R$ 78 milhões: vedado o Lucro Presumido (Lei 9.718/1998, art. 14, I).';return o;}
  const baseIr=P[1]/100*(Math.min(R,lim)+f*Math.max(R-lim,0)),baseCs=P[2]/100*(Math.min(R,lim)+f*Math.max(R-lim,0));
  const irpj=r2(baseIr*0.15+Math.max(0,baseIr-240000)*0.10),csll=r2(baseCs*0.09);
  const pc=r2(R*0.0365),iss=i.ativ==='serv'?r2(R*num(i.iss)/100):0,icms=i.ativ==='serv'?0:r2(R*num(i.icms)/100);
  if(R>lim&&i.lc224)o.notas.push('Acréscimo de 10% nos percentuais de presunção sobre a receita anual que excede R$ 5 milhões (LC 224/2025; IN RFB 2.305/2025). A CSLL só sofre o acréscimo a partir de 1º/04/2026 e há discussão judicial: a conta aplica o acréscimo nos 12 meses **.');
  o.base={irpj:baseIr,csll:baseCs};o.partes={das:0,irpj,csll,pc,iss,icms,enc:cmpEncargos(i,'lp')};return o;}
function calcRealCmp(i){const R=num(i.rec)*12;const o={key:'lr',nome:'Lucro Real',notas:[],elegivel:true};
  const enc=cmpEncargos(i,'lr'),fgts=num(i.sal)*0.08*12,folha=num(i.sal)*12+num(i.prol)*12+fgts+enc;
  const deb=R*0.0925,cred=num(i.credBase)*12*0.0925,pc=r2(Math.max(0,deb-cred));
  const iss=i.ativ==='serv'?r2(R*num(i.iss)/100):0,icms=i.ativ==='serv'?0:r2(R*num(i.icms)/100);
  const lucro=R-pc-iss-icms-num(i.desp)*12-folha;o.lucro=lucro;
  const irpj=r2(Math.max(0,lucro)*0.15+Math.max(0,lucro-240000)*0.10),csll=r2(Math.max(0,lucro)*0.09);
  if(lucro<=0)o.notas.push('Prejuízo fiscal no período: IRPJ e CSLL zerados. O prejuízo pode ser compensado em períodos futuros (limite de 30% do lucro) — não simulado (Lei 9.065/1995, art. 15) **.');
  o.notas.push('PIS/COFINS não cumulativos: 1,65% + 7,6% sobre a receita, menos créditos de 9,25% sobre a base informada (Leis 10.637/2002 e 10.833/2003, arts. 2º e 3º).');
  o.partes={das:0,irpj,csll,pc,iss,icms,enc};return o;}
function compararRegimes(i){const R=num(i.rec)*12,fgts=num(i.sal)*0.08*12;
  const out=[calcSimplesCmp(i),calcPresumidoCmp(i),calcRealCmp(i)];
  out.forEach(o=>{if(!o.elegivel)return;const p=o.partes;o.total=r2(p.das+p.irpj+p.csll+p.pc+p.iss+p.icms+p.enc);o.carga=R>0?o.total/R*100:0;
    o.resultado=r2(R-num(i.desp)*12-num(i.sal)*12-num(i.prol)*12-fgts-o.total);});
  const el=out.filter(o=>o.elegivel);if(el.length){const m=Math.min(...el.map(o=>o.total));el.forEach(o=>{o.melhor=o.total===m;o.dif=r2(o.total-m);});}
  return out;}
function varrerReceita(i,mults){return mults.map(m=>{const j=Object.assign({},i,{rec:num(i.rec)*m,sal:num(i.sal)*m,prol:num(i.prol),desp:num(i.desp)*m,credBase:num(i.credBase)*m,rbt12:0});
  const r=compararRegimes(j);return{rec:j.rec*12,v:r.map(o=>o.elegivel?o.carga:null)};});}
