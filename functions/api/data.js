const JSON_HEADERS={"content-type":"application/json; charset=UTF-8","cache-control":"no-store"};

function reply(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
}
async function ensureTable(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
}
export async function onRequestGet(context){
  const db=context.env.DB;
  if(!db)return reply({error:"D1 binding DB belum dipasang"},503);
  await ensureTable(db);
  const u=new URL(context.request.url);
  const key=(u.searchParams.get("key")||"").trim();
  if(!key)return reply({error:"Missing key"},400);
  const row=await db.prepare("SELECT value, updated_at FROM app_data WHERE key=?1").bind(key).first();
  if(!row)return reply({exists:false,key});
  let value=null;
  try{value=JSON.parse(row.value)}catch{value=row.value}
  return reply({exists:true,key,value,updated_at:Number(row.updated_at)||0});
}
export async function onRequestPost(context){
  const db=context.env.DB;
  if(!db)return reply({error:"D1 binding DB belum dipasang"},503);
  await ensureTable(db);
  let body;
  try{body=await context.request.json()}catch{return reply({error:"JSON tidak valid"},400)}
  const key=String(body?.key||"").trim();
  if(!key)return reply({error:"Missing key"},400);
  const value=JSON.stringify(body.value??null);
  if(value.length>900000)return reply({error:"Data terlalu besar"},413);
  const updated_at=Date.now();
  await db.prepare(`INSERT INTO app_data(key,value,updated_at) VALUES(?1,?2,?3)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
    .bind(key,value,updated_at).run();
  return reply({ok:true,key,updated_at});
}
