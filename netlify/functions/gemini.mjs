const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;
const requestLog = new Map();
const json = (status, body) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
const userKey=r=>{const k=r.headers.get('x-user-api-key');return k&&/^[A-Za-z0-9_\-.]{20,200}$/.test(k)?k:''};
async function readBody(request){const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>80000)throw Object.assign(new Error('Request too large. Please shorten the question.'),{statusCode:413});try{return JSON.parse(raw||'{}')}catch{throw Object.assign(new Error('Invalid JSON request.'),{statusCode:400})}}
export default async (request, context) => {
 try {
  if(request.method!=='POST')return json(405,{error:'Method not allowed.'});
  const origin=request.headers.get('origin'); if(origin&&origin!==new URL(request.url).origin)return json(403,{error:'Request origin not allowed.'});
  const ip=context?.ip||request.headers.get('x-nf-client-connection-ip')||'unknown',now=Date.now(),recent=(requestLog.get(ip)||[]).filter(t=>now-t<WINDOW_MS);if(recent.length>=MAX_REQUESTS_PER_WINDOW)return json(429,{error:'Too many AI requests. Wait a few minutes and retry.'});recent.push(now);requestLog.set(ip,recent);
  const body=await readBody(request),key=userKey(request)||process.env.GEMINI_API_KEY;
  if(!key)return json(503,{error:'Google AI Studio is not configured. Paste your key in Settings → AI provider, or add GEMINI_API_KEY in Netlify environment variables and redeploy.'});
  const prompt=typeof body.prompt==='string'?body.prompt.trim():''; if(!prompt)return json(400,{error:'Prompt is empty.'}); if(prompt.length>30000)return json(413,{error:'Prompt is too long.'});
  const model=typeof body.model==='string'&&/^gemini-[a-zA-Z0-9.-]{1,80}$/.test(body.model)?body.model:'gemini-2.5-flash';
  const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:'You are DAX Studio, a careful DAX tutor. Teach step by step, distinguish general DAX concepts from what a limited browser simulator can execute, never claim a formula was run in a full Microsoft engine. Provide concise examples, hints, and answer explanations.'}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:4096}}),signal:AbortSignal.timeout(90000)}).catch(e=>{throw Object.assign(new Error(e.name==='TimeoutError'?'Google AI request timed out.':'Could not reach Google AI Studio.'),{statusCode:e.name==='TimeoutError'?504:502})});
  const data=await upstream.json().catch(()=>({}));if(!upstream.ok)return json(upstream.status,{error:data?.error?.message||`Google AI API error (${upstream.status}). Check model access and API quota.`});const text=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('\n').trim();if(!text)return json(502,{error:'Google AI Studio returned no text. Try again or select another supported Gemini model.'});return json(200,{text,model});
 } catch(e){return json(e.statusCode||500,{error:e.message||'Gemini server error.'})}
};
