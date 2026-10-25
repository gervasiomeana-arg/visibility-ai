import{PGlite}from'@electric-sql/pglite';
import{readFileSync,readdirSync}from'node:fs';
import{backupTables,validateOperatorBackup,checksum}from'../shared/operatorBackup';
import{visibilityOperatorId}from'../shared/operatorAccess';
// No connection string, production URL or existing data directory is accepted.
// This is deliberately an in-memory recovery rehearsal, never a live restore.
export async function emptyBackupDatabase(){
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;grant usage on schema public,auth to anon,authenticated,service_role;
  alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  const directory=new URL('../supabase/migrations/',import.meta.url);
  const migrations=readdirSync(directory).filter(f=>f.endsWith('.sql')).sort();
  for(const file of migrations.filter(f=>!f.endsWith('_exclusive_operator_access.sql')))await db.exec(readFileSync(new URL(file,directory),'utf8').replace('create extension if not exists pgcrypto;',''));
  return {db,directory,migrations};
 }catch(error){await db.close();throw error;}
}
export async function rehearseBackupRestore(input:unknown){
 const backup=await validateOperatorBackup(input);const {db,directory,migrations}=await emptyBackupDatabase();
 try{
  await db.exec('alter table auth.users disable trigger user');
  const profile=backup.tables.profiles.find(r=>r.id===visibilityOperatorId);await db.query('insert into auth.users(id,email) values($1,$2)',[visibilityOperatorId,profile?.email||'operator@example.test']);
  await db.exec('alter table auth.users enable trigger user');
  await db.exec('truncate '+backupTables.map(t=>'public."'+t+'"').join(',')+' cascade');
  for(const table of backupTables){const rows=backup.tables[table];await db.exec(`alter table public."${table}" disable trigger user`);if(rows.length)await db.query(`insert into public."${table}" select * from jsonb_populate_recordset(null::public."${table}",$1::jsonb)`,[JSON.stringify(rows)]);await db.exec(`alter table public."${table}" enable trigger user`);}
  for(const file of migrations.filter(f=>f.endsWith('_exclusive_operator_access.sql')))await db.exec(readFileSync(new URL(file,directory),'utf8'));
  const counts:Record<string,number>={};
  for(const table of backupTables){const rows=backup.tables[table];const count=await db.query<{n:number}>(`select count(*)::integer n from public."${table}"`);counts[table]=count.rows[0].n;if(counts[table]!==rows.length)throw Error('Cantidad recuperada diferente: '+table);
   const mismatch=await db.query<{n:number}>(`select count(*)::integer n from public."${table}" t where not exists(select 1 from jsonb_populate_recordset(null::public."${table}",$1::jsonb) expected where to_jsonb(t)=to_jsonb(expected))`,[JSON.stringify(rows)]);if(mismatch.rows[0].n)throw Error('Contenido recuperado diferente: '+table);
  }
  const recoveredFiles=new Map<string,Uint8Array>();
  for(const file of backup.files){const bytes=Buffer.from(file.base64,'base64');if(await checksum(bytes)!==file.sha256)throw Error('PDF recuperado diferente.');recoveredFiles.set(file.path,bytes);await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['visibility-client-reports',file.path]);}
  // Enforce the private account after reconstruction, too.
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${visibilityOperatorId}'`);
  const own=await db.query<{ok:boolean}>('select public.is_visibility_operator() ok');if(!own.rows[0].ok)throw Error('El operador no puede acceder a la recuperación.');
  await db.exec("set request.jwt.claim.sub='00000000-0000-4000-8000-000000000099'");const foreign=await db.query('select id from public.client_accounts');if(foreign.rows.length)throw Error('La recuperación no conserva el aislamiento.');
  return {ok:true,scope:'isolated-rehearsal',createdAt:backup.createdAt,tables:counts,pdfs:recoveredFiles.size,pdfBytes:backup.files.reduce((n,f)=>n+f.size,0),exclusions:backup.excluded};
 }finally{await db.close();}
}
