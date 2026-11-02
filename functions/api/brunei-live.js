const HEAD = {'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:HEAD});
const SOURCE_URL='https://bruneipools.com/lottery/site//getDrawingResultsList';
const SESSIONS=[{market:'BRUNEI 02',source:'03:30',dashboard:'02:30'},{market:'BRUNEI 14',source:'15:30',dashboard:'14:30'},{market:'BRUNEI 21',source:'22:30',dashboard:'21:30'}];
const dateWIB=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const validDate=s=>/^20\d\d-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const addDays=(s,n)=>{let d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const number=x=>typeof x==='string'&&/^\d{4}$/.test(x)?x:null;
async function fetchSource(date){
 const u=new URL(SOURCE_URL);
 u.searchParams.set('productCode','BRU');u.searchParams.set('startTime',addDays(date,-1));u.searchParams.set('endTime',addDays(date,1));u.searchParams.set('pageNo','1');u.searchParams.set('pageSize','30');
 const response=await fetch(u.toString(),{headers:{accept:'application/json'},redirect:'follow',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Brunei source HTTP '+response.status);
 const data=await response.json();
 if(!Array.isArray(data))throw new Error('Unexpected Brunei JSON shape (expected array)');
 return data;
}
function mapRows(rows,date){const output={};for(const session of SESSIONS){
 const expected=date+' '+session.source+':00';
 const matching=rows.filter(r=>r&&r.drawingTime===expected);
 const row=matching.find(r=>number(r.price1)&&number(r.price2)&&number(r.price3));
 if(row)output[session.market]={p1:row.price1,p2:row.price2,p3:row.price3,number1:row.price1,number2:row.price2,number3:row.price3,sourceDate:date,sourceTime:session.source,drawTime:row.drawingTime,period:String(row.periodeName||''),dashboardTime:session.dashboard};
 }return output;}
async function ensureTable(db){await db.prepare('CREATE TABLE IF NOT EXISTS brunei_live_results (draw_date TEXT NOT NULL, market TEXT NOT NULL, prize1 TEXT NOT NULL, prize2 TEXT NOT NULL, prize3 TEXT NOT NULL, source_time TEXT NOT NULL, period TEXT, updated_at TEXT NOT NULL, PRIMARY KEY(draw_date, market))').run()}
async function isAdmin(request,secret){if(!secret)return false;let c='';try{c=decodeURIComponent((request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ddt_admin='))?.slice(10)||'')}catch{return false}const p=c.split('.');if(p.length!==3||p[0]!=='admin'||!Number.isFinite(+p[1])||+p[1]<Date.now()/1000)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('admin.'+p[1])))].map(x=>x.toString(16).padStart(2,'0')).join('');return signature.length===p[2].length&&[...signature].reduce((a,x,i)=>a|(x.charCodeAt(0)^p[2].charCodeAt(i)),0)===0}
export async function onRequestGet({request,env}){
 try{
 const u=new URL(request.url);const date=u.searchParams.get('date')||dateWIB();if(!validDate(date))return respond({ok:false,error:'Invalid date'},400);
 if(u.searchParams.get('diagnose')==='1'){
  const raw=await fetchSource(date);const results=mapRows(raw,date);
  return respond({ok:true,date,source:SOURCE_URL,sourceCount:raw.length,results,sessions:SESSIONS,notes:'Read-only diagnosis; no DB writes. Exact source sessions: 03:30, 15:30, 22:30; dashboard results: 02:45, 14:45, 21:45.'});
 }
 if(!env.DB)return respond({ok:false,error:'D1 DB binding missing'},503);
 await ensureTable(env.DB);
 const rows=await env.DB.prepare('SELECT market,prize1,prize2,prize3,source_time,period FROM brunei_live_results WHERE draw_date=?').bind(date).all();
 return respond({ok:true,date,results:Object.fromEntries((rows.results||[]).map(r=>[r.market,{p1:r.prize1,p2:r.prize2,p3:r.prize3,number1:r.prize1,number2:r.prize2,number3:r.prize3,sourceTime:r.source_time,period:r.period}]))});
 }catch(e){return respond({ok:false,error:String(e?.message||e)},502)}
}
export async function onRequestPost({request,env}){
 try{
 if(!await isAdmin(request,env.ADMIN_PASSWORD))return respond({ok:false,error:'Admin login required'},401);
 if(!env.DB)return respond({ok:false,error:'D1 DB binding missing'},503);
 const u=new URL(request.url);const date=u.searchParams.get('date')||dateWIB();if(!validDate(date))return respond({ok:false,error:'Invalid date'},400);
 const rows=await fetchSource(date);const results=mapRows(rows,date);await ensureTable(env.DB);
 const saved=[];for(const [market,r] of Object.entries(results)){
  await env.DB.prepare('INSERT INTO brunei_live_results(draw_date,market,prize1,prize2,prize3,source_time,period,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(draw_date,market) DO UPDATE SET prize1=excluded.prize1,prize2=excluded.prize2,prize3=excluded.prize3,source_time=excluded.source_time,period=excluded.period,updated_at=excluded.updated_at').bind(date,market,r.p1,r.p2,r.p3,r.sourceTime,r.period,new Date().toISOString()).run();saved.push(market);
 }
 return respond({ok:true,date,saved,results,sourceCount:rows.length});
 }catch(e){return respond({ok:false,error:String(e?.message||e)},502)}
}
