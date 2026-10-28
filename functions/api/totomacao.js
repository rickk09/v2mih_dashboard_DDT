// V45: server-side extraction of image-based 4D result; fails closed when date/time is unverifiable.
const SOURCE='https://poolstotomacao.com/';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers});
export async function onRequestGet(){
  try{
    const r=await fetch(SOURCE,{headers:{'accept':'text/html','user-agent':'Mozilla/5.0 (compatible; DDT-LiveResult/1.0)'},redirect:'follow',cf:{cacheTtl:0}});
    if(!r.ok)return json({ok:false,error:`Sumber HTTP ${r.status}`},502);
    const html=await r.text();
    const blocks=[...html.matchAll(/<(?:tr|article|section|div)\b[^>]*>[\s\S]{0,12000}?<\/\s*(?:tr|article|section|div)\s*>/gi)].map(m=>m[0]);
    const candidates=[];
    for(const block of blocks){
      const imgs=[...block.matchAll(/(?:src|data-src)\s*=\s*["']([^"']*?ball-([0-9])\.png(?:\?[^"']*)?)["']/gi)].map(m=>m[2]);
      if(imgs.length!==4)continue;
      const plain=block.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ');
      const date=(plain.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/)||[]);
      const clock=(plain.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/)||[]);
      const ymd=date.length?`${date[1]}-${date[2].padStart(2,'0')}-${date[3].padStart(2,'0')}`:null;
      candidates.push({number:imgs.join(''),date:ymd,time:clock.length?`${clock[1].padStart(2,'0')}:${clock[2]}:${clock[3]||'00'}`:null});
    }
    const unique=[...new Map(candidates.map(x=>[`${x.number}|${x.date}|${x.time}`,x])).values()];
    return json({ok:true,source:SOURCE,checkedAt:new Date().toISOString(),candidates:unique.slice(0,30),verified:unique.some(x=>x.date&&x.time),message:unique.length?'Hasil gambar terdeteksi; cocokkan tanggal dan jam sebelum simpan.':'Belum ditemukan empat gambar bola dalam satu blok hasil. Struktur situs mungkin berbeda.'});
  }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
}
