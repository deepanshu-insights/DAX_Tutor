/* DAX Studio — DAX interpreter (parser + filter/row context + context transition),
   "Explain evaluation" tree, slicer-style context selectors, result-based practice grading. */
(()=>{'use strict';
const L=(a,b)=>language==='hi'?b:a;
const fmt=n=>typeof n!=='number'?String(n):Number.isInteger(n)?n.toLocaleString('en-IN'):n.toLocaleString('en-IN',{maximumFractionDigits:4});
const show=v=>v==null?'BLANK':typeof v==='string'?`"${v}"`:typeof v==='boolean'?(v?'TRUE':'FALSE'):v.tbl?`Table (${v.rows.length} rows)`:fmt(v);
const num=v=>v==null?0:typeof v==='number'?v:typeof v==='boolean'?+v:parseFloat(v)||0;
const err=(m,p)=>{const e=new Error(m);e.pos=p;return e};
const fmtErr=(e,c)=>{if(e.pos==null)return e.message;const b=c.slice(0,e.pos),ln=b.split('\n').length,col=e.pos-b.lastIndexOf('\n');return `${e.message} (line ${ln}, column ${col})`};
const distinct=v=>[...new Set(v)];

/* ---------- Lexer ---------- */
function lex(s){const T=[];let i=0;const n=s.length;
 while(i<n){const c=s[i];if(/\s/.test(c)){i++;continue}
  if(c==='/'&&s[i+1]==='/'){while(i<n&&s[i]!=='\n')i++;continue}
  const st=i;let t;
  if(c==='"'){let j=i+1,v='';while(j<n&&!(s[j]==='"'&&s[j+1]!=='"')){if(s[j]==='"'){v+='"';j+=2}else v+=s[j++]}if(j>=n)throw err('Text value is missing its closing quote',st);t={k:'str',v};i=j+1}
  else if(c==="'"){const j=s.indexOf("'",i+1);if(j<0)throw err('Table name is missing its closing quote',st);t={k:'id',v:s.slice(i+1,j),q:1};i=j+1}
  else if(/\d/.test(c)||c==='.'&&/\d/.test(s[i+1]||'')){const m=s.slice(i).match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/);t={k:'num',v:parseFloat(m[0])};i+=m[0].length}
  else if(c==='['){const j=s.indexOf(']',i);if(j<0)throw err('Missing closing ]',st);t={k:'col',v:s.slice(i+1,j)};i=j+1}
  else if(/[A-Za-z_]/.test(c)){const m=s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);t={k:'id',v:m[0]};i+=m[0].length}
  else{const op=['<>','<=','>=','&&','||'].find(o=>s.startsWith(o,i))||c;if(!'+-*/^&=<>(),'.includes(op[0]))throw err(`Unexpected character "${c}"`,st);t={k:'op',v:op};i+=op.length}
  t.s=st;t.e=i;t.ln=(s.slice(0,st).match(/\n/g)||[]).length;T.push(t)}
 return T}

