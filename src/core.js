'use strict';
/* =====================================================================
   FOLHA PRO — núcleo (sem DOM): utilitários, parâmetros legais, motor de
   cálculo, banco local e geradores de eventos do eSocial (leiaute S-1.3)
   ===================================================================== */
const r2=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
const onlyD=s=>String(s==null?'':s).replace(/\D/g,'');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=v=>{ if(typeof v==='number') return v; let s=String(v==null?'':v).trim(); if(!s) return 0; if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?0:n; };
const fx=v=>r2(v).toFixed(2);
const brIn=v=>(v===''||v==null||isNaN(v))?'':Number(v).toFixed(2).replace('.',',');
function cpfValido(c){c=onlyD(c);if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(let t=9;t<11;t++){let s=0;for(let i=0;i<t;i++)s+=c[i]*(t+1-i);if((s*10)%11%10!=c[t])return false;}return true;}
function cnpjValido(c){c=onlyD(c);if(c.length!==14||/^(\d)\1+$/.test(c))return false;const f=n=>{let p=n-7,s=0;for(let i=0;i<n;i++){s+=c[i]*p--;if(p<2)p=9;}const r=s%11;return r<2?0:11-r;};return f(12)==c[12]&&f(13)==c[13];}
const fmtCPF=c=>{c=onlyD(c);return c.length===11?c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):c;};
const fmtCNPJ=c=>{c=onlyD(c);return c.length===14?c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):c;};
const fmtCEP=c=>{c=onlyD(c);return c.length===8?c.replace(/(\d{5})(\d{3})/,'$1-$2'):c;};
const fmtData=d=>d?String(d).split('-').reverse().join('/'):'';
const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const compLabel=c=>{const [a,m]=String(c).split('-');return MESES[+m-1]+'/'+a;};
const hoje=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const compAtual=()=>hoje().slice(0,7);
const diasMes=c=>{const [a,m]=c.split('-').map(Number);return new Date(a,m,0).getDate();};
const idadeEm=(nasc,ref)=>{if(!nasc)return 0;const [a,m,d]=String(nasc).slice(0,10).split('-').map(Number),[A,M,D]=String(ref).slice(0,10).split('-').map(Number);return A-a-((M<m||(M===m&&D<d))?1:0);};
const agoraISO=()=>new Date().toISOString();
const dtHora=iso=>{if(!iso)return '';const d=new Date(iso);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});};

/* ---------------- Parâmetros legais 2026 (editáveis na tela própria) ---------------- */
function defaultParams(){return{
  salMin:1621.00, tetoInss:8475.55,
  inss:[[1621.00,7.5],[2902.84,9],[4354.27,12],[8475.55,14]],
  irrf:[[2428.80,0,0],[2826.65,7.5,182.16],[3751.05,15,394.16],[4664.68,22.5,675.49],[999999999,27.5,908.73]],
  depIr:189.59, simpl:607.20,
  redutor:{isento:5000.00,teto:7350.00,a:978.62,b:0.133145},
  salFam:{cota:67.54,limite:1980.38,idade:14},
  fgts:8, fgtsAprendiz:2, vtPerc:6,
  patronal:20, rat:2, fap:1, terceiros:5.8, adNoturno:20, peric:30, he50:50, he100:100, divisor:220, cprbFrac:{2025:25,2026:50,2027:75}, venc:{inss:20,fgts:20,regra:'antecipa'}, adnotBase:'vh', horaNotRed:false, dsrAuto:false
};}

/* ---------------- Rubricas padrão ---------------- */
// natureza (Tabela 3) preenchida apenas onde confirmada em fonte oficial: 1000, 1409, 9200, 9201, 9203.
const NAT_SUGERIDA={INSAL:'1202',PERIC:'1203',ADNOT:'1205',HE50:'1003',HE100:'1003',DSRHE:'1012',COMIS:'1207',GRAT:'1211',FALTAS:'9207',ATRASOS:'9208',DSRFALTA:'9211',VT:'9216',PENSAO:'9213',FERIAS:'1016',FERTERCO:'1017',ABONO:'1023',D13:'5001',D13P1:'9214',AVISO:'6003',FERVENC:'6007',FERPROP:'6006',D13PROP:'6002',AVISOD:'6901'};
// Naturezas sugeridas a partir da Tabela 3 do leiaute S-1.3 (gov.br/esocial) — conferir antes de transmitir. Sem sugestão (preenchimento obrigatório pelo usuário): OUTP, OUTD, ABONOTERCO, FERPTERCO.
function defaultRubricas(){
  const R=(sys,cod,desc,tp,nat,cp,ir,fg,reduz)=>({sys,cod,desc,tp,nat:nat||NAT_SUGERIDA[sys]||'',incCP:cp,incIRRF:ir,incFGTS:fg,reduz:!!reduz,conf:['1000','1409','9200','9201','9203'].includes(nat)?false:false});
  return [
    R('SAL','001','SALÁRIO',1,'1000','11','11','11'),
    R('INSAL','002','ADICIONAL DE INSALUBRIDADE',1,'','11','11','11'),
    R('PERIC','003','ADICIONAL DE PERICULOSIDADE',1,'','11','11','11'),
    R('ADNOT','004','ADICIONAL NOTURNO',1,'','11','11','11'),
    R('HE50','005','HORAS EXTRAS 50%',1,'','11','11','11'),
    R('HE100','006','HORAS EXTRAS 100%',1,'','11','11','11'),
    R('DSRHE','007','DSR SOBRE HORAS EXTRAS',1,'','11','11','11'),
    R('COMIS','008','COMISSÕES',1,'','11','11','11'),
    R('GRAT','009','GRATIFICAÇÕES',1,'','11','11','11'),
    R('OUTP','010','OUTROS PROVENTOS TRIBUTÁVEIS',1,'','11','11','11'),
    R('SALFAM','011','SALÁRIO-FAMÍLIA',1,'1409','00','00','00'),
    R('FALTAS','101','FALTAS INJUSTIFICADAS',2,'','11','11','11',true),
    R('ATRASOS','102','ATRASOS / SAÍDAS ANTECIPADAS',2,'','11','11','11',true),
    R('DSRFALTA','113','DSR PERDIDO POR FALTAS INJUSTIFICADAS',2,'','11','11','11',true),
    R('INSS','103','INSS',2,'9201','00','31','00'),
    R('IRRF','104','IRRF',2,'9203','00','00','00'),
    R('VT','105','VALE-TRANSPORTE (6%)',2,'','00','00','00'),
    R('ADIANT','106','ADIANTAMENTO SALARIAL',2,'9200','00','00','00'),
    R('PENSAO','107','PENSÃO ALIMENTÍCIA',2,'','00','00','00'),
    R('OUTD','108','OUTROS DESCONTOS',2,'','00','00','00'),
    R('FERIAS','012','FÉRIAS',1,'','11','11','11'),
    R('FERTERCO','013','1/3 CONSTITUCIONAL DE FÉRIAS',1,'','11','11','11'),
    R('ABONO','014','ABONO PECUNIÁRIO DE FÉRIAS',1,'','00','00','00'),
    R('ABONOTERCO','015','1/3 S/ ABONO PECUNIÁRIO',1,'','00','00','00'),
    R('D13','016','13º SALÁRIO',1,'','12','12','12'),
    R('D13P1','109','ADIANTAMENTO 13º (1ª PARCELA)',2,'','00','00','00'),
    R('D13INSS','110','INSS S/ 13º SALÁRIO',2,'9201','00','32','00'),
    R('D13IRRF','111','IRRF S/ 13º SALÁRIO',2,'9203','00','00','00'),
    R('AVISO','017','AVISO PRÉVIO INDENIZADO',1,'','00','00','11'),
    R('FERVENC','018','FÉRIAS VENCIDAS INDENIZADAS',1,'','00','00','00'),
    R('FERPROP','019','FÉRIAS PROPORCIONAIS',1,'','00','00','00'),
    R('FERPTERCO','020','1/3 S/ FÉRIAS NA RESCISÃO',1,'','00','00','00'),
    R('D13PROP','021','13º SALÁRIO PROPORCIONAL',1,'','12','12','12'),
    R('AVISOD','112','DESCONTO AVISO PRÉVIO NÃO CUMPRIDO',2,'','00','00','00')
  ];
}

/* ---------------- Banco local ---------------- */
const LS_KEY='folhaPro.v1';
let DB=null,_mem=null;
function emptyDB(){return{ver:1,empresa:null,estabs:[],lotacoes:[],cargos:[],rubricas:defaultRubricas(),empregados:[],comps:{},eventos:[],seq:0,entregues:{},movs:[],ferias:[],decimo:{},rescisoes:{},
  cfg:{ambiente:2,modo:'sim',gateway:'',comp:compAtual()},params:defaultParams()};}
