/* DAX Studio — AI provider switch (Google Gemini / Groq) in Settings, synced with the AI Tutor. */
(()=>{'use strict';
const K='daxstudio-ai-v1',DEF={gemini:'gemini-2.5-flash',groq:'openai/gpt-oss-20b'},NAME={gemini:'Google AI Studio · Gemini',groq:'Groq'},KEYVAR={gemini:'GEMINI_API_KEY',groq:'GROQ_API_KEY'},URL_={gemini:'/api/gemini',groq:'/api/groq'};
let S;try{S=JSON.parse(localStorage.getItem(K))||{}}catch{S={}}
if(!DEF[S.provider])S.provider='gemini';S.models=S.models&&typeof S.models==='object'?S.models:{};
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch{}};
const model=p=>S.models[p]||DEF[p];
const other=p=>p==='gemini'?'groq':'gemini';
const SK=p=>'daxstudio-key-'+p,KRE=/^[A-Za-z0-9_\-.]{20,200}$/;
const getKey=p=>{try{return sessionStorage.getItem(SK(p))||localStorage.getItem(SK(p))||''}catch{return ''}};
const setKey=(p,k,remember)=>{try{sessionStorage.removeItem(SK(p));localStorage.removeItem(SK(p));if(k)(remember?localStorage:sessionStorage).setItem(SK(p),k)}catch{}};
const _fetch=window.fetch.bind(window);
window.fetch=(u,o={})=>{const p=u==='/api/gemini'?'gemini':u==='/api/groq'?'groq':null,k=p&&getKey(p);if(k)o={...o,headers:{...(o.headers||{}),'x-user-api-key':k}};return _fetch(u,o)};
function keyState(){const f=$('#spKeyFor'),s=$('#spKeyState');if(!f||!s)return;const p=S.provider,k=getKey(p);f.textContent=NAME[p];s.textContent=k?'✔ Key saved in this browser (••••'+k.slice(-4)+'). Press "Test this provider" to confirm.':'No key saved in this browser — the server\'s environment variable is used if it is set.'}
function apply(){[['#aiProvider','#aiModel'],['#spProvider','#spModel']].forEach(([a,b])=>{const p=$(a),m=$(b);if(p)p.value=S.provider;if(m)m.value=model(S.provider)});const t=$('#spBadge');if(t)t.textContent=NAME[S.provider];keyState()}
function setProvider(p){S.provider=p;save();apply();toast('AI provider: '+NAME[p])}
function setModel(v){v=v.trim();if(v&&v!==DEF[S.provider])S.models[S.provider]=v;else delete S.models[S.provider];save()}

const grid=document.querySelector('.settings-grid');
if(grid){grid.insertAdjacentHTML('afterbegin',`<div class="settings-card"><h3>🔀 AI provider</h3><p>Choose which service answers in the AI Tutor. Keys stay on the server — only the choice is saved in this browser.</p><div class="pill">Active: <b id="spBadge"></b></div><label for="spProvider" style="display:block;margin-top:14px">Provider</label><select id="spProvider"><option value="gemini">${NAME.gemini}</option><option value="groq">${NAME.groq}</option></select><label for="spModel" style="display:block;margin-top:12px">Model</label><input id="spModel" placeholder="Model name"><label for="spKey" style="display:block;margin-top:14px">API key for <b id="spKeyFor"></b></label><input id="spKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste key (AIza… for Gemini, gsk_… for Groq)"><label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:12px"><input type="checkbox" id="spRemember" style="width:auto"> Remember on this device (otherwise cleared when the tab closes)</label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="primary" id="spKeySave">Save key</button><button class="ghostbtn" id="spKeyClear">Remove key</button></div><div id="spKeyState" style="font-size:12px;color:var(--muted);margin-top:8px"></div><p style="font-size:11.5px;color:var(--muted);margin:8px 0 0">🔒 The key stays in this browser and is sent only to this site's own /api function over HTTPS. Use it only on your own device; on a shared site prefer the Netlify environment variable.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="ghostbtn" id="spReset">Use default model</button><button class="primary" id="spTest">Test this provider</button></div><div id="spResult" style="font-size:12px;color:var(--muted);margin-top:10px"></div></div>`);
 $('#spProvider').onchange=e=>setProvider(e.target.value);
 $('#spModel').oninput=e=>{setModel(e.target.value);const m=$('#aiModel');if(m)m.value=model(S.provider)};
 $('#spReset').onclick=()=>{delete S.models[S.provider];save();apply();toast('Default model restored')};
 $('#spKeySave').onclick=()=>{const i=$('#spKey'),v=i.value.trim();if(!KRE.test(v)){$('#spKeyState').textContent='✘ That does not look like a valid key (letters, numbers, - _ . only; at least 20 characters).';return}setKey(S.provider,v,$('#spRemember').checked);i.value='';keyState();toast('API key saved for '+NAME[S.provider])};
 $('#spKeyClear').onclick=()=>{setKey(S.provider,'');$('#spKey').value='';keyState();toast('API key removed')};
 keyState();
 $('#spTest').onclick=async()=>{const r=$('#spResult'),p=S.provider;r.textContent='Testing '+NAME[p]+'…';
  try{const res=await fetch(URL_[p],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Reply with the single word OK.',model:model(p)})}),d=await res.json().catch(()=>({}));
   if(res.ok){r.textContent='✔ '+NAME[p]+' works with model "'+model(p)+'".';return}
   let msg='✘ '+(d.error||'Request failed ('+res.status+')');
   try{const h=await(await fetch('/api/health')).json(),o=other(p);if(h.providers&&!h.providers[p]&&h.providers[o]){r.innerHTML=esc(msg)+` <button class="ghostbtn" id="spSwitch" style="margin-left:6px">Switch to ${esc(NAME[o])}</button>`;$('#spSwitch').onclick=()=>{setProvider(o);r.textContent='✔ Switched to '+NAME[o]+'. Press Test to confirm.'};return}
    if(h.providers&&!h.providers[p])msg+=' — paste a key above, or add '+KEYVAR[p]+' in Netlify → Environment variables and redeploy.'}catch{}
   r.textContent=msg}
  catch{r.textContent='✘ API not reachable. Deploy on Netlify or run "netlify dev"; a plain static preview has no AI endpoints.'}}}

const sel=$('#aiProvider'),mi=$('#aiModel');
if(sel)sel.onchange=()=>setProvider(sel.value);
if(mi)mi.addEventListener('input',()=>{setModel(mi.value);const m=$('#spModel');if(m)m.value=model(S.provider)});
apply();
})();