/* ---------- Parser (precedence: || && compare & + - * / ^ unary) ---------- */
const BIN=[['||'],['&&'],['=','<>','<','>','<=','>='],['&'],['+','-'],['*','/'],['^']];
function parse(code){const T=lex(code);let p=0;
 const isOp=v=>T[p]&&T[p].k==='op'&&T[p].v===v,isKw=w=>T[p]&&T[p].k==='id'&&!T[p].q&&T[p].v.toUpperCase()===w;
 const need=v=>{if(!isOp(v))throw err(`Expected "${v}"`+(T[p]?` but found "${code.slice(T[p].s,T[p].e)}"`:' but the formula ended'),T[p]?T[p].s:code.length);return T[p++]};
 function expr(l=0){if(l>=BIN.length)return unary();let a=expr(l+1);while(T[p]&&T[p].k==='op'&&BIN[l].includes(T[p].v)){const o=T[p++],b=expr(l+1);a={t:'bin',o:o.v,a,b,s:a.s,e:b.e,c:code}}return a}
 function unary(){if(isOp('-')||isOp('+')){const o=T[p++],a=unary();return {t:'un',o:o.v,a,s:o.s,e:a.e,c:code}}return prim()}
 function prim(){const t=T[p];if(!t)throw err('The formula ended unexpectedly',code.length);
  if(t.k==='num'){p++;return {t:'num',v:t.v}}if(t.k==='str'){p++;return {t:'str',v:t.v}}
  if(t.k==='col'){p++;return {t:'meas',v:t.v,s:t.s,e:t.e,c:code}}
  if(isOp('(')){p++;const a=expr();const c=need(')');return {...a,s:t.s,e:c.e}}
  if(t.k==='id'){p++;const nx=T[p];
   if(!t.q&&isOp('(')){p++;const a=[];if(!isOp(')'))for(;;){a.push(isOp(',')||isOp(')')?null:full());if(isOp(','))p++;else break}const c=need(')');return {t:'call',v:t.v.toUpperCase(),a,s:t.s,e:c.e,c:code}}
   if(nx&&nx.k==='col'){p++;return {t:'col',v:nx.v,s:t.s,e:nx.e,c:code}}
   return {t:'var',v:t.v,s:t.s,e:t.e,c:code}}
  throw err(`Unexpected "${code.slice(t.s,t.e)}"`,t.s)}
 function full(){if(!isKw('VAR'))return expr();const st=T[p].s,vs=[];
  while(isKw('VAR')){p++;const nm=T[p++];if(!nm||nm.k!=='id')throw err('Expected a variable name after VAR',nm?nm.s:code.length);need('=');vs.push([nm.v,expr()])}
  if(!isKw('RETURN'))throw err('VAR must be followed by RETURN',T[p]?T[p].s:code.length);p++;const r=full();return {t:'let',vs,r,s:st,e:r.e,c:code}}
 const defs=[];let last=null;
 while(p<T.length){let q=p;while(T[q]&&T[q].k==='id'&&!T[q].q&&T[q].ln===T[p].ln)q++;
  const kw=T[p].k==='id'&&['VAR','RETURN'].includes(T[p].v.toUpperCase());
  if(!kw&&q>p&&T[q]&&T[q].k==='op'&&T[q].v==='='&&T[q].ln===T[p].ln){const name=T.slice(p,q).map(t=>t.v).join(' ');p=q+1;defs.push({name,body:full()})}
  else{last=full();if(p<T.length)throw err(`Unexpected "${code.slice(T[p].s,T[p].e)}" — is a comma, operator or bracket missing?`,T[p].s)}}
 return {defs,last}}