function hidratar(d){const e=emptyDB();const o=Object.assign(e,d,{cfg:Object.assign(e.cfg,d.cfg||{}),params:Object.assign(e.params,d.params||{})});defaultRubricas().forEach(r=>{if(!o.rubricas.some(x=>x.sys===r.sys))o.rubricas.push(r);});o.rubricas.forEach(x=>{if(!x.nat&&NAT_SUGERIDA[x.sys])x.nat=NAT_SUGERIDA[x.sys];});migrar(o);return o;}
function loadDB(){let r=null;try{r=localStorage.getItem(LS_KEY);}catch(e){}if(!r)r=_mem;if(r){try{return hidratar(JSON.parse(r));}catch(e){}}return emptyDB();}
function migrar(o){const E=o.empresa;if(E&&!E.regime){const ct=E.classTrib;E.regime=['01','02','03'].includes(ct)?'sn':'lp';E.anexo=ct==='03'?'iv':ct==='02'?'misto':'std';E.cprb=false;}
  if(E&&E.regime)E.classTrib=classTribDe(E);
  (o.lotacoes||[]).forEach(l=>{if(l.terceiros==null)l.terceiros='';});}
function saveDB(){const s=JSON.stringify(DB);_mem=s;/* com o módulo de segurança presente (navegador), nunca grava em claro */if(typeof SEG!=='undefined'){SEG.persistir(s);return;}try{localStorage.setItem(LS_KEY,s);}catch(e){}}
const uid=(p)=>p+Math.random().toString(36).slice(2,9);
const byId=(arr,id)=>(arr||[]).find(x=>x.id===id);

/* ---------------- Motor de cálculo ---------------- */
function calcInss(base,P){base=Math.min(Math.max(base,0),P.tetoInss);let prev=0,t=0;for(const [lim,al] of P.inss){if(base>prev)t+=(Math.min(base,lim)-prev)*al/100;prev=lim;}return r2(t);}
function impostoTabela(base,P){for(const [lim,al,ded] of P.irrf){if(base<=lim)return Math.max(0,r2(base*al/100-ded));}return 0;}
function calcIrrf(rendTrib,inss,nDep,pensao,P,semRed){
  const dedLegal=inss+nDep*P.depIr+pensao;
  const baseL=Math.max(0,r2(rendTrib-dedLegal)),baseS=Math.max(0,r2(rendTrib-P.simpl));
  const impL=impostoTabela(baseL,P),impS=impostoTabela(baseS,P);
  const simp=impS<impL,base=simp?baseS:baseL,imp=Math.min(impL,impS);
  let red=0;const R=P.redutor;
  if(semRed){}else if(rendTrib<=R.isento)red=imp;else if(rendTrib<R.teto)red=Math.min(imp,Math.max(0,r2(R.a-R.b*rendTrib)));
  return{base,imposto:imp,reducao:r2(red),irrf:Math.max(0,r2(imp-red)),simplificado:simp};
}
const rubBy=(sys)=>DB.rubricas.find(r=>r.sys===sys);
/* Dias de salário do mês: base comercial de 30 dias (CLT, art. 64); contam-se os dias corridos de vínculo no mês, limitados a 30; admissão no dia 31 vale 1 dia; o último dia do mês vale mês cheio. */
function diasSalarioMes(e,comp){const n=diasMes(comp);let ini=1,fim=n;
  if(e.admissao&&e.admissao.slice(0,7)===comp)ini=Number(e.admissao.slice(8,10));
  if(e.desligamento&&e.desligamento.slice(0,7)===comp)fim=Number(e.desligamento.slice(8,10));
  if(ini===1&&fim===n)return 30;
  return Math.max(0,Math.min(30,fim-ini+1));}
/* Afastamento no mês: dias afastados e dias NÃO remunerados pela empresa. Nos afastamentos por incapacidade (motivo 01, 03 ou sem motivo informado), os 15 primeiros dias são pagos pela empresa (Lei 8.213/91, art. 60, §3º); nos demais, o contrato fica suspenso **. */
function afastNaComp(e,comp){if(e.situacao!=='afastado')return{dias:0,naoPagos:0};
  const n=diasMes(comp),ci=comp+'-01',cf=comp+'-'+String(n).padStart(2,'0'),ate=String(e.afastAteComp||'');
  const ini=e.afastIni||ci;let fim=e.afastFim||'';
  if(!fim)fim=ate.length>7?ate:(ate&&ate!=='9999-12'?ate+'-'+String(diasMes(ate)).padStart(2,'0'):'9999-12-31');
  const dn=s=>Math.round(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5);
  const a=ini>ci?ini:ci,b=fim<cf?fim:cf;if(b<a)return{dias:0,naoPagos:0};
  const dias=dn(b)-dn(a)+1;const incap=['','01','03'].includes(String(e.afastMotivo||''));
  const pagos=incap?Math.max(0,Math.min(dn(b),dn(ini)+14)-dn(a)+1):0;
  return{dias,naoPagos:dias-pagos};}
