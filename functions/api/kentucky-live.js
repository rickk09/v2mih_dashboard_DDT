const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:HEAD});
const SOURCE='https://kys-v2.p1.awc.lotteryservices.net/api/v2/draw-games/draws?previous-draws=6&next-draws=0&game-names=Pick%204';
const wibDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const easternDate=(date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const validDate=s=>/^20\d{2}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
async function source(){
 const r=await fetch(SOURCE,{headers:{accept:'application/json'},signal:AbortSignal.timeout(14000)});
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw Object.assign(Error('Kentucky source returned non-JSON'),{details:{status:r.status,preview:raw.slice(0,400)}})}
 if(!r.ok)throw Object.assign(Error('Kentucky source HTTP '+r.status),{details:{status:r.status,preview:raw.slice(0,400)}});
 if(!Array.isArray(data?.draws))throw Object.assign(Error('Unexpected Kentucky JSON'),{details:{keys:Object.keys(data||{}),preview:raw.slice(0,400)}});
 return data.draws;
}
function map(draws,date){const results={};
 for(const row of draws){
  if(row?.gameName!=='Pick 4')continue;
  const market=row.name==='MIDDAY'?'KENTUCKYMID':row.name==='EVENING'?'KENTUCKYEVE':null;
  if(!market||!Number.isFinite(row.drawTime))continue;
  const instant=new Date(row.drawTime);
  if(Number.isNaN(instant.getTime())||wibDate(instant)!==date)continue;
  // Do not use future/open draws, even if malformed source contains numbers.
  if(instant.getTime()>Date.now()+120000||row.status==='OPEN')continue;
  const regular=(row.results||[]).find(x=>x?.drawType==='Regular'&&Array.isArray(x.primary)&&x.primary.length===4&&x.primary.every(d=>typeof d==='string'&&/^\d$/.test(d)));
  if(!regular)continue;
  const number=regular.primary.join('');
  if(!results[market]||row.drawTime>results[market].timestamp){
   results[market]={number,sourceDate:easternDate(instant),sourceTime:new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(instant),drawTimeUTC:instant.toISOString(),drawId:String(row.id||''),timestamp:row.drawTime};
  }
 }
 return results;
}
async function init(db){await db.prepare('CREATE TABLE IF NOT EXISTS kentucky_live_results (draw_date TEXT NOT NULL, market TEXT NOT NULL, number TEXT NOT NULL, source_date TEXT NOT NULL, source_time TEXT NOT NULL, draw_id TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(draw_date,market))').run()}
async function admin(req,secret){if(!secret)return false;let c='';try{c=decodeURIComponent((req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ddt_admin='))?.slice(10)||'')}catch{return false}const p=c.split('.');if(p.length!==3||p[0]!=='admin'||!Number.isFinite(+p[1])||+p[1]<Date.now()/1000)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('admin.'+p[1])))].map(x=>x.toString(16).padStart(2,'0')).join('');return sig.length===p[2].length&&[...sig].reduce((a,x,i)=>a|(x.charCodeAt(0)^p[2].charCodeAt(i)),0)===0}
export async function onRequestGet({request,env}){try{const url=new URL(request.url),date=url.searchParams.get('date')||wibDate();if(!validDate(date))return reply({ok:false,error:'Invalid date'},400);if(url.searchParams.get('diagnose')==='1'){const draws=await source();return reply({ok:true,date,source:SOURCE,drawCount:draws.length,results:map(draws,date),note:'Read-only; source drawTime converted to WIB calendar date; Regular 4-digit primary only. No D1 writes.'})}if(!env.DB)return reply({ok:false,error:'D1 DB binding missing'},503);await init(env.DB);const rows=await env.DB.prepare('SELECT market,number,source_date,source_time,draw_id FROM kentucky_live_results WHERE draw_date=?').bind(date).all();return reply({ok:true,date,results:Object.fromEntries((rows.results||[]).map(x=>[x.market,{number:x.number,sourceDate:x.source_date,sourceTime:x.source_time,drawId:x.draw_id}]))})}catch(e){return reply({ok:false,error:String(e.message||e),details:e.details||null},502)}}
export async function onRequestPost({request,env}){try{if(!await admin(request,env.ADMIN_PASSWORD))return reply({ok:false,error:'Admin login required'},401);if(!env.DB)return reply({ok:false,error:'D1 DB binding missing'},503);const date=new URL(request.url).searchParams.get('date')||wibDate();if(!validDate(date))return reply({ok:false,error:'Invalid date'},400);const mapped=map(await source(),date);await init(env.DB);const saved=[];for(const [market,item] of Object.entries(mapped)){await env.DB.prepare('INSERT INTO kentucky_live_results(draw_date,market,number,source_date,source_time,draw_id,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(draw_date,market) DO UPDATE SET number=excluded.number,source_date=excluded.source_date,source_time=excluded.source_time,draw_id=excluded.draw_id,updated_at=excluded.updated_at').bind(date,market,item.number,item.sourceDate,item.sourceTime,item.drawId,new Date().toISOString()).run();saved.push(market)}return reply({ok:true,date,saved,results:mapped})}catch(e){return reply({ok:false,error:String(e.message||e),details:e.details||null},502)}}
