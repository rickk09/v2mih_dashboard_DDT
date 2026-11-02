const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEAD});
const SOURCE_URL='https://poipetlottery.com/ppt/lottery-live-draw/lottery/api/getPPTRecords?name=PPT';
const SESSIONS=[{market:'POIPET12',source:null,dashboard:'12:30'},{market:'POIPET15',source:'15:30',dashboard:'15:30'},{market:'POIPET19',source:null,dashboard:'19:45'},{market:'POIPET22',source:null,dashboard:'22:45'}];
const dateWIB=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const validDate=s=>/^20\d\d-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const validPrize=s=>typeof s==='string'&&/^\d{4}$/.test(s);
async function fetchSource(){
 const r=await fetch(SOURCE_URL,{method:'POST',headers:{accept:'application/json, text/plain, */*','user-agent':'Mozilla/5.0 (compatible; DDT-Result/1.0)'},redirect:'follow',signal:AbortSignal.timeout(12000)});
 const contentType=r.headers.get('content-type')||'';
 const body=await r.text();
 let data=null;
 try{data=JSON.parse(body)}catch{}
 const diagnostics={httpStatus:r.status,finalUrl:r.url,contentType,bodyPreview:body.slice(0,800),jsonKeys:data&&typeof data==='object'?Object.keys(data):[],success:data?.success,code:data?.code};
 if(!r.ok)throw Object.assign(Error('Poipet source HTTP '+r.status),{diagnostics});
 let row=data?.result;
 if(Array.isArray(row))row=row[0];
 if(!row||typeof row!=='object'||!row.drawingTime||!['price1','price2','price3'].every(k=>row[k]!==undefined)){
  throw Object.assign(Error('Unexpected Poipet JSON'),{diagnostics});
 }
 return {row,diagnostics};
}
function mapResult(row,date){const results={};if(row.drawingTime===date+' 15:30:00'&&[row.price1,row.price2,row.price3].every(validPrize)){results.POIPET15={p1:row.price1,p2:row.price2,p3:row.price3,number1:row.price1,number2:row.price2,number3:row.price3,sourceDate:date,sourceTime:'15:30',drawTime:row.drawingTime,period:String(row.code||''),dashboardTime:'15:30'};}return results;}
async function init(db){await db.prepare('CREATE TABLE IF NOT EXISTS poipet_live_results (draw_date TEXT NOT NULL, market TEXT NOT NULL, prize1 TEXT NOT NULL, prize2 TEXT NOT NULL, prize3 TEXT NOT NULL, source_time TEXT NOT NULL, period TEXT, updated_at TEXT NOT NULL, PRIMARY KEY(draw_date,market))').run()}
async function admin(request,secret){if(!secret)return false;let c='';try{c=decodeURIComponent((request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ddt_admin='))?.slice(10)||'')}catch{return false}const p=c.split('.');if(p.length!==3||p[0]!=='admin'||!Number.isFinite(+p[1])||+p[1]<Date.now()/1000)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('admin.'+p[1])))].map(x=>x.toString(16).padStart(2,'0')).join('');return sig.length===p[2].length&&[...sig].reduce((a,x,i)=>a|(x.charCodeAt(0)^p[2].charCodeAt(i)),0)===0}
export async function onRequestGet({request,env}){try{const u=new URL(request.url),date=u.searchParams.get('date')||dateWIB();if(!validDate(date))return json({ok:false,error:'Invalid date'},400);if(u.searchParams.get('diagnose')==='1'){const {row:raw,diagnostics}=await fetchSource();return json({ok:true,date,source:SOURCE_URL,diagnostics,sourceDrawingTime:raw.drawingTime,sourcePeriod:raw.code,results:mapResult(raw,date),sessions:SESSIONS,notes:'Read-only. Source returns latest result only. POIPET15 confirmed at 15:30. Other sessions require historical API/time confirmation.'});}if(!env.DB)return json({ok:false,error:'D1 DB binding missing'},503);await init(env.DB);const r=await env.DB.prepare('SELECT market,prize1,prize2,prize3,source_time,period FROM poipet_live_results WHERE draw_date=?').bind(date).all();return json({ok:true,date,results:Object.fromEntries((r.results||[]).map(x=>[x.market,{p1:x.prize1,p2:x.prize2,p3:x.prize3,sourceTime:x.source_time,period:x.period}]))});}catch(e){return json({ok:false,error:String(e?.message||e),diagnostics:e?.diagnostics||null},502)}}
export async function onRequestPost({request,env}){try{if(!await admin(request,env.ADMIN_PASSWORD))return json({ok:false,error:'Admin login required'},401);if(!env.DB)return json({ok:false,error:'D1 DB binding missing'},503);const u=new URL(request.url),date=u.searchParams.get('date')||dateWIB();if(!validDate(date))return json({ok:false,error:'Invalid date'},400);const {row:raw}=await fetchSource(),results=mapResult(raw,date);await init(env.DB);const saved=[];for(const [market,r] of Object.entries(results)){await env.DB.prepare('INSERT INTO poipet_live_results(draw_date,market,prize1,prize2,prize3,source_time,period,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(draw_date,market) DO UPDATE SET prize1=excluded.prize1,prize2=excluded.prize2,prize3=excluded.prize3,source_time=excluded.source_time,period=excluded.period,updated_at=excluded.updated_at').bind(date,market,r.p1,r.p2,r.p3,r.sourceTime,r.period,new Date().toISOString()).run();saved.push(market);}return json({ok:true,date,saved,results,sourceDrawingTime:raw.drawingTime});}catch(e){return json({ok:false,error:String(e?.message||e),diagnostics:e?.diagnostics||null},502)}}