/* ---------- Evaluator ---------- */
const BASE={};['Total Sales=SUM(Orders[Sales])','Total Profit=SUM(Orders[Profit])','Order Count=COUNTROWS(Orders)'].forEach(s=>{const[k,v]=s.split('=');BASE[k.toLowerCase()]=parse(v).last});
let DEFS={},STACK=[],ROOTS=[],depth=0;const CAP=6;
const vis=x=>DATA.filter(r=>(!x.rows||x.rows.has(r))&&Object.keys(x.f).every(c=>x.f[c].has(r[c])));
const tr=x=>{const f={...x.f};if(x.row)for(const k in x.row)f[k]=new Set([x.row[k]]);return {...x,f}};
const rowx=(x,r)=>({...x,row:{...x.row,...r}});
const colTable=(c,rows)=>({tbl:1,cols:[c],rows:distinct(rows.map(r=>r[c])).map(v=>({[c]:v}))});
const colv=(n,x)=>{if(n.t!=='col')throw err('This function needs a column such as Orders[Sales]',n.s);return vis(x).map(r=>r[n.v])};
const tbl=(n,x)=>{const v=ev(n,x);if(!v||!v.tbl)throw err('A table was expected here (Orders, FILTER(...), ALL(...), VALUES(...))',n.s);return v};
const xv=(a,x)=>tbl(a[0],x).rows.map(r=>ev(a[1],rowx(x,r)));
const cols=(n,s=new Set())=>{if(!n)return s;if(n.t==='col')s.add(n.v);else[n.a,n.b].forEach(k=>Array.isArray(k)?k.forEach(m=>cols(m,s)):cols(k,s));return s};
const isPred=g=>g.t==='bin'&&['=','<>','<','>','<=','>=','&&','||'].includes(g.o);
const avg=v=>v.length?v.reduce((s,k)=>s+num(k),0)/v.length:null;
const lo=v=>typeof v==='string'?v.toLowerCase():v;
const FN={
 SUM:(a,x)=>colv(a[0],x).reduce((s,v)=>s+num(v),0),AVERAGE:(a,x)=>avg(colv(a[0],x)),
 MIN:(a,x,V)=>a.length>1?Math.min(num(V(0)),num(V(1))):(v=>v.length?Math.min(...v.map(num)):null)(colv(a[0],x)),
 MAX:(a,x,V)=>a.length>1?Math.max(num(V(0)),num(V(1))):(v=>v.length?Math.max(...v.map(num)):null)(colv(a[0],x)),
 COUNT:(a,x)=>colv(a[0],x).filter(v=>v!=null).length,COUNTROWS:(a,x)=>tbl(a[0],x).rows.length,DISTINCTCOUNT:(a,x)=>distinct(colv(a[0],x)).length,
 SUMX:(a,x)=>xv(a,x).reduce((s,v)=>s+num(v),0),AVERAGEX:(a,x)=>avg(xv(a,x)),
 MINX:(a,x)=>{const v=xv(a,x).filter(k=>k!=null);return v.length?Math.min(...v):null},MAXX:(a,x)=>{const v=xv(a,x).filter(k=>k!=null);return v.length?Math.max(...v):null},
 FILTER:(a,x)=>{const t=tbl(a[0],x);return {...t,rows:t.rows.filter(r=>ev(a[1],rowx(x,r)))}},
 ALL:(a)=>a[0]&&a[0].t==='col'?colTable(a[0].v,DATA):{tbl:1,base:1,rows:DATA.slice()},
 VALUES:(a,x)=>a[0].t==='col'?colTable(a[0].v,vis(x)):tbl(a[0],x),
 REMOVEFILTERS:(a,x,V,n)=>{throw err('REMOVEFILTERS only works as a filter argument of CALCULATE',n.s)},
 ALLEXCEPT:(a,x,V,n)=>{throw err('ALLEXCEPT only works as a filter argument of CALCULATE',n.s)},
 CALCULATE:(a,x)=>{const y=tr(x);y.f={...y.f};
  for(const g of a.slice(1)){if(!g)continue;
   if(g.t==='call'&&(g.v==='REMOVEFILTERS'||g.v==='ALL')){if(!g.a[0]||g.a[0].t==='var'){y.f={};y.rows=null}else g.a.forEach(c=>{if(c&&c.t==='col')delete y.f[c.v]})}
   else if(g.t==='call'&&g.v==='ALLEXCEPT'){const keep=g.a.slice(1).map(c=>c.v);for(const k in y.f)if(!keep.includes(k))delete y.f[k];y.rows=null}
   else if(isPred(g)){const cs=[...cols(g)];
    if(cs.length===1){const c=cs[0];y.f[c]=new Set(distinct(DATA.map(r=>r[c])).filter(v=>ev(g,{...x,row:{[c]:v}})))}
    else{const set=new Set(DATA.filter(r=>ev(g,{...x,row:r})));y.rows=y.rows?new Set([...y.rows].filter(r=>set.has(r))):set}}
   else{const t=tbl(g,x);if(t.cols)t.cols.forEach(c=>y.f[c]=new Set(t.rows.map(r=>r[c])));else{y.f={};y.rows=new Set(t.rows)}}}
  return ev(a[0],y)},
 DIVIDE:(a,x,V)=>{const d=num(V(1));return d?num(V(0))/d:(a[2]?V(2):null)},
 IF:(a,x,V)=>V(0)?V(1):(a[2]?V(2):null),
 SWITCH:(a,x,V)=>{const v=V(0);for(let i=1;i+1<a.length;i+=2)if(V(i)===v)return V(i+1);return a.length%2===0?V(a.length-1):null},
 AND:(a,x,V)=>!!V(0)&&!!V(1),OR:(a,x,V)=>!!V(0)||!!V(1),NOT:(a,x,V)=>!V(0),ISBLANK:(a,x,V)=>V(0)==null,BLANK:()=>null,TRUE:()=>true,FALSE:()=>false,
 COALESCE:(a,x,V)=>{for(let i=0;i<a.length;i++){const v=V(i);if(v!=null)return v}return null},
 ROUND:(a,x,V)=>{const m=Math.pow(10,num(V(1)));return Math.round(num(V(0))*m)/m},ABS:(a,x,V)=>Math.abs(num(V(0))),
 SELECTEDVALUE:(a,x,V)=>{const v=distinct(colv(a[0],x));return v.length===1?v[0]:a[1]?V(1):null},HASONEVALUE:(a,x)=>distinct(colv(a[0],x)).length===1,
 RANKX:(a,x,V)=>{const t=tbl(a[0],x),vals=t.rows.map(r=>num(ev(a[1],rowx(x,r)))),cur=num(a[2]?V(2):ev(a[1],x)),asc=a[3]&&String(V(3)).toUpperCase()==='ASC';return 1+vals.filter(v=>asc?v<cur:v>cur).length},
 YEAR:(a,x,V)=>new Date(V(0)).getUTCFullYear(),MONTH:(a,x,V)=>new Date(V(0)).getUTCMonth()+1};
