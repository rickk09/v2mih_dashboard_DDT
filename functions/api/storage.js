const COOKIE="ddt_admin";
const MAX_FILE_BYTES=5*1024*1024;
const MAX_CHUNK_BYTES=512*1024;
function j(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}})}
function hex(b){return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function sig(s,p){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(s),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(p)))}
function ck(r){for(const p of(r.headers.get("cookie")||"").split(";")){const[k,...v]=p.trim().split("=");if(k===COOKIE)return decodeURIComponent(v.join("="))}return""}
async function admin(r,s){const t=ck(r);if(!s||!t)return false;const p=t.split(".");if(p.length!==3||p[0]!=="admin"||Number(p[1])<Date.now()/1000)return false;return await sig(s,`admin.${p[1]}`)===p[2]}
function key(v){v=String(v||"").replace(/\\/g,"/").replace(/^\/+/,"");return(!v||v.includes("../"))?"":v.slice(0,500)}
async function init(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS file_storage_v2 (file_key TEXT PRIMARY KEY, content_type TEXT NOT NULL, size INTEGER NOT NULL, uploaded TEXT NOT NULL, chunks INTEGER NOT NULL)`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS file_storage_chunks_v2 (file_key TEXT NOT NULL, chunk_no INTEGER NOT NULL, content_b64 TEXT NOT NULL, PRIMARY KEY(file_key,chunk_no))`).run();
}
function b64(bytes){let out="";const u=new Uint8Array(bytes),step=0x8000;for(let i=0;i<u.length;i+=step)out+=String.fromCharCode(...u.subarray(i,i+step));return btoa(out)}
function unb64(s){const raw=atob(s),u=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);return u}
export async function onRequestGet(c){
 if(!c.env.DB)return j({error:"D1 binding DB belum dipasang"},503);await init(c.env.DB);
 const u=new URL(c.request.url),k=key(u.searchParams.get("key"));
 if(u.searchParams.get("list")){const prefix=key(u.searchParams.get("prefix")||"");const r=await c.env.DB.prepare(`SELECT file_key AS key,size,uploaded,chunks FROM file_storage_v2 WHERE file_key LIKE ? ORDER BY uploaded DESC LIMIT 1000`).bind(prefix+"%").all();return j({items:r.results||[],maxFileBytes:MAX_FILE_BYTES})}
 if(!k)return j({error:"Missing key"},400);
 const meta=await c.env.DB.prepare(`SELECT content_type,size,chunks FROM file_storage_v2 WHERE file_key=?`).bind(k).first();if(!meta)return j({error:"File tidak ditemukan"},404);
 const rows=await c.env.DB.prepare(`SELECT chunk_no,content_b64 FROM file_storage_chunks_v2 WHERE file_key=? ORDER BY chunk_no`).bind(k).all();if((rows.results||[]).length!==meta.chunks)return j({error:"File belum lengkap / chunk tidak lengkap"},409);
 const parts=(rows.results||[]).map(r=>unb64(r.content_b64));const out=new Uint8Array(meta.size);let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length}
 const h=new Headers({"content-type":meta.content_type||"application/octet-stream","cache-control":"public, max-age=60"});if(u.searchParams.get("download"))h.set("content-disposition",`attachment; filename="${k.split("/").pop().replace(/"/g,"")}"`);return new Response(out,{headers:h})
}
export async function onRequestPut(c){
 if(!await admin(c.request,c.env.ADMIN_PASSWORD))return j({error:"Admin login diperlukan"},401);if(!c.env.DB)return j({error:"D1 binding DB belum dipasang"},503);await init(c.env.DB);
 const u=new URL(c.request.url),k=key(u.searchParams.get("key"));if(!k)return j({error:"Nama file tidak valid"},400);
 const chunk=Number(u.searchParams.get("chunk")),chunks=Number(u.searchParams.get("chunks")),total=Number(u.searchParams.get("size"));
 if(!Number.isInteger(chunk)||!Number.isInteger(chunks)||chunk<0||chunks<1||chunk>=chunks||!Number.isFinite(total)||total<0)return j({error:"Parameter upload chunk tidak valid"},400);
 if(total>MAX_FILE_BYTES)return j({error:"File terlalu besar. Maksimal 5 MB per file pada V35 FREE MAX."},413);
 const ab=await c.request.arrayBuffer();if(ab.byteLength>MAX_CHUNK_BYTES)return j({error:"Chunk terlalu besar"},413);
 const type=(c.request.headers.get("content-type")||"application/octet-stream").slice(0,200),now=new Date().toISOString();
 if(chunk===0){await c.env.DB.prepare(`DELETE FROM file_storage_chunks_v2 WHERE file_key=?`).bind(k).run();await c.env.DB.prepare(`INSERT INTO file_storage_v2(file_key,content_type,size,uploaded,chunks) VALUES(?,?,?,?,?) ON CONFLICT(file_key) DO UPDATE SET content_type=excluded.content_type,size=excluded.size,uploaded=excluded.uploaded,chunks=excluded.chunks`).bind(k,type,total,now,chunks).run()}
 await c.env.DB.prepare(`INSERT INTO file_storage_chunks_v2(file_key,chunk_no,content_b64) VALUES(?,?,?) ON CONFLICT(file_key,chunk_no) DO UPDATE SET content_b64=excluded.content_b64`).bind(k,chunk,b64(ab)).run();
 return j({ok:true,key:k,chunk:chunk+1,chunks})
}
export async function onRequestDelete(c){
 if(!await admin(c.request,c.env.ADMIN_PASSWORD))return j({error:"Admin login diperlukan"},401);if(!c.env.DB)return j({error:"D1 binding DB belum dipasang"},503);await init(c.env.DB);const k=key(new URL(c.request.url).searchParams.get("key"));if(!k)return j({error:"Missing key"},400);await c.env.DB.prepare(`DELETE FROM file_storage_chunks_v2 WHERE file_key=?`).bind(k).run();await c.env.DB.prepare(`DELETE FROM file_storage_v2 WHERE file_key=?`).bind(k).run();return j({ok:true})
}
