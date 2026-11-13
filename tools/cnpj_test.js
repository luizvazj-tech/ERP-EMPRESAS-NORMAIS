const src=require('fs').readFileSync(__dirname+'/../src/core.js','utf8');
eval(src.match(/const onlyC[\s\S]*?const cnpjGerar[^\n]*/)[0]+';globalThis.v=cnpjValido;globalThis.g=cnpjGerar;globalThis.f=fmtCNPJ;'.replace('fmtCNPJ','(c=>c)'));
const T=[['12ABC34501DE35',true],['12.ABC.345/01DE-35',true],['12ABC34501DE36',false],['11222333000181',true],['11.222.333/0001-81',true],['11222333000182',false],['00000000000000',false],['AAAAAAAAAAAAAA',false],['12abc34501de35',true],['1234567890123',false],['12ABC34501DEAB',false]];
let bad=0;T.forEach(([c,e])=>{const r=v(c);if(r!==e){bad++;console.log('FALHA',c,r,e);}});
for(let i=0;i<2000;i++){const s=[...Array(12)].map(()=>'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random()*36)]).join('');if(!v(g(s))&&!/^(.)\1+$/.test(g(s))){bad++;console.log('gerado inválido',s);}}
console.log(bad?'FALHAS '+bad:'cnpj_test OK ('+T.length+' casos + 2000 gerados)');
