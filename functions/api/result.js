const ALLOWED_CODES=new Set(["p9005","p9006","p6152","p6153","p6154","p6155","p6156","p6157","p6158","p6159","p6160","p6161","p14076","p14078","p14080","p14081","p14184","p14185","p14186","p14187","p14188","p14189","p14190","p14347","p14348","p14349","p14386","p14387","p14756","p14811","p14812","p14835","p14836","p14837","p14923","p1715","p1716","p1717","p1718","p1719","p1720","p2126","p2607","m17","m51","m83"]);
const DEFAULT_BASE="https://dingdong39256.com";

function safeBase(raw){
  if(!raw)return DEFAULT_BASE;
  try{
    const u=new URL(raw);
    if(u.protocol!=="https:"||u.username||u.password)return DEFAULT_BASE;
    const h=u.hostname.toLowerCase();
    if(h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||
       /^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||
       /^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return DEFAULT_BASE;
    return u.origin;
  }catch{return DEFAULT_BASE}
}

export async function onRequestGet(context){
  const u=new URL(context.request.url);
  const code=(u.searchParams.get("code")||"").trim();
  if(!ALLOWED_CODES.has(code))return new Response("Invalid market code",{status:400});
  const base=safeBase(u.searchParams.get("base"));
  const upstream=`${base}/history/result/${encodeURIComponent(code)}/kosong`;
  try{
    const r=await fetch(upstream,{headers:{
      "Accept":"text/html,application/xhtml+xml",
      "Accept-Language":"id-ID,id;q=0.9,en;q=0.8",
      "Referer":base+"/history/number",
      "User-Agent":"Mozilla/5.0 (compatible; DDTResultSync/2.0)"
    }});
    const body=await r.text();
    if(!r.ok)return new Response(`Upstream HTTP ${r.status}`,{status:502,headers:{"cache-control":"no-store"}});
    return new Response(body,{status:200,headers:{
      "content-type":"text/html; charset=UTF-8",
      "cache-control":"no-store, no-cache, must-revalidate",
      "x-workdash-proxy":"cloudflare-pages-function",
      "x-history-base":base
    }});
  }catch(e){
    return new Response(`Proxy error: ${e?.message||"unknown error"}`,{status:502,headers:{"cache-control":"no-store"}});
  }
}
