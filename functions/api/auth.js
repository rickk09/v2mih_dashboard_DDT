const COOKIE="ddt_admin",MAX_AGE=43200;
function json(d,s=200,h={}){return new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store",...h}})}
function hex(b){return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function sig(secret,payload){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(payload)))}
function getCookie(req){const raw=req.headers.get("cookie")||"";for(const p of raw.split(";")){const [k,...v]=p.trim().split("=");if(k===COOKIE)return decodeURIComponent(v.join("="))}return ""}
async function valid(secret,t){if(!secret||!t)return false;const p=t.split(".");if(p.length!==3||p[0]!=="admin"||Number(p[1])<Math.floor(Date.now()/1000))return false;const e=await sig(secret,`admin.${p[1]}`);if(e.length!==p[2].length)return false;let d=0;for(let i=0;i<e.length;i++)d|=e.charCodeAt(i)^p[2].charCodeAt(i);return d===0}
export async function onRequestGet(c){if(!c.env.ADMIN_PASSWORD)return json({admin:false,error:"ADMIN_PASSWORD belum dipasang"},503);return json({admin:await valid(c.env.ADMIN_PASSWORD,getCookie(c.request))})}
export async function onRequestPost(c){
  const secret=c.env.ADMIN_PASSWORD;if(!secret)return json({error:"ADMIN_PASSWORD belum dipasang di Cloudflare"},503);
  let b={};try{b=await c.request.json()}catch{}
  if(b.action==="logout")return json({ok:true},200,{"set-cookie":`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});
  if(b.action!=="login")return json({error:"Action tidak valid"},400);
  if(String(b.password||"")!==String(secret))return json({error:"Password Admin salah"},401);
  const exp=Math.floor(Date.now()/1000)+MAX_AGE,payload=`admin.${exp}`,token=`${payload}.${await sig(secret,payload)}`;
  return json({ok:true},200,{"set-cookie":`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`});
}