FN.DISTINCT=FN.VALUES;
function bin(n,x){const o=n.o;if(o==='&&')return !!ev(n.a,x)&&!!ev(n.b,x);if(o==='||')return !!ev(n.a,x)||!!ev(n.b,x);
 const a=ev(n.a,x),b=ev(n.b,x);if(o==='&')return (a??'')+''+(b??'');
 if(['=','<>','<','>','<=','>='].includes(o)){const A=lo(a==null?(typeof b==='string'?'':0):a),B=lo(b==null?(typeof a==='string'?'':0):b);return o==='='?A===B:o==='<>'?A!==B:o==='<'?A<B:o==='>'?A>B:o==='<='?A<=B:A>=B}
 const A=num(a),B=num(b);if(o==='+')return A+B;if(o==='-')return A-B;if(o==='*')return A*B;if(o==='^')return Math.pow(A,B);
 if(B===0)throw err('Division by zero. Use DIVIDE(a, b) to handle zero safely',n.s);return A/B}
function evNode(n,x){switch(n.t){
 case'num':case'str':return n.v;
 case'col':if(x.row&&n.v in x.row)return x.row[n.v];throw err(`Orders[${n.v}] has no row to read here. Use it inside an iterator (SUMX, FILTER…) or wrap it in an aggregator such as SUM`,n.s);
 case'var':{const k=n.v;if(k in x.vars)return x.vars[k];if(/^true$/i.test(k))return true;if(/^false$/i.test(k))return false;if(/^(ASC|DESC)$/i.test(k))return k.toUpperCase();if(k.toLowerCase()==='orders')return {tbl:1,base:1,rows:vis(x)};throw err(`Unknown name "${k}"`,n.s)}
 case'meas':{const b=DEFS[n.v.toLowerCase()]||BASE[n.v.toLowerCase()];if(!b)throw err(`Measure [${n.v}] is not defined. Define it in the editor (Name = …) or use [Total Sales], [Total Profit], [Order Count]`,n.s);if(++depth>40)throw err('Measures reference each other in a loop',n.s);try{return ev(b,tr(x))}finally{depth--}}
 case'un':{const v=num(ev(n.a,x));return n.o==='-'?-v:v}
 case'bin':return bin(n,x);
 case'let':{const x2={...x,vars:{...x.vars}},cur=STACK[STACK.length-1];if(cur)cur.vars=[];for(const[nm,e]of n.vs){const v=ev(e,x2);x2.vars[nm]=v;if(cur)cur.vars.push([nm,show(v)])}return ev(n.r,x2)}
 case'call':{const F=FN[n.v];if(!F)throw err(`${n.v}() is not supported by this simulator yet. Supported: ${Object.keys(FN).join(', ')}`,n.s);return F(n.a,x,i=>ev(n.a[i],x),n)}}}
function ev(n,x){if(n.t!=='call'&&n.t!=='meas'&&n.t!=='let')return evNode(n,x);
 const node={fn:n.t==='meas'?'['+n.v+']':n.t==='let'?'VAR':n.v,src:n.c.slice(n.s,n.e),kids:[],more:0,x},par=STACK[STACK.length-1];
 if(par){if(par.kids.length<CAP)par.kids.push(node);else par.more++}else ROOTS.push(node);
 STACK.push(node);try{return node.out=evNode(n,x)}catch(e){node.err=e.message;throw e}finally{STACK.pop()}}
