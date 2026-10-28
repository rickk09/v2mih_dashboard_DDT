// V45.2: parse the site's 4D result region, including Chinese date labels.
// Never treat 5D or decorative balls as a 4D result.
const SOURCE='https://poolstotomacao.com/';
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const months={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
const pad=x=>String(x).padStart(2,'0');
function parseDate(s){
 let m=s.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
 if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
 m=s.match(/\b(\d{1,2})\s*(?:日|DAY)?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(?:月)?\s*(20\d{2})\s*(?:年)?/i);
 if(m)return `${m[3]}-${pad(months[m[2].toUpperCase()])}-${pad(m[1])}`;
 m=s.match(/\b(\d{1,2})\s*日\s*(\d{1,2})\s*月\s*(20\d{2})\s*年/);
 if(m)return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
 return null;
}
function parse(html){
 const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
 // Break at 4D / 5D labels. Restrict the candidate to the 4D region.
 const text=clean.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const label4=/(?:号码\s*4D|4D\s*(?:开奖结果|开奖|RESULT|DRAW)|(?:开奖\s*)?号码\s*4D)/i;
 const label5=/(?:号码\s*5D|5D\s*(?:开奖结果|开奖|RESULT|DRAW))/i;
 const startText=text.search(label4);
 if(startText<0)return {candidates:[],message:'Label hasil 4D tidak ditemukan pada HTML sumber.'};
 // Find corresponding HTML offsets by scanning visible text nodes while retaining tag offsets.
 let plain='',offset4=-1,offset5=-1;
 const tokens=clean.match(/<[^>]*>|[^<]+/g)||[];
 let pos=0;
 for(const token of tokens){
   if(!token.startsWith('<')){
     plain+=' '+token.replace(/&nbsp;|&#160;/gi,' ');
     if(offset4<0&&label4.test(plain))offset4=pos+token.length;
     else if(offset4>=0&&offset5<0&&label5.test(plain.slice(Math.max(0,plain.length-180)))){offset5=pos-token.length;break;}
   }
   pos+=token.length;
 }
 if(offset4<0)return {candidates:[],message:'Bagian hasil 4D tidak dapat diidentifikasi.'};
 const region=clean.slice(offset4,offset5>offset4?offset5:Math.min(clean.length,offset4+12000));
 const imgs=[...region.matchAll(/<(?:img)\b[^>]*?(?:src|data-src)\s*=\s*["']([^"']*?\/ball-([0-9])\.png(?:\?[^"']*)?)["'][^>]*>/gi)].map(m=>m[2]);
 const visible=region.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const date=parseDate(visible);
 const tm=visible.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(?:\(\s*GMT\s*\+\s*7\s*\))?/i);
 const time=tm?`${pad(tm[1])}:${tm[2]}:${tm[3]||'00'}`:null;
 if(imgs.length!==4)return {candidates:[],message:`Bagian 4D ditemukan, tetapi berisi ${imgs.length} gambar bola (harus tepat 4).`};
 return {candidates:[{number:imgs.join(''),date,time}],message:date&&time?'Hasil 4D dan waktu sumber berhasil dibaca.':'Angka 4D ditemukan, tetapi tanggal atau jam sumber belum terverifikasi.'};
}
export async function onRequestGet(){
 try{
  const r=await fetch(SOURCE,{headers:{accept:'text/html'},redirect:'follow',cf:{cacheTtl:0}});
  if(!r.ok)return json({ok:false,error:`Sumber HTTP ${r.status}`},502);
  const result=parse(await r.text());
  return json({ok:true,source:SOURCE,checkedAt:new Date().toISOString(),...result,verified:result.candidates.some(x=>x.date&&x.time)});
 }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
}
