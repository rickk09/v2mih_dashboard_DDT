// V46.2: verified HOKIDRAW first-prize 5D -> last 4 digits, persisted in D1.
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const respond=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:HEAD});
const API='https://www.hokidraw.com/api/livelottery-watchprize/games/getHistory';
const pad=n=>String(n).padStart(2,'0');
function jakartaNow(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const x=Object.fromEntries(parts.map(p=>[p.type,p.value]));return {date:`${x.year}-${x.month}-${x.day}`,time:`${x.hour}:${x.minute}:${x.second}`}}
async function init(db){await db.prepare('CREATE TABLE IF NOT EXISTS hokidraw_live_results (draw_date TEXT NOT NULL, market TEXT NOT NULL, draw_time TEXT NOT NULL, number TEXT NOT NULL, original_five TEXT NOT NULL, session_period TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(draw_date,market))').run()}
async function authorized(req,secret){if(!secret)return false;const c=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ddt_admin='));if(!c)return false;let parts;try{parts=decodeURIComponent(c.slice(10)).split('.')}catch{return false}if(parts.length!==3||parts[0]!=='admin'||!Number.isFinite(Number(parts[1]))||Number(parts[1])<Date.now()/1000)return false;const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=[...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode('admin.'+parts[1])))].map(x=>x.toString(16).padStart(2,'0')).join('');return sig.length===parts[2].length&&[...sig].reduce((d,c,i)=>d|(c.charCodeAt(0)^parts[2].charCodeAt(i)),0)===0}
async function fetchVerified(date){
 const start=Date.parse(date+'T00:00:00+07:00');if(!Number.isFinite(start))throw Error('Tanggal tidak valid');
 const url=API+'?gameId=3&startTime='+start+'&endTime='+(start+86400000-1000);
 const r=await fetch(url,{method:'POST',headers:{'accept':'application/json','content-type':'application/x-www-form-urlencoded; charset=UTF-8','origin':'https://www.hokidraw.com','referer':'https://www.hokidraw.com/live-draw.html'},body:'',redirect:'follow',cf:{cacheTtl:0}});
 if(!r.ok)throw Error('HOKIDRAW upstream HTTP '+r.status);
 const obj=await r.json();if(String(obj?.code)!=='0'||!Array.isArray(obj.data))throw Error('Respons riwayat HOKIDRAW tidak valid');
 const now=jakartaNow(),out=new Map();
 for(const rec of obj.data){
  if(String(rec?.state)!=='8'&&String(rec?.stateName||'').toLowerCase()!=='finish')continue;
  const stamp=String(rec.presetTime||'');const m=/^(20\d{2}-\d{2}-\d{2}) (\d{2}):00:00$/.exec(stamp);
  if(!m||m[1]!==date||Number(m[2])>23)continue;
  if(stamp>now.date+' '+now.time)continue;
  const winners=Array.isArray(rec.wins)?rec.wins.filter(w=>Number(w?.winBatch)===1):[];
  if(winners.length!==1)continue;
  const raw=String(winners[0].winNo??'');if(!/^\d{5}$/.test(raw))continue;
  const period=String(rec.sessionPeriod??'');if(!/^\d+$/.test(period))continue;
  const market='HOKIDRAW '+m[2]+':00',entry={market,date,time:m[2]+':00:00',number:raw.slice(-4),originalFive:raw,sessionPeriod:period};
  if(out.has(market)){const prev=out.get(market);if(prev.number!==entry.number||prev.sessionPeriod!==period)throw Error('Konflik dua hasil sumber untuk '+market)}
  out.set(market,entry);
 }
 return [...out.values()];
}
export async function onRequestGet({request,env}){
 if(!env.DB)return respond({ok:false,error:'D1 DB offline'},503);
 const date=new URL(request.url).searchParams.get('date')||jakartaNow().date;
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))return respond({ok:false,error:'Tanggal tidak valid'},400);
 try{await init(env.DB);const r=await env.DB.prepare('SELECT market,draw_time,number,original_five,session_period FROM hokidraw_live_results WHERE draw_date=? ORDER BY draw_time').bind(date).all();return respond({ok:true,date,results:Object.fromEntries((r.results||[]).map(x=>[x.market,{number:x.number,time:x.draw_time,originalFive:x.original_five,sessionPeriod:x.session_period}]))})}catch(e){return respond({ok:false,error:String(e.message||e)},500)}
}
export async function onRequestPost({request,env}){
 if(!await authorized(request,env.ADMIN_PASSWORD))return respond({ok:false,error:'Admin login diperlukan'},401);
 if(!env.DB)return respond({ok:false,error:'D1 DB offline'},503);
 const date=jakartaNow().date;let verified;
 try{verified=await fetchVerified(date)}catch(e){return respond({ok:false,error:String(e.message||e)},502)}
 try{
  await init(env.DB);let inserted=0,unchanged=0;const conflicts=[];
  for(const v of verified){
   const old=await env.DB.prepare('SELECT number,session_period FROM hokidraw_live_results WHERE draw_date=? AND market=?').bind(date,v.market).first();
   if(old){if(old.number!==v.number||old.session_period!==v.sessionPeriod)conflicts.push(v.market);else unchanged++;continue}
   const r=await env.DB.prepare('INSERT OR IGNORE INTO hokidraw_live_results(draw_date,market,draw_time,number,original_five,session_period,created_at) VALUES(?,?,?,?,?,?,?)').bind(date,v.market,v.time,v.number,v.originalFive,v.sessionPeriod,new Date().toISOString()).run();
   if(r.meta?.changes)inserted++;
  }
  return respond({ok:true,date,verified:verified.length,inserted,unchanged,conflicts});
 }catch(e){return respond({ok:false,error:String(e.message||e)},500)}
}
