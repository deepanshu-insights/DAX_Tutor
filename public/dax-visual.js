/* DAX Studio — Formula Animator + Step-by-step IDE.
   Uses globals from index.html: DATA, lessons, currentLesson, language, $, esc, view, toast. */
(()=>{'use strict';
const L=(a,b)=>language==='hi'?b:a;
const fmt=n=>typeof n!=='number'?String(n):Number.isInteger(n)?n.toLocaleString('en-IN'):n.toLocaleString('en-IN',{maximumFractionDigits:4});
const LAB={SUM:['Running total','Chalta total'],COUNTROWS:['Rows counted','Rows ki ginti'],AVERAGE:['Running sum','Chalta sum'],DISTINCTCOUNT:['Distinct values','Alag values'],SUMX:['Running total','Chalta total'],MAX:['Highest so far','Ab tak ka max'],MIN:['Lowest so far','Ab tak ka min'],DIVIDE:['Result','Result']};
const DEMO={CALCULATE:'West Sales = CALCULATE([Total Sales], Orders[Region] = "West")',SUMX:'Sales Less Profit = SUMX(Orders, Orders[Sales] - Orders[Profit])',DIVIDE:'Profit Margin = DIVIDE([Total Profit], [Total Sales], 0)',DISTINCTCOUNT:'Unique Customers = DISTINCTCOUNT(Orders[Customer])',AVERAGE:'Average Order Value = AVERAGE(Orders[Sales])',COUNTROWS:'Order Count = COUNTROWS(Orders)',MAX:'Biggest Order = MAX(Orders[Sales])',MIN:'Smallest Order = MIN(Orders[Sales])',SUM:'Total Sales = SUM(Orders[Sales])'};
const demoFor=c=>{const k=Object.keys(DEMO).find(k=>new RegExp('\\b'+k+'\\s*\\(','i').test(c));return k?DEMO[k]:null};

/* Turn a formula into an ordered list of execution steps (same subset as the Run simulator). */
function build(code){
 const c=code.trim(),name=(c.split('=')[0]||'Measure').trim();
 const rg=c.match(/Orders\[Region\]\s*=\s*"([^"]+)"/i),ct=c.match(/Orders\[Category\]\s*=\s*"([^"]+)"/i),gt=c.match(/Orders\[Sales\]\s*>\s*(\d+(?:\.\d+)?)/i),fl=[];
 if(rg)fl.push([`Region = "${rg[1]}"`,r=>r.Region.toLowerCase()===rg[1].toLowerCase(),rg[0]]);
 if(ct)fl.push([`Category = "${ct[1]}"`,r=>r.Category.toLowerCase()===ct[1].toLowerCase(),ct[0]]);
 if(gt)fl.push([`Sales > ${gt[1]}`,r=>r.Sales>Number(gt[1]),gt[0]]);
 const cap=s=>s[0].toUpperCase()+s.slice(1).toLowerCase();
 let m,fn,col,sign=1,hl;
 if(m=c.match(/SUM\s*\(\s*Orders\[(Sales|Profit)\]\s*\)/i)){fn='SUM';col=cap(m[1])}
 else if(m=c.match(/COUNTROWS\s*\(\s*Orders\s*\)/i))fn='COUNTROWS';
 else if(m=c.match(/AVERAGE\s*\(\s*Orders\[(Sales|Profit)\]\s*\)/i)){fn='AVERAGE';col=cap(m[1])}
 else if(m=c.match(/DISTINCTCOUNT\s*\(\s*Orders\[(Customer|Region|Category|Product)\]\s*\)/i)){fn='DISTINCTCOUNT';col=cap(m[1])}
 else if(m=c.match(/DIVIDE\s*\(\s*\[Total Profit\]\s*,\s*\[Total Sales\]/i))fn='DIVIDE';
 else if(m=c.match(/SUMX\s*\(\s*Orders\s*,\s*Orders\[Sales\]\s*([-+])\s*Orders\[Profit\]\s*\)/i)){fn='SUMX';sign=m[1]==='-'?-1:1}
 else if(m=c.match(/MAX\s*\(\s*Orders\[Sales\]\s*\)/i))fn='MAX';
 else if(m=c.match(/MIN\s*\(\s*Orders\[Sales\]\s*\)/i))fn='MIN';
 else if(/\bCALCULATE\b/i.test(c)&&fl.length){fn='SUM';col='Sales';m=c.match(/\bCALCULATE\b/i)}
 else return null;
 hl=m[0];const calc=/\bCALCULATE\b/i.test(c)&&fl.length>0;
 const idx=DATA.map((r,i)=>i).filter(i=>fl.every(f=>f[1](DATA[i]))),rows=idx.map(i=>DATA[i]),n=rows.length;
 const S=[],lab=LAB[fn],st={acc:fn==='MAX'||fn==='MIN'?null:0,set:new Set()},vals=[];
 const push=(o)=>S.push(Object.assign({n:0,act:-1,f:false,hl,acc:null},o));
 push({ti:L('1 · Read the formula','1 · Formula padho'),tx:L(`Reading ${name}. The main function is ${fn}. DAX works from the inside out, so first we find which rows are in scope.`,`${name} padha. Main function ${fn} hai. DAX andar se bahar chalta hai, isliye pehle dekhte hain kaun si rows scope mein hain.`)});
 if(fl.length)push({ti:L('2 · Filter context','2 · Filter context'),f:true,hl:fl.map(f=>f[2])[0],tx:L(`${calc?'CALCULATE changes the filter context':'The filter applies'}: ${fl.map(f=>f[0]).join(' AND ')}. ${n} of ${DATA.length} rows stay visible; faded rows are ignored.`,`${calc?'CALCULATE filter context badalta hai':'Filter lagta hai'}: ${fl.map(f=>f[0]).join(' AND ')}. ${DATA.length} mein se ${n} rows bachi hain; fade rows ignore hoti hain.`)});
 const f=!!fl.length;let val;
 if(fn==='DIVIDE'){
  const num=rows.reduce((s,r)=>s+r.Profit,0),den=rows.reduce((s,r)=>s+r.Sales,0);val=den?num/den:0;
  push({f,all:true,n,hl:'[Total Profit]',acc:num,lab:['Numerator','Numerator'],ti:L('Numerator','Numerator'),tx:L(`Evaluate [Total Profit] over all ${n} visible rows = ${fmt(num)}.`,`[Total Profit] ${n} visible rows par = ${fmt(num)}.`)});
  push({f,all:true,n,hl:'[Total Sales]',acc:den,lab:['Denominator','Denominator'],ti:L('Denominator','Denominator'),tx:L(`Evaluate [Total Sales] the same way = ${fmt(den)}.`,`[Total Sales] bhi isi tarah = ${fmt(den)}.`)});
  push({f,all:true,n,acc:den,lab:['Denominator','Denominator'],ti:L('Safety check','Safety check'),tx:den?L('Denominator is not zero, so DIVIDE can safely divide. (If it were 0 or BLANK, DIVIDE would return the alternate result instead of an error.)','Denominator zero nahi hai, isliye DIVIDE safely divide karta hai. (Zero hota to error ki jagah alternate result milta.)'):L('Denominator is 0, so DIVIDE returns the alternate result 0 instead of an error.','Denominator 0 hai, isliye DIVIDE error ki jagah alternate result 0 deta hai.')});
 }else{
  rows.forEach((r,j)=>{let v,en,hi;
   if(fn==='SUM'){v=r[col];st.acc+=v;en=`Add ${col} ${v} → total ${fmt(st.acc)}`;hi=`${col} ${v} jodo → total ${fmt(st.acc)}`}
   else if(fn==='COUNTROWS'){v=1;st.acc++;en=`Count this row → ${st.acc}`;hi=`Is row ko gino → ${st.acc}`}
   else if(fn==='AVERAGE'){v=r[col];st.acc+=v;en=`Add ${v} to running sum → ${fmt(st.acc)}`;hi=`${v} sum mein jodo → ${fmt(st.acc)}`}
   else if(fn==='DISTINCTCOUNT'){v=r[col];if(st.set.has(v)){en=`"${v}" was already seen — skip it`;hi=`"${v}" pehle aa chuka — skip`}else{st.set.add(v);st.acc++;en=`"${v}" is new → distinct count ${st.acc}`;hi=`"${v}" naya hai → distinct count ${st.acc}`}}
   else if(fn==='SUMX'){v=r.Sales+sign*r.Profit;st.acc+=v;en=`Row context: ${r.Sales} ${sign<0?'−':'+'} ${r.Profit} = ${v}, then add → ${fmt(st.acc)}`;hi=`Row context: ${r.Sales} ${sign<0?'−':'+'} ${r.Profit} = ${v}, phir jodo → ${fmt(st.acc)}`}
   else{v=r.Sales;const better=st.acc===null||(fn==='MAX'?v>st.acc:v<st.acc);if(better){st.acc=v;en=`${v} beats the previous value → new ${fn==='MAX'?'highest':'lowest'}: ${v}`;hi=`${v} pichle se behtar → naya ${fn==='MAX'?'highest':'lowest'}: ${v}`}else{en=`${v} does not beat ${st.acc} — keep ${st.acc}`;hi=`${v}, ${st.acc} se behtar nahi — ${st.acc} rakho`}}
   vals.push(v);push({f,n:j+1,act:j,acc:st.acc,lab,hl:fn==='SUMX'?'Orders[Sales]':hl,ti:L(`Row ${j+1} of ${n} · Order ${r.OrderID}`,`Row ${j+1}/${n} · Order ${r.OrderID}`),tx:L(en,hi)})});
  val=fn==='AVERAGE'?(n?st.acc/n:null):st.acc;
  if(fn==='AVERAGE')push({f,n,acc:val,lab:['Average','Average'],ti:L('Divide sum by count','Sum ko count se divide'),tx:L(`${fmt(st.acc)} ÷ ${n} rows = ${fmt(val)}`,`${fmt(st.acc)} ÷ ${n} rows = ${fmt(val)}`)});
  if(!n)push({f,n:0,ti:L('No rows','Koi row nahi'),tx:L('No rows survive the filter, so the result is empty.','Filter ke baad koi row nahi bachi, isliye result khaali hai.')});
 }
 push({f,n:fn==='DIVIDE'?n:n,all:fn==='DIVIDE',acc:val,lab:[LAB[fn][0]==='Result'?'Result':'Final result','Final result'],ti:L('✓ Final result','✓ Final result'),tx:L(`${fn} finished → ${name} = ${fmt(val)}. This is the number a report visual would show.`,`${fn} poora hua → ${name} = ${fmt(val)}. Report visual yahi number dikhata hai.`),done:true});
 return {S,idx,vals,name,val,code:c,fn};
}

/* Render one animator/stepper into host. */
let timer=null;
function mount(host,code,o={}){
 clearInterval(timer);let P=build(code),demo=false;
 if(!P){const d=demoFor(code);if(d){P=build(d);demo=true;code=d}}
 if(!P){host.innerHTML=`<div class="callout"><b>ℹ ${L('Not animated yet','Abhi animate nahi hua')}</b><p>${L('This formula is outside the animated subset (SUM, COUNTROWS, AVERAGE, DISTINCTCOUNT, DIVIDE, SUMX, MAX, MIN and simple CALCULATE filters). Ask the AI Tutor for a written walkthrough.','Yeh formula animated subset ke bahar hai (SUM, COUNTROWS, AVERAGE, DISTINCTCOUNT, DIVIDE, SUMX, MAX, MIN aur simple CALCULATE filters). AI Tutor se step-by-step samjhao.')}</p></div><button class="ghostbtn" data-ai>${L('Ask AI to explain →','AI se samjho →')}</button>`;host.querySelector('[data-ai]').onclick=()=>{view('ai');$('#aiPrompt').value='Explain this DAX formula step by step in '+(language==='en'?'English':'Hinglish')+':\n'+code};return}
 let i=0,speed=900;const pos=new Map(P.idx.map((r,p)=>[r,p]));
 host.classList.add('dv');host.tabIndex=0;
 host.innerHTML=`${demo?`<div class="dv-note">${L('Simplified demo on the sample Orders table — this lesson formula is not directly animatable.','Sample Orders table par simple demo — is lesson ki formula seedhi animate nahi ho sakti.')}</div>`:''}<pre class="dv-code"></pre><div class="dv-stage"><div class="dv-ti"></div><p class="dv-tx"></p><div class="dv-acc"><span></span><b></b></div></div><div class="dv-ctrl"><button class="ghostbtn" data-a="first" title="Restart">⏮</button><button class="ghostbtn" data-a="prev">◀ ${L('Back','Peeche')}</button><button class="primary" data-a="play">▶ ${L('Play','Chalao')}</button><button class="ghostbtn" data-a="next">${L('Next','Aage')} ▶</button><select data-a="speed" aria-label="Speed"><option value="1500">${L('Slow','Slow')}</option><option value="900" selected>${L('Normal','Normal')}</option><option value="350">${L('Fast','Fast')}</option></select><input type="range" data-a="seek" min="0" max="${P.S.length-1}" value="0" aria-label="Step"><span class="chip" data-a="count"></span></div><div class="dv-table"><table><thead><tr><th>#</th><th>Region</th><th>Category</th><th>Sales</th><th>Profit</th><th>Customer</th><th>${L('Value used','Value used')}</th></tr></thead><tbody></tbody></table></div>`;
 const q=s=>host.querySelector(s),body=q('tbody');
 function draw(){const s=P.S[i];
  const k=s.hl&&P.code.indexOf(s.hl)>=0?P.code.indexOf(s.hl):-1;
  q('.dv-code').innerHTML=k<0?esc(P.code):esc(P.code.slice(0,k))+'<mark>'+esc(s.hl)+'</mark>'+esc(P.code.slice(k+s.hl.length));
  q('.dv-ti').textContent=s.ti;q('.dv-tx').textContent=s.tx;
  const a=q('.dv-acc');a.hidden=s.acc===null||s.acc===undefined;if(!a.hidden){a.querySelector('span').textContent=L(s.lab[0],s.lab[1]);const b=a.querySelector('b');b.textContent=fmt(s.acc);b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')}
  body.innerHTML=DATA.map((r,ri)=>{const p=pos.has(ri)?pos.get(ri):-1;let cl='';
   if(s.f&&p<0)cl='out';else if(p>=0&&(s.all||p===s.act))cl='act';else if(p>=0&&p<s.n)cl='done';
   const v=p>=0&&p<s.n&&P.vals[p]!==undefined?fmt(P.vals[p]):'';
   return `<tr class="${cl}"><td>${r.OrderID}</td><td>${r.Region}</td><td>${r.Category}</td><td>${r.Sales}</td><td>${r.Profit}</td><td>${r.Customer}</td><td>${v}</td></tr>`}).join('');
  const act=body.querySelector('tr.act'),w=q('.dv-table');if(act&&s.act>=0)w.scrollTop=act.offsetTop-w.clientHeight/2;else w.scrollTop=0;
  q('[data-a=seek]').value=i;q('[data-a=count]').textContent=(i+1)+' / '+P.S.length;
  q('[data-a=prev]').disabled=i===0;q('[data-a=next]').disabled=i===P.S.length-1}
 function stop(){clearInterval(timer);q('[data-a=play]').textContent='▶ '+L('Play','Chalao')}
 function play(){if(i>=P.S.length-1)i=0,draw();q('[data-a=play]').textContent='⏸ '+L('Pause','Roko');clearInterval(timer);timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return}if(i<P.S.length-1){i++;draw()}else stop()},speed)}
 host.onclick=e=>{const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;
  if(a==='play'){timer&&q('[data-a=play]').textContent.startsWith('⏸')?stop():play()}
  else if(a==='next'){stop();i=Math.min(i+1,P.S.length-1);draw()}else if(a==='prev'){stop();i=Math.max(i-1,0);draw()}else if(a==='first'){stop();i=0;draw()}};
 q('[data-a=speed]').onchange=e=>{speed=+e.target.value;if(q('[data-a=play]').textContent.startsWith('⏸'))play()};
 q('[data-a=seek]').oninput=e=>{stop();i=+e.target.value;draw()};
 host.onkeydown=e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){stop();i=Math.min(i+1,P.S.length-1);draw();e.preventDefault()}else if(e.key==='ArrowLeft'){stop();i=Math.max(i-1,0);draw();e.preventDefault()}else if(e.key===' '){q('[data-a=play]').click();e.preventDefault()}};
 draw();
}