function run(code,base={}){STACK=[];ROOTS=[];depth=0;DEFS={};const P=parse(code);P.defs.forEach(d=>DEFS[d.name.toLowerCase()]=d.body);
 const x={f:{},rows:null,row:null,vars:{}};for(const c in base)if(base[c])x.f[c]=new Set([base[c]]);
 let name,node;if(P.last){name='Result';node=P.last}else if(P.defs.length){const d=P.defs[P.defs.length-1];name=d.name;node={t:'meas',v:d.name,s:d.body.s,e:d.body.e,c:code}}else throw err('Type a formula first',0);
 const value=ev(node,x);return {name,value,roots:ROOTS,x,rows:vis(x).length}}

/* ---------- Plain-language docs (EN / Hinglish) ---------- */
const DOC={SUM:['Adds up the column over the rows currently visible in the filter context.','Filter context ki visible rows par column ko jodta hai.'],AVERAGE:['Sum of visible values divided by their count.','Visible values ka sum ÷ count.'],MIN:['Smallest value among visible rows.','Visible rows mein sabse chhoti value.'],MAX:['Largest value among visible rows.','Visible rows mein sabse badi value.'],COUNTROWS:['Counts the rows of a table in the current context.','Current context mein table ki rows ginta hai.'],DISTINCTCOUNT:['Counts unique values; repeats are counted once.','Unique values ginta hai; repeat ek baar.'],
SUMX:['Iterator: for every row it evaluates the expression (row context), then adds the results.','Iterator: har row par expression evaluate karta hai (row context), phir sab jodta hai.'],AVERAGEX:['Iterator: evaluates per row, then averages.','Iterator: har row par evaluate, phir average.'],MAXX:['Iterator: evaluates per row, keeps the largest.','Iterator: har row par evaluate, sabse bada rakhta hai.'],MINX:['Iterator: evaluates per row, keeps the smallest.','Iterator: har row par evaluate, sabse chhota rakhta hai.'],
CALCULATE:['Changes the filter context using its filter arguments, then evaluates the first argument. Inside a row context it also turns the current row into filters (context transition).','Filter arguments se filter context badalta hai, phir pehla argument evaluate karta hai. Row context mein current row ko filter bana deta hai (context transition).'],
FILTER:['Returns only the rows of a table where the condition is true; the condition runs once per row.','Table ki sirf wahi rows deta hai jahan condition true ho; condition har row par chalti hai.'],ALL:['Ignores filters: returns the whole table or all distinct values of a column.','Filters ignore karta hai: poori table ya column ki saari distinct values.'],REMOVEFILTERS:['Clears filters on a table or column inside CALCULATE.','CALCULATE ke andar table/column ke filters hata deta hai.'],ALLEXCEPT:['Clears every filter except the listed columns.','Listed columns ke alawa sab filters hata deta hai.'],VALUES:['Distinct values of a column that are visible in the current context.','Current context mein visible column ki distinct values.'],
DIVIDE:['Safe division: returns the alternate result (or BLANK) instead of an error when the denominator is 0.','Safe division: denominator 0 ho to error ki jagah alternate result (ya BLANK) deta hai.'],IF:['Returns one result if the condition is TRUE, otherwise another.','Condition TRUE ho to ek result, warna doosra.'],SWITCH:['Compares a value to several options and returns the first match (SWITCH(TRUE(), …) tests conditions).','Value ko options se compare karke pehla match deta hai (SWITCH(TRUE(),…) conditions test karta hai).'],RANKX:['Evaluates the expression for each table row and returns the rank of the current value.','Table ki har row par expression evaluate karke current value ka rank deta hai.'],SELECTEDVALUE:['Returns the value when exactly one is visible, otherwise the alternate.','Sirf ek value visible ho to wahi, warna alternate.'],VAR:['VAR stores a value once so RETURN can reuse it — faster and easier to read.','VAR value ek baar store karta hai; RETURN use reuse karta hai — fast aur readable.']};

