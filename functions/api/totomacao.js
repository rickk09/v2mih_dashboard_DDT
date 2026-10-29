// V45.5 — Strict 4D parsing with duplicated fourth-ball markup handling.
// This endpoint is read-only. Client only stores a candidate matching today's WIB draw slot.
const SOURCE='https://poolstotomacao.com/';
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const months={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
const pad=x=>String(x).padStart(2,'0');
function parseDate(s){
 let m=s.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
 if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
 m=s.match(/(\d{1,2})\s*(?:日|DAY)?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(?:月)?\s*(20\d{2})\s*(?:年)?/i);
 if(m)return `${m[3]}-${pad(months[m[2].toUpperCase()])}-${pad(m[1])}`;
 m=s.match(/(\d{1,2})\s*日\s*(\d{1,2})\s*月\s*(20\d{2})\s*年/);
 return m?`${m[3]}-${pad(m[2])}-${pad(m[1])}`:null;
}
function parse(html){
 const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
 const label4=/(?:号码\s*4D|4D\s*(?:开奖结果|开奖|RESULT|DRAW)|(?:开奖\s*)?号码\s*4D)/i;
 const label5=/(?:号码\s*5D|5D\s*(?:开奖结果|开奖|RESULT|DRAW))/i;
 const tokens=clean.match(/<[^>]*>|[^<]+/g)||[];
 let plain='',pos=0,offset4=-1,offset5=-1;
 for(const token of tokens){
  if(!token.startsWith('<')){
   plain+=' '+token.replace(/&nbsp;|&#160;/gi,' ');
   if(offset4<0&&label4.test(plain))offset4=pos+token.length;
   else if(offset4>=0&&offset5<0&&label5.test(plain.slice(Math.max(0,plain.length-180)))){offset5=pos;break;}
  }
  pos+=token.length;
 }
 if(offset4<0)return {candidates:[],message:'Label 4D tidak ditemukan.'};
 const region=clean.slice(offset4,offset5>offset4?offset5:Math.min(clean.length,offset4+12000));
 const ballMatches=[...region.matchAll(/<img\b[^>]*?\b(?:src|data-src)\s*=\s*["']([^"']*?\/ball-([0-9])\.png(?:\?[^"']*)?)["'][^>]*>/gi)];
 const digits=ballMatches.map(x=>x[2]);
 const visible=region.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const date=parseDate(visible);
 const tm=visible.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(?:\(\s*GMT\s*\+\s*7\s*\))?/i);
 const time=tm?`${pad(tm[1])}:${tm[2]}:${tm[3]||'00'}`:null;
 let number=null,reason='';
 if(digits.length===4){number=digits.join('');reason='Tepat empat bola 4D.';}
 else if(digits.length===5&&digits[3]===digits[4]){
  // The source has been observed rendering the FOURTH ball twice with the same digit.
  // Only accept if the fifth image is explicitly marked as the fourth ball again.
  const beforeLast=region.slice(Math.max(0,ballMatches[4].index-350),ballMatches[4].index).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  const fourthLabels=(visible.match(/第四个球/g)||[]).length;
  if(fourthLabels>=2&&/第四个球/.test(beforeLast)){
   number=digits.slice(0,4).join('');reason='Bola keempat diduplikasi pada HTML sumber dengan label 第四个球 yang sama.';
  }else reason='Ada 5 bola, tetapi duplikasi bola keempat tidak dapat dibuktikan.';
 }else reason=`Ditemukan ${digits.length} bola; pola hasil 4D tidak valid.`;
 const debug={label5Detected:offset5>offset4,ballCount:digits.length,ballSequence:digits.join(''),date,time,reason};
 if(!number)return {candidates:[],debug,message:'Hasil ditolak: '+reason};
 if(!date||!time)return {candidates:[],debug,message:'Angka '+number+' terbaca, tetapi tanggal/jam sumber belum terverifikasi.'};
 return {candidates:[{number,date,time}],debug,message:'Hasil 4D terbaca: '+number+'. '+reason};
}
export async function onRequestGet(){
 try{
  const r=await fetch(SOURCE,{headers:{accept:'text/html'},redirect:'follow',cf:{cacheTtl:0}});
  if(!r.ok)return json({ok:false,error:`Sumber HTTP ${r.status}`},502);
  const result=parse(await r.text());
  return json({ok:true,source:SOURCE,checkedAt:new Date().toISOString(),...result,verified:result.candidates.some(x=>x.date&&x.time)});
 }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
}