/* Styles */
const css=document.createElement('style');css.textContent=`
.dv{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:14px;margin:12px 0;outline:none}.dv:focus-visible{box-shadow:0 0 0 3px #6c5ce733}
.dv-note{font-size:12px;color:var(--muted);margin-bottom:8px}.dv-code{margin:0 0 10px;padding:12px 14px;background:#121827;color:#dce7ff;border-radius:11px;font:13px/1.7 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-word}.dv-code mark{background:#f2b84b;color:#1a1a1a;border-radius:4px;padding:1px 3px;animation:dvglow .8s ease}
.dv-stage{padding:12px 14px;border-left:3px solid var(--accent);background:#6c5ce70d;border-radius:0 12px 12px 0;margin-bottom:10px}.dv-ti{font-weight:800;font-size:13px}.dv-tx{margin:4px 0 0;font-size:13.5px;min-height:40px}.dv-acc{display:flex;align-items:baseline;gap:10px;margin-top:8px}.dv-acc span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}.dv-acc b{font-size:26px;color:var(--accent);letter-spacing:-.5px;display:inline-block}.dv-acc b.pop{animation:dvpop .45s ease}
.dv-ctrl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.dv-ctrl input[type=range]{flex:1;min-width:110px;accent-color:var(--accent)}.dv-ctrl select{border:1px solid var(--line);border-radius:9px;padding:8px;background:var(--surface);color:var(--ink)}.dv-ctrl button:disabled{opacity:.45;cursor:default}
.dv-table{max-height:270px;overflow:auto;position:relative;border:1px solid var(--line);border-radius:11px}.dv-table table{width:100%;border-collapse:collapse;font-size:12px}.dv-table th{position:sticky;top:0;background:var(--surface2);text-align:left;padding:7px 9px;z-index:1}.dv-table td{padding:6px 9px;border-top:1px solid var(--line);transition:background .3s,opacity .4s}
.dv-table tr.out{opacity:.28}.dv-table tr.done td{background:#11a8a014}.dv-table tr.act td{background:#f2b84b40;font-weight:700;animation:dvrow .5s ease}
@keyframes dvpop{0%{transform:scale(.8);opacity:.3}60%{transform:scale(1.15)}100%{transform:none;opacity:1}}@keyframes dvrow{from{background:#6c5ce750}}@keyframes dvglow{from{box-shadow:0 0 0 6px #f2b84b66}to{box-shadow:0 0 0 0 #f2b84b00}}
@media(prefers-reduced-motion:reduce){.dv *{animation:none!important;transition:none!important}}`;
document.head.appendChild(css);

/* Playground: step-by-step button + panel */
const run=$('#runDax');
if(run){const b=document.createElement('button');b.className='ghostbtn';b.id='stepDax';b.textContent='🔬 Step-by-step';run.after(b);
 const p=document.createElement('div');p.id='stepPanel';p.hidden=true;$('#view-lab .output').after(p);
 const go=()=>{p.hidden=false;mount(p,$('#daxEditor').value);};
 b.onclick=()=>{go();p.scrollIntoView({behavior:'smooth',block:'nearest'})};
 run.addEventListener('click',()=>{if(!p.hidden)go()});}

/* Lessons: animate the walkthrough formula */
const rl=renderLesson;
renderLesson=function(){rl();const l=lessons[currentLesson],cb=$('#lessonDetail .codeblock');if(!l||!cb)return;
 const box=document.createElement('div');box.innerHTML=`<h3>🎬 ${L('Watch this formula work inside','Dekho formula andar se kaise chalta hai')}</h3><div id="lessonAnim"></div>`;cb.after(box);
 mount(box.querySelector('#lessonAnim'),l.code.replace(/\\n/g,'\n'));};
})();
