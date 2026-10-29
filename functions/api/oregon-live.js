// V46.4 Oregon Pick 4: strictly text/data extraction; fail closed on dynamic pages.
const URL='https://www.oregonlottery.org/pick-4/winning-numbers/';
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const reply=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:HEAD});
const SLOTS={'13:00':'OREGON03','16:00':'OREGON06','19:00':'OREGON09','22:00':'OREGON12'};
const normalize=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const pad=n=>String(n).padStart(2,'0');
function datePlusOne(ymd){const d=new Date(ymd+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
function nowWIB(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function parse(html){
 const found=[];
 // HTML table rows with four separate winning-number digit elements.
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){
  const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1]);if(cells.length<3)continue;
  const date=normalize(cells[0]).match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\s*[-–]\s*(1:00|4:00|7:00|10:00)\s*(AM|PM)\b/i);if(!date)continue;
  const h=Number(date[4])%12+(date[5].toUpperCase()==='PM'?12:0);const time=pad(h)+':00';if(!SLOTS[time])continue;
  const draw=normalize(cells[1]);if(!/^\d{3,8}$/.test(draw))continue;
  const digitTags=[...cells[2].matchAll(/<(?:span|div|li|i|b)\b[^>]*>\s*(\d)\s*<\/(?:span|div|li|i|b)>/gi)].map(x=>x[1]);
  const plain=normalize(cells[2]);let number=digitTags.length===4?digitTags.join(''):/^\d(?:\s+\d){3}$/.test(plain)?plain.replace(/\s/g,''):null;
  if(!number||!/^[0-9]{4}$/.test(number))continue;
  const sourceDate=`${date[3]}-${pad(date[1])}-${pad(date[2])}`;
  found.push({market:SLOTS[time],sourceDate,drawDate:datePlusOne(sourceDate),sourceTime:time,draw,number});
 }
 return found;
}
async function source(){const r=await fetch(URL,{headers:{accept:'text/html'},redirect:'follow',cf:{cacheTtl:0}});if(!r.ok)throw Error('Oregon HTTP '+r.status);const html=await r.text();return {candidates:parse(html),htmlBytes:html.length,hasTable:/<table\b/i.test(html)} }
async function authorized(req,secret){if(!secret)return false;let c;try{c=decodeURIComponent((req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ddt_admin='))?.slice(10)||'')}catch{return false}const p=c.split('.');if(p.length!==3||p[0]!=='admin'||!Number.isFinite(+p[1])||+p[1]<Date.now()/1000)return false;const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=[...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode('admin.'+p[1])))].map(x=>x.toString(16).padStart(2,'0')).join('');return sig.length===p[2].length&&[...sig].reduce((a,x,i)=>a|(x.charCodeAt(0)^p[2].charCodeAt(i)),0)===0}
async function init(db){await db.prepare('CREATE TABLE IF NOT EXISTS oregon_live_results (draw_date TEXT NOT NULL, market TEXT NOT NULL, source_date TEXT NOT NULL, source_time TEXT NOT NULL, draw_id TEXT NOT NULL, number TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(draw_date,market))').run()}
export async function onRequestGet({request,env}){const u=new URL(request.url);if(u.searchParams.get('diagnose')==='1'){try{const s=await source();return reply({ok:true,verified:s.candidates.length>0,candidates:s.candidates.slice(0,16),hasTable:s.hasTable,htmlBytes:s.htmlBytes,warning:s.candidates.length?'Verify row mapping before Production':'No server-rendered result rows; page may use client-side API. Nothing will be written.'})}catch(e){return reply({ok:false,error:String(e.message||e)},502)}}if(!env.DB)return reply({ok:false,error:'D1 DB offline'},503);const date=u.searchParams.get('date')||nowWIB();if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))return reply({ok:false,error:'Invalid date'},400);try{await init(env.DB);const rows=await env.DB.prepare('SELECT market,number,source_time,source_date FROM oregon_live_results WHERE draw_date=?').bind(date).all();return reply({ok:true,date,results:Object.fromEntries((rows.results||[]).map(x=>[x.market,{number:x.number,time:x.source_time,sourceDate:x.source_date}]))})}catch(e){return reply({ok:false,error:String(e.message||e)},500)}}
export async function onRequestPost({request,env}){if(!await authorized(request,env.ADMIN_PASSWORD))return reply({ok:false,error:'Admin login required'},401);if(!env.DB)return reply({ok:false,error:'D1 DB offline'},503);let s;try{s=await source()}catch(e){return reply({ok:false,error:String(e.message||e)},502)}const date=nowWIB();const matched=s.candidates.filter(x=>x.drawDate===date);if(!matched.length)return reply({ok:true,date,verified:false,inserted:0,reason:'No validated Oregon text rows for previous US date; no data saved',hasTable:s.hasTable,htmlBytes:s.htmlBytes});await init(env.DB);let inserted=0,unchanged=0;const conflicts=[];for(const x of matched){const old=await env.DB.prepare('SELECT number FROM oregon_live_results WHERE draw_date=? AND market=?').bind(date,x.market).first();if(old){if(old.number!==x.number)conflicts.push(x.market);else unchanged++;continue}const r=await env.DB.prepare('INSERT OR IGNORE INTO oregon_live_results(draw_date,market,source_date,source_time,draw_id,number,created_at) VALUES(?,?,?,?,?,?,?)').bind(date,x.market,x.sourceDate,x.sourceTime,x.draw,x.number,new Date().toISOString()).run();if(r.meta?.changes)inserted++}return reply({ok:true,date,verified:true,inserted,unchanged,conflicts,matched:matched.map(x=>({market:x.market,number:x.number,sourceDate:x.sourceDate}))})}