function empAtivoNaComp(e,comp){
  if(e.admissao&&e.admissao.slice(0,7)>comp)return false;
  if(e.desligamento&&e.desligamento.slice(0,7)<comp)return false;
  return true;
}
const LANC_CAMPOS=[['he50','HE 50% (h)'],['he100','HE 100% (h)'],['adnot','Ad. noturno (h)'],['faltas','Faltas (dias)'],['dsrperd','DSR perdido (dias)'],['atrasos','Atrasos (h)'],['comis','Comissões R$'],['grat','Gratificações R$'],['outp','Outros prov. R$'],['adiant','Adiantamento R$'],['outd','Outros desc. R$']];
function calcEmpregado(e,comp,L,P,emp){
  L=L||{};const it=[];const ctx=DB.comps[comp]||{};
  const add=(sys,ref,val,info,sep)=>{if(val>0||info){const r=rubBy(sys);it.push({sys,cod:r.cod,desc:r.desc,tp:r.tp,ref:ref||'',valor:r2(val),sep:!!sep,r});}};
  const dm=diasMes(comp);let dias=diasSalarioMes(e,comp);const diasVinc=dias,alertas=[];
  const af=afastNaComp(e,comp);dias=Math.max(0,dias-af.naoPagos);
  const fer=feriasNoMes(e,comp);dias=Math.max(0,dias-fer.diasGozoMes);
  const sal=num(e.salario);
  const salMes=dias>=30?sal:r2(sal/30*dias);
  const div=num(e.divisor)||P.divisor;
  const peric=e.peric?r2(sal*P.peric/100):0;
  const insal=e.insal?r2(P.salMin*Number(e.insal)/100):0;
  const vh=(sal+peric+insal)/div;
  const vhSal=sal/div;
  add('SAL',dias+' d',salMes);
  if(insal)add('INSAL',e.insal+'%',insal);
  if(peric)add('PERIC',P.peric+'%',peric);
  (DB.ferias||[]).filter(f=>f.empId===e.id&&f.compPgto===comp).forEach(f=>{const c=f.calc;add('FERIAS',f.diasGozo+' d',c.ferias);add('FERTERCO','',c.terco);if(c.abono>0){add('ABONO',f.diasAbono+' d',c.abono);add('ABONOTERCO','',c.abonoTerco);}});
  let hAdn=num(L.adnot);if(hAdn>0&&P.horaNotRed){hAdn=hAdn*60/52.5;alertas.push('Hora noturna reduzida (52min30s) aplicada ao adicional noturno (CLT, art. 73, §1º) **.');}
  if(hAdn>0)add('ADNOT',num(L.adnot)+' h',r2(hAdn*(P.adnotBase==='sal'?vhSal:vh)*P.adNoturno/100));
  const h50=num(L.he50),h100=num(L.he100);
  const vHE50=r2(h50*vh*(1+P.he50/100)),vHE100=r2(h100*vh*(1+P.he100/100));
  if(h50>0)add('HE50',h50+' h',vHE50);
  if(h100>0)add('HE100',h100+' h',vHE100);
  const du=num(ctx.diasUteis),df=num(ctx.domFer);
  if((vHE50+vHE100)>0&&du>0&&df>0)add('DSRHE',df+' d',r2((vHE50+vHE100)/du*df));else if((vHE50+vHE100)>0)alertas.push('DSR sobre horas extras não calculado: informe os dias úteis e os domingos/feriados da competência (Lei 605/1949; Súmula 172 do TST).');
  add('COMIS','',num(L.comis));add('GRAT','',num(L.grat));add('OUTP','',num(L.outp));
  // 13º salário e verbas rescisórias (tributação exclusiva/separada)
  let base13=0,sep13=0,inss13=0,irrf13=0,multaFgts=0,notasRes=[];
  const a13=comp.slice(0,4),d13=(DB.decimo||{})[a13+'|'+e.id];
  const rsAno=!!((DB.rescisoes||{})[e.id]&&e.desligamento&&e.desligamento.slice(0,4)===a13);
  if(d13&&!rsAno){const p1=d13.p1&&d13.p1.comp===comp,p2=d13.p2&&d13.p2.comp===comp;
    if(p2){add('D13',d13.avos+'/12',d13.bruto,0,1);if(!p1&&d13.p1&&d13.p1.valor>0)add('D13P1','',d13.p1.valor,0,1);add('D13INSS','',d13.inss13,0,1);add('D13IRRF','',d13.irrf13,0,1);base13+=d13.bruto;inss13=d13.inss13;irrf13=d13.irrf13;}
    else if(p1){add('D13','1ª parcela',d13.p1.valor,0,1);}}
  const rs=(DB.rescisoes||{})[e.id];
  if(rs&&e.desligamento&&e.desligamento.slice(0,7)===comp){const v=calcRescisaoVerbas(e,rs,P);notasRes=v.notas;multaFgts=v.multaFgts;
    if(v.aviso>0)add('AVISO',v.avisoDias+' d',v.aviso);
    if(v.ferVenc>0){add('FERVENC',rs.ferVencPer+' per',v.ferVenc);add('FERPTERCO','venc.',v.ferVencTerco);}
    if(v.ferProp>0){add('FERPROP',v.avosFer+'/12',v.ferProp);add('FERPTERCO','prop.',v.ferPropTerco);}
    if(v.d13>0){add('D13PROP',v.avos13+'/12',v.d13,0,1);const dd=(DB.decimo||{})[e.desligamento.slice(0,4)+'|'+e.id];if(dd&&dd.p1&&dd.p1.comp<comp&&dd.p1.valor>0)add('D13P1','',dd.p1.valor,0,1);add('D13INSS','',v.inss13,0,1);add('D13IRRF','',v.irrf13,0,1);base13+=v.d13;inss13+=v.inss13;irrf13+=v.irrf13;}
    if(v.avisoDesc>0)add('AVISOD','',v.avisoDesc);}
  // faltas e atrasos
  const fal=num(L.faltas);if(fal>0)add('FALTAS',fal+' d',r2(sal/30*fal));
  let dsp=num(L.dsrperd);if(L.dsrperd===undefined||L.dsrperd===''||L.dsrperd===null){if(P.dsrAuto&&fal>0){const nd=num(ctx.domFer);dsp=nd>0?Math.min(Math.ceil(fal),nd):0;if(dsp>0)alertas.push('DSR perdido apurado automaticamente (um por semana com falta injustificada, limitado aos domingos/feriados da competência): confira a escala (Lei 605/1949, art. 6º) **.');else alertas.push('Faltas lançadas sem DSR perdido: informe os domingos/feriados da competência para a apuração automática **.');}else dsp=0;}
  if(dsp>0)add('DSRFALTA',dsp+' d',r2(sal/30*dsp));
  if(sal>0&&sal<P.salMin)alertas.push('Salário inferior ao mínimo nacional: confirme se há jornada reduzida proporcional (CF, art. 7º, IV).');
  const atr=num(L.atrasos);if(atr>0)add('ATRASOS',atr+' h',r2(vhSal*atr));
  // bases
  let bCP=0,bIR=0,bFG=0,prov=0,desc=0;
  for(const x of it){const r=x.r;if(x.sep)continue;
    if(r.tp===1){prov+=x.valor;if(r.incCP!=='00')bCP+=x.valor;if(r.incIRRF!=='00')bIR+=x.valor;if(r.incFGTS!=='00')bFG+=x.valor;}
    else if(r.tp===2&&r.reduz){desc+=x.valor;bCP-=x.valor;bIR-=x.valor;bFG-=x.valor;}
  }
  bCP=r2(Math.max(0,bCP));bIR=r2(Math.max(0,bIR));bFG=r2(Math.max(0,bFG));
  // salário-família (Lei 8.213/91, art. 65) — limite sobre a remuneração
  let nSF=0;const refD=comp+'-'+String(dm).padStart(2,'0');
  (e.deps||[]).forEach(d=>{if(d.sf&&(d.inv||idadeEm(d.nasc,refD)<=P.salFam.idade))nSF++;});
  /* direito aferido sobre a remuneração que seria devida no mês cheio; cota proporcional aos dias nos meses de admissão e desligamento (Portaria MPS/MF 13/2026) ** */
  let remDev=sal+peric+insal;for(const x of it){if(x.sep)continue;if(x.r.tp===1&&x.r.incCP!=='00'&&!['SAL','FERIAS','FERTERCO','INSAL','PERIC'].includes(x.sys))remDev+=x.valor;}
  const sfOk=nSF>0&&remDev<=P.salFam.limite&&e.categoria!=='103';
  const sfVal=sfOk?r2(nSF*P.salFam.cota*(diasVinc<30?diasVinc/30:1)):0;
  if(sfOk)add('SALFAM',nSF+' dep',sfVal);
  // descontos legais
  const inss=calcInss(bCP,P);
  const nDepIR=(e.deps||[]).filter(d=>d.irrf).length;
  const pensao=num(e.pensao);
  const ir=calcIrrf(bIR,inss,nDepIR,pensao,P);
  if(inss>0)add('INSS',r2(inss/Math.max(bCP,1)*100).toFixed(2)+'%',inss);
  if(ir.irrf>0)add('IRRF','',ir.irrf);
  let vt=0;if(e.optaVT&&num(e.vtValor)>0){vt=r2(Math.min(salMes*P.vtPerc/100,num(e.vtValor)));add('VT',P.vtPerc+'%',vt);}
  add('ADIANT','',num(L.adiant));
  if(pensao>0)add('PENSAO','',pensao);
  add('OUTD','',num(L.outd));
  let totProv=0,totDesc=0;
  for(const x of it){if(x.tp===1)totProv+=x.valor;else if(x.tp===2)totDesc+=x.valor;}
  totProv=r2(totProv);totDesc=r2(totDesc);
  const aliqFg=e.categoria==='103'?P.fgtsAprendiz:P.fgts;
  return{itens:it.map(({r,...o})=>o),totProv,totDesc,liquido:r2(totProv-totDesc),baseCP:bCP,baseIR:bIR,baseFGTS:bFG,
    inss:r2(inss+inss13),irrf:r2(ir.irrf+irrf13),irrfInfo:ir,fgts:r2((bFG+base13)*aliqFg/100),aliqFgts:aliqFg,baseCP13:r2(base13),inss13,irrf13,multaFgts,notasRes,sf:sfVal,dias,alertas,calculadoEm:agoraISO()};
}
/* ---------------- Regimes tributários, estabelecimentos e lotações ---------------- */
const REGIMES={sn:'Simples Nacional',lp:'Lucro Presumido',lr:'Lucro Real'};
const ANEXOS={std:'Anexos I, II, III ou V — CPP recolhida no DAS',iv:'Anexo IV (ou atividade vedada) — CPP recolhida fora do DAS',misto:'Misto — há atividades dos Anexos I–III/V e do Anexo IV'};
/* Tabela 8 do eSocial: 01 substituída; 02 substituída e não substituída; 03 não substituída; 99 demais PJ */
function classTribDe(E){if(!E)return '';if(E.regime==='sn')return E.anexo==='iv'?'03':E.anexo==='misto'?'02':'01';return '99';}
const FPAS_REF={'515':{nome:'Comércio, serviços e demais (FPAS 515)',terc:'0115',perc:5.8},'507':{nome:'Indústria (FPAS 507)',terc:'0079',perc:5.8},'566':{nome:'Agroindústria/cooperativas — conferir (FPAS 566)',terc:'',perc:0}};
function fatorCprb(P,comp){const a=Number((comp||compAtual()).slice(0,4));const f=(P.cprbFrac||{})[a];return f==null?(a<2025?0:100):f;}
/* Regra de incidência para uma lotação: define quais contribuições patronais incidem na folha */
function regraLot(E,l,comp,P){
  P=P||DB.params;if(!E)return{pat:true,rat:true,terc:true,fator:100,nota:''};
  l=l||{};
  if(E.regime==='sn'){
    const nsub=E.anexo==='iv'||(E.anexo==='misto'&&l.atvSimples==='nsub');
    if(!nsub)return{pat:false,rat:false,terc:false,fator:0,nota:'Simples Nacional — CPP substituída: contribuição patronal e RAT já estão no DAS; terceiros dispensados (LC 123/2006, art. 13, §3º).'};
    return{pat:true,rat:true,terc:false,fator:100,nota:'Simples Nacional — atividade com CPP não substituída (Anexo IV): CPP 20% e RAT recolhidos em GPS/DARF via eSocial; terceiros dispensados (LC 123/2006, art. 13, §3º e art. 18, §5º-C).'};
  }
  const cprb=!!E.cprb&&l.cprb!==false&&l.cprb!=='nao';
  if(cprb){const f=fatorCprb(P,comp);return{pat:true,rat:true,terc:true,fator:f,nota:'CPRB: a contribuição patronal de 20% sobre a folha é reduzida e reonerada gradualmente (Lei 14.973/2024). Fator desta competência: '+f+'% da CPP. RAT e terceiros incidem normalmente. A CPRB sobre a receita bruta é apurada fora da folha.'};}
  return{pat:true,rat:true,terc:true,fator:100,nota:(REGIMES[E.regime]||'')+' — incidem CPP 20%, RAT×FAP e terceiros sobre a base previdenciária.'};
}
function encargosEmpresa(res,P,emp,e,comp){
  const est=e?byId(DB.estabs,e.estab):null,lot=e?byId(DB.lotacoes,e.lotacao):null;
  const R=regraLot(emp,lot,comp,P),base=r2(res.baseCP+num(res.baseCP13));
  const pat=R.pat?r2(base*num(emp&&emp.patronal!=null&&emp.patronal!==''?emp.patronal:P.patronal)/100*R.fator/100):0;
  const ratP=est&&est.rat!==''&&est.rat!=null?num(est.rat):num(emp&&emp.rat!=null?emp.rat:P.rat),fapP=est&&est.fap!==''&&est.fap!=null?num(est.fap):num(emp&&emp.fap!=null?emp.fap:P.fap);
  const rat=R.rat?r2(base*ratP*fapP/100):0;
  const tp=lot&&lot.terceiros!==''&&lot.terceiros!=null?num(lot.terceiros):num(emp&&emp.terceiros!=null?emp.terceiros:P.terceiros);
  const terc=R.terc?r2(base*tp/100):0;
  return{patronal:pat,rat,terc,nota:R.nota,regra:R};
}
function calcFolha(comp){
  const P=DB.params;const c=DB.comps[comp]=DB.comps[comp]||{status:'aberta',lanc:{},res:{}};
  c.res={};
  DB.empregados.filter(e=>empAtivoNaComp(e,comp)&&e.situacao!=='desligado'||(e.desligamento&&e.desligamento.slice(0,7)===comp)).forEach(e=>{
    if(!empAtivoNaComp(e,comp))return;
    const rr=calcEmpregado(e,comp,c.lanc[e.id],P,DB.empresa);if(e.situacao==='afastado'&&rr.dias===0&&!rr.itens.length)return;c.res[e.id]=rr;
  });
  c.status='calculada';c.calcEm=agoraISO();saveDB();return c;
}
function totaisComp(comp){
  const c=DB.comps[comp];const t={n:0,prov:0,desc:0,liq:0,inss:0,irrf:0,fgts:0,pat:0,rat:0,terc:0,sf:0};
  if(!c)return t;
  for(const id in c.res){const r=c.res[id];t.n++;t.prov+=r.totProv;t.desc+=r.totDesc;t.liq+=r.liquido;t.inss+=r.inss;t.irrf+=r.irrf;t.fgts+=r.fgts;t.sf+=r.sf;
    const en=encargosEmpresa(r,DB.params,DB.empresa,byId(DB.empregados,id),comp);t.pat+=en.patronal;t.rat+=en.rat;t.terc+=en.terc;}
  for(const k in t)t[k]=k==='n'?t[k]:r2(t[k]);return t;
}