/* ---------- Explain UI ---------- */
const chips=x=>{const p=[],k=Object.keys(x.f);if(k.length>3)p.push(L('context transition → one row','context transition → ek row'));else k.forEach(c=>p.push(`${c} ∈ {${[...x.f[c]].slice(0,4).join(', ')}}`));if(x.rows&&k.length<=3)p.push(L('table filter','table filter'));if(x.row)p.push('row: '+(x.row.OrderID?'Order '+x.row.OrderID:Object.values(x.row).join(', ')));p.push(`${vis(x).length}/${DATA.length} ${L('rows in scope','rows scope mein')}`);return p.map(s=>`<span class="ex-chip">${esc(s)}</span>`).join('')};
function nodeHtml(n,d){const m=n.fn[0]==='[',k=n.fn,doc=m?L('Measure reference: runs the measure formula in the current filter context. Inside a row context it also triggers context transition.','Measure reference: measure ki formula current filter context mein chalti hai. Row context mein context transition bhi hota hai.'):DOC[k]?L(...DOC[k]):L('Built-in DAX function.','Built-in DAX function.');
 return `<details class="ex-n"${d<2?' open':''}><summary><b class="ex-fn">${esc(k)}</b> <code>${esc(n.src.length>64?n.src.slice(0,62)+'…':n.src)}</code> <span class="ex-out${n.err?' bad':''}">→ ${esc(n.err||show(n.out))}</span></summary><div class="ex-b"><p>${doc}</p>${(n.vars||[]).map(v=>`<div class="ex-var">VAR ${esc(v[0])} = <b>${esc(v[1])}</b></div>`).join('')}<div>${chips(n.x)}</div>${n.kids.map(c=>nodeHtml(c,d+1)).join('')}${n.more?`<div class="ex-more">… +${n.more} ${L('more evaluations (remaining rows)','aur evaluations (baaki rows)')}</div>`:''}</div></details>`}
const ctxBase=()=>({Region:$('#ctxRegion')?.value,Category:$('#ctxCat')?.value});
const ctxText=()=>Object.entries(ctxBase()).filter(e=>e[1]).map(e=>e.join(' = ')).join(', ')||'All data';
let ep;
function explain(){const code=$('#daxEditor').value;ep.hidden=false;
 try{const r=run(code,ctxBase());ep.innerHTML=`<div class="ex-head"><div><div class="result-caption">${esc(r.name)} · ${L('filter context','filter context')}: ${esc(ctxText())}</div><div class="result-number">${esc(show(r.value))}</div></div><div class="pill">${L('Evaluation tree — click a step to expand','Evaluation tree — step par click karke kholo')}</div></div>${r.roots.map(n=>nodeHtml(n,0)).join('')}`}
 catch(e){ep.innerHTML=`<div class="callout"><b>✘ ${L('Error','Error')}</b><p>${esc(fmtErr(e,code))}</p></div>`+(ROOTS.length?ROOTS.map(n=>nodeHtml(n,0)).join(''):'')}}

