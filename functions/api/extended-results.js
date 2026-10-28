// V45.8: read-only, fail-closed diagnostics for Toto Macao 5D and HOKIDRAW.
// No number is persisted until source date/time and draw mapping are proven.
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const pad=x=>String(x).padStart(2,'0');
const months={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
function dateOf(s){let m=s.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;m=s.match(/(\d{1,2})\s*(?:日)?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(?:月)?\s*(20\d{2})\s*(?:年)?/i);if(m)return `${m[3]}-${pad(months[m[2].toUpperCase()])}-${pad(m[1])}`;m=s.match(/(\d{1,2})\s*日\s*(\d{1,2})\s*月\s*(20\d{2})\s*年/);if(m)return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;m=s.match(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);if(m){const mo=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m[2].toLowerCase())+1;return `${m[3]}-${pad(mo)}-${pad(m[1])}`}return null}
function timeOf(s){const m=s.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM)?\b/i);if(!m)return null;let h=+m[1];if(m[4])h=h%12+(m[4].toUpperCase()==='PM'?12:0);return `${pad(h)}:${m[2]}:${m[3]||'00'}`}
const strip=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
const plain=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const ballDigits=s=>[...s.matchAll(/<img\b[^>]*?\b(?:src|data-src)\s*=\s*["'][^"']*?\/ball-([0-9])\.png(?:\?[^"']*)?["'][^>]*>/gi)].map(m=>m[1]);
function macao5(html){const s=strip(html);const lab=/(?:号码\s*5D|5D\s*(?:开奖结果|开奖|RESULT|DRAW)|(?:开奖\s*)?号码\s*5D)/i;const m=lab.exec(plain(s));if(!m)return {verified:false,candidates:[],message:'Label 5D tidak ditemukan.'};const tokens=s.match(/<[^>]*>|[^<]+/g)||[];let p='',pos=0,start=-1;for(const t of tokens){if(!t.startsWith('<')){p+=' '+t.replace(/&nbsp;/gi,' ');if(start<0&&lab.test(p)){start=pos+t.length;break}}pos+=t.length}if(start<0)return {verified:false,candidates:[],message:'Batas 5D tidak ditemukan.'};const section=s.slice(start,start+7000);const digits=ballDigits(section);const text=plain(section);const date=dateOf(text),time=timeOf(text);const debug={ballCount:digits.length,firstBallSequence:digits.slice(0,12).join(''),date,time,sectionLength:section.length};if(digits.length!==5)return {verified:false,candidates:[],debug,message:'5D memerlukan tepat lima bola dalam area hasil. Data ditolak untuk menghindari angka salah.'};if(!date||!time)return {verified:false,candidates:[],debug,message:'Lima bola terbaca tetapi tanggal atau jam sumber belum terverifikasi.'};return {verified:true,candidates:[{number:digits.join(''),date,time}],debug,message:'5D berhasil dibaca; belum disimpan karena pemetaan jadwal 5D SORE/MALAM harus diverifikasi.'}}
async function hoki(){
 const base='https://www.hokidraw.com';
 const endpoints=['/games/gameDetail?gameId=3','/games/showPrizeFinal?gameId=3'];
 const debug=[];const candidates=[];
 for(const path of endpoints){
  try{
   const r=await fetch(base+path,{headers:{accept:'application/json','referer':base+'/live-draw.html'},redirect:'follow',cf:{cacheTtl:0}});
   const raw=(await r.text()).slice(0,160000);let obj;
   try{obj=JSON.parse(raw)}catch(e){debug.push({path,status:r.status,contentType:r.headers.get('content-type'),bodyPreview:raw.slice(0,350)});continue}
   const d=obj?.data;
   debug.push({path,status:r.status,code:obj?.code,message:obj?.msg||obj?.message,dataKeys:d&&typeof d==='object'?Object.keys(d).slice(0,25):[],sessionPeriod:d?.sessionPeriod,presetTime:d?.presetTime,historyPeriod:d?.historyVo?.sessionPeriod,historyTime:d?.historyVo?.presetTime,winsPreview:JSON.stringify(d?.historyVo?.wins||d?.wins||[]).slice(0,700)});
   const records=path.includes('showPrizeFinal')?[d?.historyVo]:[d];
   for(const item of records){if(!item||!Array.isArray(item.wins))continue;
    const w=item.wins.find(x=>Number(x?.winBatch)===1)||(item.wins.length===1&&item.wins[0]?.winBatch==null?item.wins[0]:null);
    const num=String(w?.winNo??'');const ts=item.presetTime||item.sessionName||item.drawingTime;
    if(/^\d{5}$/.test(num)&&ts&&item.sessionPeriod!=null){candidates.push({number:num.slice(-4),originalFiveDigits:num,sessionPeriod:String(item.sessionPeriod),sourceTime:String(ts),endpoint:path})}
   }
  }catch(e){debug.push({path,error:String(e?.message||e)})}
 }
 const unique=[...new Map(candidates.map(x=>[x.sessionPeriod+'|'+x.originalFiveDigits,x])).values()];
 return {verified:unique.length>0,candidates:unique,debug,message:unique.length?'Angka lima digit dan periode tersedia dari API HOKIDRAW. Masih READ-ONLY; mapping jam dan D1 belum aktif.':'Belum ada hasil lengkap beserta periode dan waktu terverifikasi dari API. Tidak ada penulisan D1.'};
}
export async function onRequestGet({request}){const type=new URL(request.url).searchParams.get('source');if(!['macao5','hoki'].includes(type))return json({ok:false,error:'Gunakan ?source=macao5 atau ?source=hoki'},400);const url=type==='macao5'?'https://poolstotomacao.com/':'https://www.hokidraw.com/live-draw.html';try{if(type==='hoki'){const parsed=await hoki();return json({ok:true,source:url,checkedAt:new Date().toISOString(),...parsed})}const r=await fetch(url,{headers:{accept:'text/html'},redirect:'follow',cf:{cacheTtl:0}});if(!r.ok)return json({ok:false,source:url,error:'HTTP '+r.status},502);const html=await r.text();const parsed=type==='macao5'?macao5(html):hoki(html);return json({ok:true,source:url,checkedAt:new Date().toISOString(),...parsed})}catch(e){return json({ok:false,source:url,error:String(e?.message||e)},502)}}