/* Média de variáveis (CLT, art. 142, §§ 3º e 4º): média dos últimos n meses de comissões, gratificações e horas extras/adicional noturno lançados */
function mediaVariaveis(e,compRef,P,n){n=n||12;const meses=[];let [a,m]=compRef.split('-').map(Number);
  for(let i=0;i<n;i++){m--;if(m<1){m=12;a--;}meses.push(a+'-'+String(m).padStart(2,'0'));}
  let tot=0,cont=0;const div=num(e.divisor)||P.divisor,vh=(num(e.salario)+(e.peric?num(e.salario)*P.peric/100:0)+(e.insal?P.salMin*Number(e.insal)/100:0))/div;
  meses.forEach(c=>{if(!empAtivoNaComp(e,c))return;const L=((DB.comps[c]||{}).lanc||{})[e.id];if(!L)return;cont++;
    tot+=num(L.comis)+num(L.grat)+num(L.he50)*vh*(1+P.he50/100)+num(L.he100)*vh*(1+P.he100/100)+num(L.adnot)*vh*P.adNoturno/100;});
  return cont?r2(tot/cont):0;}
/* Vencimentos das guias: dia fixo do mês seguinte, com antecipação/prorrogação para dia útil (feriados nacionais fixos considerados; móveis e locais não) */
function diaUtilAjustado(ano,mes,dia,regra){const fer=['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'];
  const ehUtil=d=>{const w=d.getDay();if(w===0||w===6)return false;const k=String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return !fer.includes(k);};
  let d=new Date(ano,mes-1,dia,12);const passo=regra==='prorroga'?1:-1;while(!ehUtil(d))d=new Date(d.getTime()+passo*864e5);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function vencimentosGuias(comp,P){let [a,m]=comp.split('-').map(Number);m++;if(m>12){m=1;a++;}const v=P.venc||{},reg=v.regra||'antecipa';
  return{inss:diaUtilAjustado(a,m,num(v.inss)||20,reg),fgts:diaUtilAjustado(a,m,num(v.fgts)||20,reg),regra:reg};}

/* ---------------- Férias, 13º salário e rescisão ---------------- */
const remunBase=(e,P,med)=>r2(num(e.salario)+(e.peric?num(e.salario)*P.peric/100:0)+(e.insal?P.salMin*Number(e.insal)/100:0)+num(med));
/* CLT art. 130: dias de férias conforme faltas injustificadas no período aquisitivo */
const diasDireitoFerias=f=>{f=num(f);return f<=5?30:f<=14?24:f<=23?18:f<=32?12:0;};
function calcFerias(e,f,P){const rem=remunBase(e,P,f.media),d=rem/30;const ferias=r2(d*num(f.diasGozo)),terco=r2(ferias/3),abono=r2(d*num(f.diasAbono)),abonoTerco=r2(abono/3);
  return{rem,ferias,terco,abono,abonoTerco,bruto:r2(ferias+terco+abono+abonoTerco)};}
function feriasNoMes(e,comp){let n=0;const dm=diasMes(comp);
  (DB.ferias||[]).filter(f=>f.empId===e.id&&f.ini).forEach(f=>{const ini=new Date(f.ini+'T12:00:00');for(let i=0;i<num(f.diasGozo);i++){const d=new Date(ini.getTime()+i*864e5);const c=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(c===comp)n++;}});
  if(n>=dm)n=30;return{diasGozoMes:Math.min(n,30)};}
function validarFerias(e,f,P){const m=[];const dir=diasDireitoFerias(f.faltas);
  if(!f.ini)m.push('Informe o início do gozo.');if(!f.compPgto)m.push('Informe a competência do pagamento.');
  if(dir===0)m.push('Mais de 32 faltas injustificadas: perda do direito a férias no período (CLT, art. 130, IV).');
  if(num(f.diasGozo)<5)m.push('Período de gozo inferior a 5 dias não é admitido (CLT, art. 134, §1º).');
  if(num(f.diasGozo)+num(f.diasAbono)>dir)m.push('Gozo + abono excedem os '+dir+' dias de direito (CLT, art. 130).');
  if(num(f.diasAbono)>Math.floor(dir/3))m.push('Abono pecuniário limitado a 1/3 do período de férias ('+Math.floor(dir/3)+' dias) (CLT, art. 143).');
  if(f.ini&&f.compPgto&&f.compPgto>f.ini.slice(0,7))m.push('O pagamento deve ocorrer até 2 dias antes do início do gozo (CLT, art. 145): competência de pagamento posterior ao mês do início.');
  if(f.ini&&e.admissao&&f.ini<e.admissao)m.push('Início do gozo anterior à admissão.');
  const dow=f.ini?new Date(f.ini+'T12:00:00').getDay():-1;if(dow===5||dow===6)m.push('AVISO: início do gozo em sábado/domingo ou véspera de repouso/feriado deve ser evitado (CLT, art. 134, §3º — a partir da Lei 13.467/2017, é vedado o início nos dois dias que antecedem feriado ou dia de repouso semanal).');
  return m;}
function avos13(e,ano,fimProj){let n=0;const adm=e.admissao?new Date(e.admissao+'T12:00:00'):null;let des=e.desligamento?new Date(e.desligamento+'T12:00:00'):null;if(des&&fimProj)des=fimProj;
  for(let m=1;m<=12;m++){let a=new Date(ano,m-1,1,12),b=new Date(ano,m,0,12);if(adm&&adm>a)a=adm;if(des&&des<b)b=des;if(b<a)continue;if(Math.round((b-a)/864e5)+1>=15)n++;}return n;}
function calc13(e,ano,P,media,fimProj){const avos=avos13(e,ano,fimProj),base=remunBase(e,P,media),bruto=r2(base/12*avos),p1v=r2(bruto/2);
  const nDep=(e.deps||[]).filter(d=>d.irrf).length;const inss13=calcInss(bruto,P);const ir=calcIrrf(bruto,inss13,nDep,0,P);
  return{avos,base,bruto,p1:p1v,inss13,irrf13:ir.irrf,fgts13:r2(bruto*(e.categoria==='103'?P.fgtsAprendiz:P.fgts)/100),liq2:r2(bruto-p1v-inss13-ir.irrf)};}
const MOTIVOS_RESC={'01':'Justa causa (iniciativa do empregador)','02':'Sem justa causa (iniciativa do empregador)','06':'Término de contrato a termo','07':'Pedido de demissão (iniciativa do empregado)','17':'Rescisão indireta','33':'Acordo entre as partes (CLT, art. 484-A)'};
const AVISOS={indenizado:'Indenizado (empregador dispensa o cumprimento)',trabalhado:'Trabalhado',nao_cumprido:'Não cumprido pelo empregado (desconto)',dispensado:'Dispensado / não aplicável'};
function anosCompletos(ini,fim){const a=new Date(ini+'T12:00:00'),b=new Date(fim+'T12:00:00');let n=b.getFullYear()-a.getFullYear();const an=new Date(b.getFullYear(),a.getMonth(),a.getDate(),12);if(b<an)n--;return Math.max(0,n);}
/* Lei 12.506/2011: 30 dias + 3 por ano completo, até 90 */
const diasAviso=anos=>Math.min(90,30+3*Math.max(0,anos));
function calcRescisaoVerbas(e,r,P){const notas=[],mt=r.motivo;const anos=anosCompletos(e.admissao,e.desligamento);
  const rem=remunBase(e,P,r.media),d=rem/30;let avisoDias=diasAviso(anos),aviso=0,avisoDesc=0;
  const semJC=['02','17','33'].includes(mt);
  if(r.aviso==='indenizado'&&semJC){aviso=r2(d*avisoDias*(mt==='33'?0.5:1));if(mt==='33')notas.push('Acordo (art. 484-A, I, a, CLT): aviso prévio indenizado pela metade.');}
  else if(r.aviso==='nao_cumprido'&&mt==='07'){avisoDesc=r2(rem);notas.push('Aviso prévio não cumprido: desconto de 30 dias de remuneração (CLT, art. 487, §2º).');}
  if(r.aviso!=='indenizado')avisoDias=0;if(!aviso&&!avisoDesc)avisoDias=0;
  const proj=aviso>0?avisoDias:0;const fimProj=proj?new Date(new Date(e.desligamento+'T12:00:00').getTime()+proj*864e5):null;
  if(proj)notas.push('Aviso indenizado projeta o tempo de serviço para 13º e férias proporcionais (CLT, art. 487, §1º; Súmula 371 do TST) **.');
  let avos13c=0,d13=0,inss13=0,irrf13=0;
  if(mt!=='01'){avos13c=avos13(e,Number(e.desligamento.slice(0,4)),fimProj);d13=r2(rem/12*avos13c);
    const nDep=(e.deps||[]).filter(x=>x.irrf).length;inss13=calcInss(d13,P);irrf13=calcIrrf(d13,inss13,nDep,0,P).irrf;}
  else notas.push('Justa causa: sem 13º proporcional nem férias proporcionais (Lei 4.090/62, art. 3º; CLT, art. 146, parágrafo único) **.');
  const ferVencPer=num(r.ferVencPer),ferDobraPer=Math.min(ferVencPer,num(r.ferDobraPer)),ferVenc=r2(rem*(ferVencPer+ferDobraPer)),ferVencTerco=r2(ferVenc/3);
  if(ferDobraPer>0)notas.push('Férias vencidas pagas em dobro em '+ferDobraPer+' período(s) fora do prazo concessivo (CLT, art. 137; o terço incide também sobre a dobra, Súmula 328 do TST) **.');
  let avosFer=0,ferProp=0,ferPropTerco=0;
  if(mt!=='01'){const adm=new Date(e.admissao+'T12:00:00'),fim=fimProj||new Date(e.desligamento+'T12:00:00');
    let ult=new Date(fim.getFullYear(),adm.getMonth(),adm.getDate(),12);if(ult>fim)ult=new Date(fim.getFullYear()-1,adm.getMonth(),adm.getDate(),12);
    ult=new Date(Math.max(ult.getTime(),adm.getTime()));let m=0,cur=new Date(ult);
    while(true){const nx=new Date(cur.getFullYear(),cur.getMonth()+1,cur.getDate(),12);if(nx<=new Date(fim.getTime()+864e5)){m++;cur=nx;}else break;}
    const rest=Math.round((fim-cur)/864e5)+1;avosFer=Math.min(12,m+(rest>=15?1:0));if(avosFer>=12)avosFer=12;
    ferProp=r2(rem/12*avosFer);ferPropTerco=r2(ferProp/3);}
  const multaPct=['02','17'].includes(mt)?40:mt==='33'?20:0;
  const saldoSal=r2(num(e.salario)/30*diasSalarioMes(e,e.desligamento.slice(0,7)));const depRes=r2((saldoSal+aviso+d13)*P.fgts/100);const multaFgts=r2((num(r.saldoFgts)+depRes)*multaPct/100);
  if(multaPct)notas.push('Multa rescisória do FGTS de '+multaPct+(mt==='33'?'% (CLT, art. 484-A, I, b)':'% (Lei 8.036/90, art. 18, §1º)')+', estimada sobre o saldo informado mais os depósitos da rescisão; é paga via FGTS Digital e não integra o líquido **.');
  return{avisoDias:proj||avisoDias,aviso,avisoDesc,avos13:avos13c,d13,inss13,irrf13,ferVenc,ferVencTerco,avosFer,ferProp,ferPropTerco,multaPct,multaFgts,saldoSal,depRes,notas,
    bruto:r2(aviso+d13+ferVenc+ferVencTerco+ferProp+ferPropTerco)};}
/* resumo por estabelecimento e lotação (guias e conferência) */
function resumoEstrutura(comp){const c=DB.comps[comp];const out={estab:{},lot:{},tot:{}};if(!c)return out;
  for(const id in c.res){const r=c.res[id],e=byId(DB.empregados,id);if(!e)continue;const en=encargosEmpresa(r,DB.params,DB.empresa,e,comp);
    for(const [grp,k] of [['estab',e.estab||'—'],['lot',e.lotacao||'—']]){const o=out[grp][k]=out[grp][k]||{n:0,base:0,inss:0,irrf:0,fgts:0,pat:0,rat:0,terc:0};o.n++;o.base+=r.baseCP+num(r.baseCP13);o.inss+=r.inss;o.irrf+=r.irrf;o.fgts+=r.fgts;o.pat+=en.patronal;o.rat+=en.rat;o.terc+=en.terc;}}
  for(const g of ['estab','lot'])for(const k in out[g])for(const f in out[g][k])if(f!=='n')out[g][k][f]=r2(out[g][k][f]);
  return out;}

/* ---------------- eSocial: IDs, XML e eventos ---------------- */
const XV='v_S_01_03_00';
const xe=esc;
const tag=(t,v)=>(v===''||v==null)?'':`<${t}>${xe(v)}</${t}>`;
function ts14(){const d=new Date();const p=n=>String(n).padStart(2,'0');return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds());}
function novoId(){const cnpj=onlyD(DB.empresa&&DB.empresa.cnpj).padEnd(14,'0');DB.seq=(DB.seq||0)+1;return 'ID1'+cnpj+ts14()+String(DB.seq%100000).padStart(5,'0');}
const rz=()=>onlyD(DB.empresa&&DB.empresa.cnpj).slice(0,8);
function ideEmp(){return `<ideEmpregador><tpInsc>1</tpInsc><nrInsc>${rz()}</nrInsc></ideEmpregador>`;}
function exigir(v,rot,e){if(v===undefined||v===null||String(v).trim()==='')throw new Error('Cadastro incompleto — informe '+rot+(e&&e.nome?' do empregado '+e.nome:'')+' antes de gerar o evento.');return v;}
function ideEvt(o){o=o||{};return `<ideEvento>${o.retif?`<indRetif>${o.retif.n}</indRetif>${tag('nrRecibo',o.retif.rec)}`:'<indRetif>1</indRetif>'}${o.per?`${o.noInd?'':'<indApuracao>1</indApuracao>'}<perApur>${o.per}</perApur>`:''}<tpAmb>${DB.cfg.ambiente}</tpAmb><procEmi>1</procEmi><verProc>FolhaPro-1.0</verProc></ideEvento>`;}
function ideEvtTab(){return `<ideEvento><tpAmb>${DB.cfg.ambiente}</tpAmb><procEmi>1</procEmi><verProc>FolhaPro-1.0</verProc></ideEvento>`;}
function envelope(evt,id,corpo){return `<?xml version="1.0" encoding="UTF-8"?>\n<eSocial xmlns="http://www.esocial.gov.br/schema/evt/${evt}/${XV}">\n<${evt} Id="${id}">\n${corpo}\n</${evt}>\n</eSocial>`;}
// versão simples e segura de indentação
function fmtXml(xml){
  const tokens=xml.replace(/>\s*</g,'><').split(/(?=<)|(?<=>)/).filter(Boolean);
  let out=[],ind=0,i=0;
  while(i<tokens.length){
    const t=tokens[i];
    if(/^<\?/.test(t)){out.push(t);i++;continue;}
    if(/^<\//.test(t)){ind=Math.max(0,ind-1);out.push('  '.repeat(ind)+t);i++;continue;}
    if(/^<[^>]+\/>$/.test(t)){out.push('  '.repeat(ind)+t);i++;continue;}
    if(/^</.test(t)){
      if(tokens[i+1]&&!/^</.test(tokens[i+1])&&tokens[i+2]&&/^<\//.test(tokens[i+2])){out.push('  '.repeat(ind)+t+tokens[i+1]+tokens[i+2]);i+=3;continue;}
      out.push('  '.repeat(ind)+t);ind++;i++;continue;}
    i++;
  }
  return out.join('\n');
}
const ENDERECO=e=>`<endereco><brasil>${tag('tpLograd',e.tpLograd||'R')}${tag('dscLograd',e.logr)}${tag('nrLograd',e.nr||'S/N')}${tag('complemento',e.compl)}${tag('bairro',e.bairro)}${tag('cep',onlyD(e.cep))}${tag('codMunic',onlyD(e.codMunic))}${tag('uf',e.uf)}</brasil></endereco>`;

const GEN={};
GEN['S-1000']=(a,o)=>{const E=DB.empresa,id=novoId();
  const corpo=`${ideEvtTab()}${ideEmp()}<infoEmpregador><${a.alt?'alteracao':'inclusao'}><idePeriodo><iniValid>${E.iniValid||compAtual()}</iniValid></idePeriodo><infoCadastro><classTrib>${classTribDe(E)||E.classTrib}</classTrib><indCoop>0</indCoop><indConstr>${E.construtora?1:0}</indConstr><indDesFolha>${E.regime!=='sn'&&E.cprb?1:0}</indDesFolha>${E.porte==='S'&&!['21','22'].includes(String(classTribDe(E)||E.classTrib))?'<indPorte>S</indPorte>':''}<indOptRegEletron>${E.regEletron||0}</indOptRegEletron></infoCadastro></${a.alt?'alteracao':'inclusao'}></infoEmpregador>`;
  return{id,evt:'evtInfoEmpregador',titulo:'Informações do empregador — '+E.razao,ref:'',xml:envelope('evtInfoEmpregador',id,corpo)};};
GEN['S-1005']=(a)=>{const s=byId(DB.estabs,a.id),id=novoId();
  const corpo=`${ideEvtTab()}${ideEmp()}<infoEstab><inclusao><ideEstab><tpInsc>${s.tpInsc}</tpInsc><nrInsc>${onlyD(s.nrInsc)}</nrInsc><iniValid>${s.iniValid||compAtual()}</iniValid></ideEstab><dadosEstab>${tag('cnaePrep',onlyD(s.cnae))}${ratIncide(DB.empresa)?`<aliqGilrat><aliqRat>${s.rat||'2'}</aliqRat>${tag('fap',s.fap)}</aliqGilrat>`:''}</dadosEstab></inclusao></infoEstab>`;
  return{id,evt:'evtTabEstab',titulo:'Estabelecimento — '+s.nome,ref:s.nrInsc,xml:envelope('evtTabEstab',id,corpo)};};
GEN['S-1010']=(a)=>{const r=DB.rubricas.find(x=>x.sys===a.id),id=novoId();
  const corpo=`${ideEvtTab()}${ideEmp()}<infoRubrica><inclusao><ideRubrica><codRubr>${r.cod}</codRubr><ideTabRubr>FOLHAPRO</ideTabRubr><iniValid>${compAtual()}</iniValid></ideRubrica><dadosRubrica><dscRubr>${xe(r.desc)}</dscRubr><natRubr>${r.nat}</natRubr><tpRubr>${r.tp}</tpRubr><codIncCP>${r.incCP}</codIncCP><codIncIRRF>${r.incIRRF}</codIncIRRF><codIncFGTS>${r.incFGTS}</codIncFGTS></dadosRubrica></inclusao></infoRubrica>`;
  return{id,evt:'evtTabRubrica',titulo:'Rubrica '+r.cod+' — '+r.desc,ref:r.cod,xml:envelope('evtTabRubrica',id,corpo)};};
GEN['S-1020']=(a)=>{const l=byId(DB.lotacoes,a.id),id=novoId();
  const corpo=`${ideEvtTab()}${ideEmp()}<infoLotacao><inclusao><ideLotacao><codLotacao>${xe(l.cod)}</codLotacao><iniValid>${compAtual()}</iniValid></ideLotacao><dadosLotacao><tpLotacao>${l.tpLotacao}</tpLotacao>${tag('tpInsc',l.tpInsc)}${tag('nrInsc',onlyD(l.nrInsc))}<fpasLotacao><fpas>${l.fpas}</fpas><codTercs>${DB.empresa&&DB.empresa.regime==='sn'?'0000':(l.codTercs||'0000')}</codTercs></fpasLotacao></dadosLotacao></inclusao></infoLotacao>`;
  return{id,evt:'evtTabLotacao',titulo:'Lotação '+l.cod+' — '+l.desc,ref:l.cod,xml:envelope('evtTabLotacao',id,corpo)};};
GEN['S-2200']=(a,o)=>{const e=byId(DB.empregados,a.id),id=novoId(),car=byId(DB.cargos,e.cargo)||{},lot=byId(DB.lotacoes,e.lotacao)||{},est=byId(DB.estabs,e.estab)||{};
  const deps=(e.deps||[]).map(d=>`<dependente><tpDep>${d.tp}</tpDep><nmDep>${xe(d.nome)}</nmDep><dtNascto>${d.nasc}</dtNascto>${tag('cpfDep',onlyD(d.cpf))}<depIRRF>${d.irrf?'S':'N'}</depIRRF><depSF>${d.sf?'S':'N'}</depSF><incTrab>N</incTrab></dependente>`).join('');
  const corpo=`${ideEvt(o)}${ideEmp()}<trabalhador><cpfTrab>${onlyD(e.cpf)}</cpfTrab><nmTrab>${xe(e.nome)}</nmTrab><sexo>${e.sexo}</sexo><racaCor>${e.racaCor}</racaCor><estCiv>${e.estCiv}</estCiv><grauInstr>${e.grauInstr}</grauInstr><nascimento><dtNascto>${exigir(e.nasc,'a data de nascimento',e)}</dtNascto><paisNascto>105</paisNascto><paisNac>105</paisNac></nascimento>${ENDERECO(e)}${deps}${(e.fone||e.email)?`<contato>${tag('fonePrinc',onlyD(e.fone))}${tag('emailPrinc',e.email)}</contato>`:''}</trabalhador>`+
  `<vinculo><matricula>${xe(e.mat)}</matricula><tpRegTrab>1</tpRegTrab><tpRegPrev>1</tpRegPrev><cadIni>N</cadIni><infoRegimeTrab><infoCeletista><dtAdm>${exigir(e.admissao,'a data de admissão',e)}</dtAdm><tpAdmissao>1</tpAdmissao><indAdmissao>1</indAdmissao><tpRegJor>${e.tpRegJor||1}</tpRegJor><natAtividade>${e.natAtividade||1}</natAtividade>${tag('dtBase',e.dtBase)}<cnpjSindCategProf>${exigir(onlyD(e.sindCnpj),'o CNPJ do sindicato da categoria profissional',e)}</cnpjSindCategProf></infoCeletista></infoRegimeTrab><infoContrato>${tag('nmCargo',car.nome)}${tag('CBOCargo',onlyD(car.cbo||e.cbo))}<codCateg>${e.categoria}</codCateg><remuneracao><vrSalFx>${fx(num(e.salario))}</vrSalFx><undSalFixo>${e.undSalFixo||5}</undSalFixo></remuneracao><duracao><tpContr>${e.tpContr||1}</tpContr>${e.tpContr==2?tag('dtTerm',e.dtTerm):''}</duracao><localTrabalho><localTrabGeral><tpInsc>${est.tpInsc||1}</tpInsc><nrInsc>${onlyD(est.nrInsc||(DB.empresa&&DB.empresa.cnpj))}</nrInsc></localTrabGeral></localTrabalho><horContratual><qtdHrsSem>${e.hrsSem||44}</qtdHrsSem><tpJornada>${e.tpJornada||2}</tpJornada><tmpParc>0</tmpParc><dscJorn>${xe(e.dscJorn||((e.hrsSem||44)+' HORAS SEMANAIS'))}</dscJorn></horContratual></infoContrato></vinculo>`;
  return{id,evt:'evtAdmissao',titulo:'Admissão — '+e.nome,ref:e.mat,xml:envelope('evtAdmissao',id,corpo)};};
GEN['S-2206']=(a)=>{const e=byId(DB.empregados,a.id),m=a.mov,id=novoId(),car=byId(DB.cargos,e.cargo)||{},est=byId(DB.estabs,e.estab)||{};
  const corpo=`${ideEvt()}${ideEmp()}<ideVinculo><cpfTrab>${onlyD(e.cpf)}</cpfTrab><matricula>${xe(e.mat)}</matricula></ideVinculo><altContratual><dtAlteracao>${m.data}</dtAlteracao><vinculo><tpRegPrev>1</tpRegPrev><infoRegimeTrab><infoCeletista><tpRegJor>${e.tpRegJor||1}</tpRegJor><natAtividade>${e.natAtividade||1}</natAtividade><cnpjSindCategProf>${exigir(onlyD(e.sindCnpj),'o CNPJ do sindicato da categoria profissional',e)}</cnpjSindCategProf></infoCeletista></infoRegimeTrab><infoContrato>${tag('nmCargo',car.nome)}${tag('CBOCargo',onlyD(car.cbo||e.cbo))}<codCateg>${e.categoria}</codCateg><remuneracao><vrSalFx>${fx(num(m.novoSalario))}</vrSalFx><undSalFixo>${e.undSalFixo||5}</undSalFixo></remuneracao><duracao><tpContr>${e.tpContr||1}</tpContr></duracao><localTrabalho><localTrabGeral><tpInsc>${est.tpInsc||1}</tpInsc><nrInsc>${onlyD(est.nrInsc||(DB.empresa&&DB.empresa.cnpj))}</nrInsc></localTrabGeral></localTrabalho><horContratual><qtdHrsSem>${e.hrsSem||44}</qtdHrsSem><tpJornada>${e.tpJornada||2}</tpJornada><tmpParc>0</tmpParc><dscJorn>${xe(e.dscJorn||((e.hrsSem||44)+' HORAS SEMANAIS'))}</dscJorn></horContratual></infoContrato></vinculo></altContratual>`;
  return{id,evt:'evtAltContratual',titulo:'Alteração contratual — '+e.nome,ref:e.mat,xml:envelope('evtAltContratual',id,corpo)};};
GEN['S-2230']=(a)=>{const e=byId(DB.empregados,a.id),m=a.mov,id=novoId();
  const corpo=`${ideEvt()}${ideEmp()}<ideVinculo><cpfTrab>${onlyD(e.cpf)}</cpfTrab><matricula>${xe(e.mat)}</matricula></ideVinculo><infoAfastamento>${m.fim?`<fimAfastamento><dtTermAfast>${m.fim}</dtTermAfast></fimAfastamento>`:`<iniAfastamento><dtIniAfast>${m.data}</dtIniAfast><codMotAfast>${m.motivo}</codMotAfast>${m.perAqIni?`<perAquis><dtInicio>${m.perAqIni}</dtInicio><dtFim>${m.perAqFim}</dtFim></perAquis>`:''}</iniAfastamento>`}</infoAfastamento>`;
  return{id,evt:'evtAfastTemp',titulo:'Afastamento — '+e.nome,ref:e.mat,xml:envelope('evtAfastTemp',id,corpo)};};
GEN['S-2299']=(a)=>{const e=byId(DB.empregados,a.id),m=a.mov,id=novoId();
  const comp=m.data.slice(0,7),c=DB.comps[comp],r=c&&c.res[e.id];const lot=byId(DB.lotacoes,e.lotacao)||{},est=byId(DB.estabs,e.estab)||{};
  let verbas='';if(r){const dv=r.itens.filter(i=>i.tp===1||i.tp===2).map(i=>{const ru=DB.rubricas.find(x=>x.sys===i.sys);return `<detVerbas><codRubr>${ru.cod}</codRubr><ideTabRubr>FOLHAPRO</ideTabRubr>${/ d$/.test(i.ref)?`<qtdRubr>${num(i.ref)}</qtdRubr>`:''}<vrRubr>${fx(i.valor)}</vrRubr><indApurIR>${i.sep?1:0}</indApurIR></detVerbas>`;}).join('');
    verbas=`<verbasResc><dmDev><ideDmDev>R${comp.replace('-','')}${e.mat}</ideDmDev><infoPerApur><ideEstabLot><tpInsc>${est.tpInsc||1}</tpInsc><nrInsc>${onlyD(est.nrInsc||(DB.empresa&&DB.empresa.cnpj))}</nrInsc><codLotacao>${xe(lot.cod||'')}</codLotacao>${dv}</ideEstabLot></infoPerApur></dmDev></verbasResc>`;}
  const corpo=`${ideEvt()}${ideEmp()}<ideVinculo><cpfTrab>${onlyD(e.cpf)}</cpfTrab><matricula>${xe(e.mat)}</matricula></ideVinculo><infoDeslig><mtvDeslig>${m.motivo}</mtvDeslig><dtDeslig>${m.data}</dtDeslig><indPagtoAPI>N</indPagtoAPI><pensAlim>0</pensAlim>${verbas}</infoDeslig>`;
  return{id,evt:'evtDeslig',titulo:'Desligamento — '+e.nome,ref:e.mat,xml:envelope('evtDeslig',id,corpo)};};
GEN['S-1200']=(a,o)=>{const e=byId(DB.empregados,a.id),c=DB.comps[a.comp],r=c&&c.res[a.id],id=novoId();
  const lot=byId(DB.lotacoes,e.lotacao)||{},est=byId(DB.estabs,e.estab)||{};
  const verbas=r.itens.filter(i=>i.tp===1||i.tp===2).map(i=>{const ru=DB.rubricas.find(x=>x.sys===i.sys);return `<itensRemun><codRubr>${ru.cod}</codRubr><ideTabRubr>FOLHAPRO</ideTabRubr>${/h$/.test(i.ref)||/d$/.test(i.ref)?`<qtdRubr>${num(i.ref)}</qtdRubr>`:''}<vrRubr>${fx(i.valor)}</vrRubr><indApurIR>${i.sep?1:0}</indApurIR></itensRemun>`;}).join('');
  const corpo=`${ideEvt(Object.assign({per:a.comp},o))}${ideEmp()}<ideTrabalhador><cpfTrab>${onlyD(e.cpf)}</cpfTrab></ideTrabalhador><dmDev><ideDmDev>${a.comp.replace('-','')}${e.mat}</ideDmDev><codCateg>${e.categoria}</codCateg><infoPerApur><ideEstabLot><tpInsc>${est.tpInsc||1}</tpInsc><nrInsc>${onlyD(est.nrInsc||(DB.empresa&&DB.empresa.cnpj))}</nrInsc><codLotacao>${xe(lot.cod||'')}</codLotacao><remunPerApur><matricula>${xe(e.mat)}</matricula>${verbas}</remunPerApur></ideEstabLot></infoPerApur></dmDev>`;
  return{id,evt:'evtRemun',titulo:'Remuneração '+compLabel(a.comp)+' — '+e.nome,ref:a.comp,xml:envelope('evtRemun',id,corpo)};};
GEN['S-1210']=(a,o)=>{const e=byId(DB.empregados,a.id),c=DB.comps[a.comp],r=c&&c.res[a.id],id=novoId();
  const corpo=`${ideEvt(Object.assign({per:a.comp,noInd:1},o))}${ideEmp()}<ideBenef><cpfBenef>${onlyD(e.cpf)}</cpfBenef><infoPgto><dtPgto>${c.dtPgto}</dtPgto><tpPgto>1</tpPgto><perRef>${a.comp}</perRef><ideDmDev>${rescNoMes(a.id,a.comp)?'R':''}${a.comp.replace('-','')}${e.mat}</ideDmDev><vrLiq>${fx(r.liquido)}</vrLiq></infoPgto></ideBenef>`;
  return{id,evt:'evtPgtos',titulo:'Pagamento '+compLabel(a.comp)+' — '+e.nome,ref:a.comp,xml:envelope('evtPgtos',id,corpo)};};
GEN['S-1299']=(a,o)=>{const id=novoId();
  const corpo=`${ideEvt(Object.assign({per:a.comp},o)).replace(/<indRetif>1<\/indRetif>/,'')}${ideEmp()}<infoFech><evtRemun>S</evtRemun><evtPgtos>S</evtPgtos><evtComProd>N</evtComProd><evtContratAvNP>N</evtContratAvNP><evtInfoComplPer>N</evtInfoComplPer></infoFech>`;
  return{id,evt:'evtFechaEvPer',titulo:'Fechamento dos eventos periódicos — '+compLabel(a.comp),ref:a.comp,xml:envelope('evtFechaEvPer',id,corpo)};};
const TIPOS={'S-1000':'Informações do empregador','S-1005':'Estabelecimentos','S-1010':'Rubricas','S-1020':'Lotações tributárias','S-2200':'Admissão','S-2206':'Alteração contratual','S-2230':'Afastamento temporário','S-2299':'Desligamento','S-1200':'Remuneração','S-1210':'Pagamentos','S-1299':'Fechamento periódico'};
const ratIncide=E=>!E||E.regime!=='sn'||E.anexo==='iv'||E.anexo==='misto';
const ORDEM=['S-1000','S-1005','S-1020','S-1010','S-2200','S-2206','S-2230','S-2299','S-1200','S-1210','S-1299'];

function criarEvento(tipo,args,opts){
  const g=GEN[tipo](args,opts);
  const ev={id:g.id,tipo,evt:g.evt,titulo:g.titulo,ref:g.ref,gen:{tipo,args:JSON.parse(JSON.stringify(args))},xml:fmtXml(g.xml),status:'gerado',criado:agoraISO(),ambiente:DB.cfg.ambiente,
    retif:opts&&opts.retif?opts.retif.n:0,opts:opts||null,empId:args.id&&tipo.startsWith('S-2')||tipo==='S-1200'||tipo==='S-1210'?args.id:null,comp:args.comp||null,ocorr:[],historico:[{t:agoraISO(),m:'Evento gerado'+(opts&&opts.retif?' (retificação)':'')}]};
  DB.eventos.unshift(ev);saveDB();return ev;
}
const evPorTipoRef=(tipo,pred)=>DB.eventos.find(e=>e.tipo===tipo&&e.status==='processado'&&(!pred||pred(e)));
/* validação local + dependências (simula a ordem exigida pelo eSocial) */
function validarBase(ev){
  const o=[],E=DB.empresa;if(!E){o.push('Empresa não cadastrada.');return o;}
  if(!cnpjValido(E.cnpj))o.push('CNPJ do empregador inválido.');
  if(!ev.gen)return o;
  const{tipo,args}=ev.gen;
  if(['S-1000'].includes(tipo)&&!E.classTrib)o.push('Informe a classificação tributária (classTrib).');
  if(tipo==='S-2200'||tipo==='S-2206'||tipo==='S-2230'||tipo==='S-2299'||tipo==='S-1200'||tipo==='S-1210'){
    const e=byId(DB.empregados,args.id);if(!e){o.push('Empregado não encontrado.');return o;}
    if(!cpfValido(e.cpf))o.push('CPF do empregado inválido.');
    if(tipo==='S-2200'){['nome','nasc','admissao','salario','mae','logr','cep','codMunic','uf'].forEach(k=>{if(!e[k]||(k==='salario'&&!num(e[k])))o.push('Campo obrigatório ausente no empregado: '+k);});if(!e.lotacao)o.push('Informe a lotação.');if(!e.estab)o.push('Informe o estabelecimento.');}
  }
  if(DB.cfg.modo==='gw'){const rb=DB.rubricas.filter(r=>!r.nat);if(['S-1010','S-1200'].includes(tipo)&&rb.length)o.push('Rubricas sem natureza (Tabela 3 do eSocial): '+rb.map(r=>r.cod).join(', '));}
  /* dependências */
  const simOK=(t,f)=>DB.eventos.some(x=>x.tipo===t&&x.status==='processado'&&(!f||f(x)));
  if(tipo!=='S-1000'&&!simOK('S-1000'))o.push('Dependência: o S-1000 (empregador) ainda não foi processado com sucesso.');
  if(tipo==='S-1200'&&rescNoMes(args.id,args.comp))o.push('Este trabalhador foi desligado na competência: as verbas vão no S-2299, não no S-1200.');
  if(tipo==='S-1200'){if(!simOK('S-2200',x=>x.empId===args.id))o.push('Dependência: S-2200 (admissão) do trabalhador ainda não processado.');if(!simOK('S-1010'))o.push('Dependência: tabela de rubricas (S-1010) ainda não processada.');if(!simOK('S-1020'))o.push('Dependência: tabela de lotações (S-1020) ainda não processada.');}
  if(tipo==='S-1210'){if(rescNoMes(args.id,args.comp)){if(!simOK('S-2299',x=>x.empId===args.id))o.push('Dependência: S-2299 (desligamento, com as verbas rescisórias) ainda não processado.');}else if(!simOK('S-1200',x=>x.empId===args.id&&x.comp===args.comp))o.push('Dependência: S-1200 do trabalhador na competência ainda não processado.');}
  if(tipo==='S-1299'){const c=DB.comps[args.comp];const ids=c?Object.keys(c.res):[];ids.forEach(id=>{if(rescNoMes(id,args.comp)){if(!simOK('S-2299',x=>x.empId===id))o.push('Dependência: S-2299 pendente de '+(byId(DB.empregados,id)||{}).nome);}else if(!simOK('S-1200',x=>x.empId===id&&x.comp===args.comp))o.push('Dependência: S-1200 pendente de '+(byId(DB.empregados,id)||{}).nome);if(!simOK('S-1210',x=>x.empId===id&&x.comp===args.comp))o.push('Dependência: S-1210 pendente de '+(byId(DB.empregados,id)||{}).nome);});}
  return o;
}

const rescNoMes=(id,comp)=>{const e=byId(DB.empregados,id),r=(DB.rescisoes||{})[id];return !!(e&&r&&e.desligamento&&e.desligamento.slice(0,7)===comp);};
const FPAS_OK=/^\d{3}$/;
function validarEvento(ev){const o=validarBase(ev),E=DB.empresa;if(!E||!ev.gen)return o;const{tipo,args}=ev.gen;
  if(tipo==='S-1000'){if(!E.regime)o.push('Informe o regime tributário (Simples Nacional, Lucro Presumido ou Lucro Real).');
    if(E.regime==='sn'&&!E.anexo)o.push('Simples Nacional: informe o enquadramento da CPP (Anexos I–III/V, Anexo IV ou misto).');
    if(E.regime==='sn'&&E.cprb)o.push('CPRB (desoneração) é incompatível com o Simples Nacional.');
    if(E.regime&&E.classTrib&&E.classTrib!==classTribDe(E))o.push('classTrib '+E.classTrib+' não corresponde ao regime informado (esperado '+classTribDe(E)+'). Salve a empresa novamente.');
    if(E.cprb&&!E.cnae)o.push('CPRB: informe o CNAE principal para conferir o enquadramento na atividade desonerada (Lei 12.546/2011, art. 7º-A) **.');}
  if(tipo==='S-1005'){const s=byId(DB.estabs,args.id);if(s){
    if(String(s.tpInsc)==='1'&&!cnpjValido(s.nrInsc))o.push('CNPJ do estabelecimento inválido.');
    if(String(s.tpInsc)==='1'&&onlyD(s.nrInsc).slice(0,8)!==onlyD(E.cnpj).slice(0,8))o.push('O CNPJ do estabelecimento deve ter a mesma raiz (8 primeiros dígitos) do empregador.');
    if(onlyD(s.cnae).length!==7)o.push('CNAE do estabelecimento deve ter 7 dígitos.');
    if(ratIncide(E)){if(![1,2,3].includes(Number(s.rat)))o.push('RAT (grau de risco) deve ser 1, 2 ou 3 conforme o CNAE (Decreto 3.048/99, Anexo V) **.');
      const f=num(s.fap);if(!(f>=0.5&&f<=2))o.push('FAP deve estar entre 0,5000 e 2,0000 (Lei 10.666/2003, art. 10).');}
    if(DB.estabs.filter(x=>x.tpInsc==s.tpInsc&&onlyD(x.nrInsc)===onlyD(s.nrInsc)).length>1)o.push('Inscrição de estabelecimento duplicada.');}}
  if(tipo==='S-1020'){const l=byId(DB.lotacoes,args.id);if(l){
    if(!FPAS_OK.test(String(l.fpas||'')))o.push('FPAS deve ter 3 dígitos (Tabela 4).');
    if(!/^\d{4}$/.test(String(l.codTercs||'')))o.push('Código de terceiros deve ter 4 dígitos (Tabela 4); use 0000 quando não houver recolhimento a terceiros.');
    if(E.regime==='sn'&&String(l.codTercs)!=='0000')o.push('Simples Nacional: terceiros dispensados — use código 0000 (LC 123/2006, art. 13, §3º).');
    if(E.regime!=='sn'&&String(l.codTercs)==='0000')o.push('Lucro Presumido/Real: informe o código de terceiros do FPAS (ex.: 0115 para FPAS 515; 0079 para FPAS 507) **.');
    if(E.regime==='sn'&&E.anexo==='misto'&&!l.atvSimples)o.push('Simples misto: indique se a lotação é de atividade com CPP substituída ou não substituída.');
    if(DB.lotacoes.filter(x=>String(x.cod)===String(l.cod)).length>1)o.push('Código de lotação duplicado.');}}
  if(tipo==='S-2200'){const e=byId(DB.empregados,args.id);if(e){const l=byId(DB.lotacoes,e.lotacao),s=byId(DB.estabs,e.estab);
    if(!l)o.push('Lotação do empregado não existe mais no cadastro.');if(!s)o.push('Estabelecimento do empregado não existe mais no cadastro.');
    if(l&&!DB.eventos.some(x=>x.tipo==='S-1020'&&x.status==='processado'&&x.gen.args.id===l.id))o.push('Dependência: a lotação '+l.cod+' (S-1020) ainda não foi processada.');
    if(s&&!DB.eventos.some(x=>x.tipo==='S-1005'&&x.status==='processado'&&x.gen.args.id===s.id))o.push('Dependência: o estabelecimento '+s.nome+' (S-1005) ainda não foi processado.');}}
  return o;}