/* ---------- Playground wiring ---------- */
evalDax=function(code){try{const r=run(code,ctxBase()),v=r.value;return {name:r.name,value:v&&v.tbl?`Table · ${v.rows.length} rows`:v===null?'BLANK':typeof v==='boolean'?(v?'TRUE':'FALSE'):v,desc:`Evaluated by the DAX interpreter · filter context: ${ctxText()}.`,rows:r.rows}}catch(e){return {name:'Error',unsupported:true,message:fmtErr(e,code)}}};
const lab=$('#view-lab');
if(lab){const opt=c=>`<select id="${c==='Region'?'ctxRegion':'ctxCat'}"><option value="">All</option>${distinct(DATA.map(r=>r[c])).map(v=>`<option>${v}</option>`).join('')}</select>`;
 const bar=document.createElement('div');bar.className='ctxbar';bar.innerHTML=`<b>🎚 ${L('Filter context (like slicers)','Filter context (slicers jaisa)')}</b><label>Region ${opt('Region')}</label><label>Category ${opt('Category')}</label><span class="pill">${L('Run and Explain use this context — watch one measure change.','Run aur Explain isi context ko use karte hain — ek measure ko badalte dekho.')}</span>`;
 lab.querySelector('.dataset-controls').after(bar);
 const eb=document.createElement('button');eb.className='ghostbtn';eb.id='explainDax';eb.textContent='🧠 Explain evaluation';($('#stepDax')||$('#runDax')).after(eb);
 ep=document.createElement('div');ep.id='explainPanel';ep.className='ex';ep.hidden=true;($('#stepPanel')||lab.querySelector('.output')).after(ep);
 eb.onclick=()=>{explain();ep.scrollIntoView({behavior:'smooth',block:'nearest'})};
 $('#runDax').addEventListener('click',()=>{if(!ep.hidden)explain()});['#ctxRegion','#ctxCat'].forEach(s=>$(s).onchange=()=>{runFormula();if(!ep.hidden)explain()});
 $('#checkDax').onclick=()=>{const code=$('#daxEditor').value,o=$('#outputBody');$('#runBadge').textContent='Syntax check';
  try{const P=parse(code),fns=distinct((code.match(/\b[A-Za-z]+(?=\s*\()/g)||[]).map(s=>s.toUpperCase())),unk=fns.filter(f=>!FN[f]);
   o.innerHTML=`<div class="callout"><b>✔ ${L('Formula parses correctly','Formula sahi parse hui')}</b><p>${P.defs.length} ${L('measure definition(s)','measure definition(s)')}${fns.length?' · '+L('uses','use karta hai')+' '+fns.join(', '):''}.</p>${unk.length?`<p>⚠ ${esc(unk.join(', '))} ${L('is valid DAX but not executable in this simulator yet.','valid DAX hai par is simulator mein abhi execute nahi hota.')}</p>`:''}</div>`}
  catch(e){o.innerHTML=`<div class="callout" style="border-color:var(--red)"><b>✘ ${L('Syntax problem','Syntax problem')}</b><p>${esc(fmtErr(e,code))}</p></div>`}}}

/* ---------- Practice: result-based grading + advanced challenges ---------- */
challenges.push(
{title:'Share of total sales',task:'Return this selection\'s sales as a share of sales across ALL orders (0–1).',hint:'DIVIDE the current sales by CALCULATE([Total Sales], ALL(Orders)).',code:'Sales Share = DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Orders)))'},
{title:'Count large orders',task:'Count orders whose Sales are above 300.',hint:'COUNTROWS over FILTER(Orders, condition).',code:'Large Orders = COUNTROWS(FILTER(Orders, Orders[Sales] > 300))'},
{title:'Ignore the Region filter',task:'Total sales that ignore any Region selection but still respect other filters.',hint:'CALCULATE with REMOVEFILTERS(Orders[Region]).',code:'Sales All Regions = CALCULATE([Total Sales], REMOVEFILTERS(Orders[Region]))'},
{title:'Profit per order',task:'Average profit per order, safe against zero orders.',hint:'DIVIDE two existing measures.',code:'Profit per Order = DIVIDE([Total Profit], [Order Count])'},
{title:'Big-ticket sales with VAR',task:'Use a VAR named threshold = 300, then sum Sales for orders above it.',hint:'VAR threshold = 300 RETURN SUMX(FILTER(Orders, Orders[Sales] > threshold), Orders[Sales])',code:'Big Sales =\nVAR threshold = 300\nRETURN SUMX(FILTER(Orders, Orders[Sales] > threshold), Orders[Sales])'},
{title:'Sales tier label',task:'Return "High" when total sales exceed 3000, otherwise "Low".',hint:'IF([Total Sales] > 3000, "High", "Low")',code:'Sales Tier = IF([Total Sales] > 3000, "High", "Low")'},
{title:'Average row margin',task:'Average of Profit ÷ Sales calculated for each order row.',hint:'AVERAGEX is an iterator; use DIVIDE inside it.',code:'Avg Row Margin = AVERAGEX(Orders, DIVIDE(Orders[Profit], Orders[Sales]))'},
{title:'Best region\'s sales',task:'Sales of the single best-selling Region, whatever Region is selected.',hint:'MAXX over ALL(Orders[Region]) evaluating [Total Sales] — context transition does the work.',code:'Top Region Sales = MAXX(ALL(Orders[Region]), [Total Sales])'});
const CTX=[{},{Region:'West'},{Category:'Furniture'},{Region:'East',Category:'Technology'}];
const same=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(b)):a===b||(a==null&&b==null);
const rc=renderChallenge;
renderChallenge=function(){rc();const c=challenges[currentChallenge],ta=$('#challengeAnswer'),row=$('#checkChallenge').parentElement;
 ta.value='';ta.placeholder=L('My Measure = …  (any correct way counts)','My Measure = …  (koi bhi sahi tareeka chalega)');ta.style.minHeight='120px';
 row.insertAdjacentHTML('beforeend',`<button class="ghostbtn" id="explainChallenge">🧠 ${L('Explain','Explain')}</button><button class="ghostbtn" id="solutionChallenge">${L('Solution','Solution')}</button>`);
 $('#checkChallenge').onclick=()=>{const code=ta.value,f=$('#challengeFeedback');
  if(!code.trim()){f.className='feedback show no';f.textContent=L('Write your measure first.','Pehle apna measure likho.');return}
  let bad=null;const rows=CTX.map(b=>{let u,e;try{u=run(code,b).value}catch(er){bad=bad||fmtErr(er,code);return {b,u:'error',e:'—',ok:false}}e=run(c.code,b).value;return {b,u:show(u),e:show(e),ok:same(u,e)}}),ok=rows.every(r=>r.ok);
  f.className='feedback show '+(ok?'ok':'no');
  f.innerHTML=`<b>${ok?L('✔ Correct — it matches in every filter context, so any valid way of writing it counts.','✔ Sahi — har filter context mein match hua, isliye koi bhi valid tareeka chalega.'):L('✘ Not matching yet — compare the contexts below.','✘ Abhi match nahi hua — neeche contexts compare karo.')}</b>${bad?`<div>${esc(bad)}</div>`:''}<table class="ex-t"><tr><th>${L('Filter context','Filter context')}</th><th>${L('Yours','Aapka')}</th><th>${L('Expected','Expected')}</th><th></th></tr>${rows.map(r=>`<tr><td>${esc(Object.values(r.b).join(' + ')||'All data')}</td><td>${esc(r.u)}</td><td>${esc(r.e)}</td><td>${r.ok?'✓':'✗'}</td></tr>`).join('')}</table>`;
  if(ok&&!passed.includes(currentChallenge)){passed.push(currentChallenge);saveState()}};
 $('#solutionChallenge').onclick=()=>{const h=$('#challengeHint');h.style.display='block';h.innerHTML=`<b>${L('Solution','Solution')}</b><pre style="margin:6px 0 0;white-space:pre-wrap;font:12px/1.6 ui-monospace,monospace">${esc(c.code)}</pre>`};
 $('#explainChallenge').onclick=()=>{view('lab');$('#daxEditor').value=ta.value.trim()||c.code;if(!ta.value.trim())toast(L('Showing the solution — write your own to explain it','Solution dikh raha hai — apna likho to wahi explain hoga'));setTimeout(explain,60)}};
