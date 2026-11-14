const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;grant select,insert on storage.objects to anon,authenticated;
insert into auth.users values('00000000-0000-4000-8000-000000000001','owner@test.local'),('00000000-0000-4000-8000-000000000002','editor@test.local'),('00000000-0000-4000-8000-000000000003','outsider@test.local');`);
await db.exec(fs.readFileSync(require('node:path').join(__dirname,'../supabase/01-schema.sql'),'utf8'));
await db.exec(`insert into public.catalog_admins values('00000000-0000-4000-8000-000000000001','owner@test.local','owner',true),('00000000-0000-4000-8000-000000000002','editor@test.local','editor',true);`);
const owner='00000000-0000-4000-8000-000000000001',editor='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
async function actor(user,role='authenticated'){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user||''}',false);set role ${role};`);}
const id='10000000-0000-4000-8000-000000000001',photo=id+'/20000000-0000-4000-8000-000000000001.webp',thumb=id+'/20000000-0000-4000-8000-000000000002.webp';
const data={name:'Filter',brand:'ABC',category:'Filter',part_number:'001',verification:'unverified'},images=[{path:photo,thumb,caption:'Foto uji'}];
async function save(version,status='draft',img=images,d=data){return (await db.query('select * from public.catalog_save($1,$2,$3,$4,$5,$6,$7,$8)',[id,version,'AC-01',JSON.stringify(d),JSON.stringify(img),status,'INTERNAL RAHASIA','Uji'])).rows[0];}
await actor(null,'anon');assert.equal((await db.query('select * from public.catalog_parts')).rows.length,0);await assert.rejects(()=>save(0));await assert.rejects(()=>db.query('select * from public.catalog_notes'));
await actor(owner);await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$4),($1,$3,$4)',['catalog-photos',photo,thumb,JSON.stringify({size:100})]);
let p=await save(0);assert.equal(p.version,1);
await actor(null,'anon');assert.equal((await db.query('select * from public.catalog_parts')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
await actor(owner);await assert.rejects(()=>save(0));await assert.rejects(()=>save(1,'published',[]));p=await save(1,'published');assert.equal(p.version,2);
await actor(null,'anon');let publicParts=(await db.query('select * from public.catalog_parts')).rows;assert.equal(publicParts.length,1);assert.equal(publicParts[0].note,undefined);assert.equal((await db.query('select * from storage.objects')).rows.length,2);await assert.rejects(()=>db.query('update public.catalog_parts set status=\'draft\''));
await actor(outsider);await assert.rejects(()=>save(2));assert.equal((await db.query('select * from public.catalog_notes')).rows.length,0);
await actor(editor);await assert.rejects(()=>db.query('select public.catalog_backup()'));await assert.rejects(()=>db.query("select public.catalog_set_settings('X','https://example.com',1000)"));p=await save(2,'draft');assert.equal(p.version,3);
await actor(null,'anon');assert.equal((await db.query('select * from storage.objects')).rows.length,0);
await actor(owner);const revision=(await db.query('select id from public.catalog_revisions where version=2')).rows[0].id;
await db.query('select public.catalog_restore_revision($1,$2)',[revision,3]);assert.equal((await db.query('select version from public.catalog_parts')).rows[0].version,4);
await assert.rejects(()=>db.query("select public.catalog_set_admin('owner@test.local','editor',false)"));
const b=(await db.query('select public.catalog_backup() as b')).rows[0].b;assert.equal(b.parts.length,1);assert.equal(b.revisions.length,4);
await assert.rejects(()=>db.query('select public.catalog_restore_backup($1,$2)',[JSON.stringify(b),'wrong']));
await db.query('select public.catalog_restore_backup($1,$2)',[JSON.stringify(b),b.signature]);assert.equal((await db.query('select version from public.catalog_parts')).rows[0].version,5);assert.equal((await db.query('select * from public.catalog_revisions')).rows.length,5);
await db.query("select public.catalog_set_admin('editor@test.local','editor',false)");await actor(editor);await assert.rejects(()=>save(5));
await actor(null,'anon');assert.equal((await db.query('select count(*) as n from public.catalog_parts')).rows[0].n,1);
console.log('PostgreSQL/RLS: LULUS — draf/foto tersembunyi, anon read-only, editor/pemilik, versi konflik, restore versi & backup, akses dinonaktifkan.');await db.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