renderChallenge();

/* ---------- Styles ---------- */
const css=document.createElement('style');css.textContent=`.ctxbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:14px 0;padding:11px 14px;border:1px solid var(--line);border-radius:13px;background:var(--surface)}.ctxbar label{font-size:12px;font-weight:700;display:flex;gap:6px;align-items:center}.ctxbar select{border:1px solid var(--line);border-radius:9px;padding:7px;background:var(--surface);color:var(--ink)}
.ex{margin-top:12px;border:1px solid var(--line);border-radius:15px;background:var(--surface);padding:14px}.ex-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;margin-bottom:8px}
.ex-n{margin:6px 0;border-left:2px solid var(--line);padding-left:10px}.ex-n>summary{cursor:pointer;font-size:13px;list-style:none}.ex-n>summary::-webkit-details-marker{display:none}.ex-n>summary::before{content:"▸ ";color:var(--muted)}.ex-n[open]>summary::before{content:"▾ "}
.ex-fn{color:var(--accent)}.ex-n code{font:12px ui-monospace,Consolas,monospace;color:var(--muted)}.ex-out{font-weight:800;color:var(--teal);margin-left:4px}.ex-out.bad{color:var(--red)}
.ex-b{padding:2px 0 4px}.ex-b>p{margin:4px 0 6px;font-size:12.5px;color:var(--muted)}.ex-chip{display:inline-block;margin:0 5px 5px 0;padding:2px 8px;border-radius:999px;background:#6c5ce714;color:var(--accent);font-size:11px;font-weight:700}.ex-var{font-size:12px;margin:2px 0}.ex-more{font-size:11px;color:var(--muted);margin:4px 0}
.ex-t{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}.ex-t th,.ex-t td{padding:5px 8px;border-top:1px solid var(--line);text-align:left}`;
document.head.appendChild(css);
})();
