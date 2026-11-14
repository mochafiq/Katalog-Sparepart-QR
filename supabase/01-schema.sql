-- Jalankan sekali di SQL Editor pada proyek Supabase baru.
begin;
create table public.catalog_admins (
 user_id uuid primary key references auth.users(id), email text not null,
 role text not null check(role in ('owner','editor')), active boolean not null default true
);
create function public.catalog_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.catalog_admins where user_id=auth.uid() and active)
$$;
create function public.catalog_is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.catalog_admins where user_id=auth.uid() and active and role='owner')
$$;
create table public.catalog_parts (
 id uuid primary key, code text not null check(length(code) between 1 and 60),
 data jsonb not null default '{}', images jsonb not null default '[]' check(jsonb_typeof(images)='array'),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 version integer not null default 1, updated_at timestamptz not null default now()
);
create unique index catalog_code_unique on public.catalog_parts(upper(trim(code)));
create table public.catalog_notes(part_id uuid primary key references public.catalog_parts(id), note text not null default '');
create table public.catalog_revisions(
 id bigint generated always as identity primary key, part_id uuid not null references public.catalog_parts(id),
 version integer not null, snapshot jsonb not null, note text not null,
 actor uuid, actor_email text not null, reason text not null, created_at timestamptz not null default now(),
 unique(part_id,version)
);
create table public.catalog_settings(id integer primary key check(id=1),shop text not null default 'Katalog AC',base_url text not null default '',storage_budget_mb integer not null default 1000 check(storage_budget_mb>0));
insert into public.catalog_settings(id) values(1);
alter table public.catalog_admins enable row level security;
alter table public.catalog_parts enable row level security;
alter table public.catalog_notes enable row level security;
alter table public.catalog_revisions enable row level security;
alter table public.catalog_settings enable row level security;
create policy admins_read on public.catalog_admins for select to authenticated using(public.catalog_is_admin());
create policy parts_read on public.catalog_parts for select to anon,authenticated using(status in ('published','archived') or public.catalog_is_admin());
create policy notes_read on public.catalog_notes for select to authenticated using(public.catalog_is_admin());
create policy revisions_read on public.catalog_revisions for select to authenticated using(public.catalog_is_admin());
create policy settings_read on public.catalog_settings for select to anon,authenticated using(true);
grant select on public.catalog_parts,public.catalog_settings to anon,authenticated;
grant select on public.catalog_notes,public.catalog_revisions,public.catalog_admins to authenticated;
revoke insert,update,delete on public.catalog_parts,public.catalog_notes,public.catalog_revisions,public.catalog_admins,public.catalog_settings from anon,authenticated;

create function public.catalog_save(p_id uuid,p_expected integer,p_code text,p_data jsonb,p_images jsonb,p_status text,p_note text,p_reason text default 'Edit barang')
returns public.catalog_parts language plpgsql security definer set search_path='' as $$
declare old public.catalog_parts; saved public.catalog_parts; image jsonb; clean jsonb; field text; actor text;
begin
 if not public.catalog_is_admin() then raise exception 'Akses admin diperlukan.'; end if;
 if p_id is null or p_expected is null then raise exception 'Identitas dan versi wajib.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into old from public.catalog_parts where id=p_id for update;
 if found then
   if old.version<>p_expected then raise exception 'KONFLIK: Data telah diubah admin lain. Muat ulang sebelum menyimpan.'; end if;
   if old.code<>p_code then raise exception 'Kode internal tidak bisa diubah.'; end if;
 else
   if p_expected<>0 then raise exception 'Barang tidak ditemukan.'; end if;
 end if;
 if length(trim(p_code)) not between 1 and 60 or p_status not in ('draft','published','archived') then raise exception 'Kode atau status tidak valid.'; end if;
 if p_note is null or length(p_note)>10000 then raise exception 'Catatan internal terlalu panjang.'; end if;
 if jsonb_typeof(p_data)<>'object' or jsonb_typeof(p_images)<>'array' or jsonb_array_length(p_images)>12 then raise exception 'Data/foto tidak valid, maksimal 12 foto.'; end if;
 clean='{}'::jsonb;
 foreach field in array array['name','brand','category','part_number','alternate_numbers','spec','fitment','verification','public_note','related_ids'] loop
   if p_data?field and jsonb_typeof(p_data->field)<>'string' then raise exception 'Kolom % harus teks.',field; end if;
   if length(coalesce(p_data->>field,''))>10000 then raise exception 'Kolom % terlalu panjang.',field; end if;
   clean=clean||jsonb_build_object(field,trim(coalesce(p_data->>field,'')));
 end loop;
 if length(clean->>'name') not between 1 and 150 then raise exception 'Nama barang wajib, maksimal 150 karakter.'; end if;
 if length(clean->>'brand')>80 or length(clean->>'category')>80 or length(clean->>'part_number')>100 then raise exception 'Merek/kategori/part number terlalu panjang.'; end if;
 if clean->>'verification' not in ('verified','unverified') then raise exception 'Status verifikasi tidak valid.'; end if;
 if p_status='published' and jsonb_array_length(p_images)=0 then raise exception 'Minimal satu foto wajib sebelum terbit.'; end if;
 for image in select * from jsonb_array_elements(p_images) loop
   if jsonb_typeof(image)<>'object' or image->>'path' is null or image->>'thumb' is null or
     image->>'path' !~ ('^'||p_id::text||'/[a-f0-9-]+\.(jpg|png|webp)$') or
     image->>'thumb' !~ ('^'||p_id::text||'/[a-f0-9-]+\.(jpg|png|webp)$') then raise exception 'Path foto tidak valid.'; end if;
   if length(coalesce(image->>'caption',''))>200 then raise exception 'Keterangan foto maksimal 200 karakter.'; end if;
   if not exists(select 1 from storage.objects where bucket_id='catalog-photos' and name=image->>'path') or
      not exists(select 1 from storage.objects where bucket_id='catalog-photos' and name=image->>'thumb') then raise exception 'File foto belum tersedia di Storage.'; end if;
 end loop;
 if (select count(*)<>count(distinct x->>'path') from jsonb_array_elements(p_images) x) then raise exception 'Foto ganda.'; end if;
 insert into public.catalog_parts(id,code,data,images,status,version,updated_at)
 values(p_id,trim(p_code),clean,p_images,p_status,coalesce(old.version,0)+1,clock_timestamp())
 on conflict(id) do update set data=excluded.data,images=excluded.images,status=excluded.status,version=excluded.version,updated_at=excluded.updated_at returning * into saved;
 insert into public.catalog_notes values(p_id,p_note) on conflict(part_id) do update set note=excluded.note;
 select email into actor from public.catalog_admins where user_id=auth.uid();
 insert into public.catalog_revisions(part_id,version,snapshot,note,actor,actor_email,reason)
 values(p_id,saved.version,to_jsonb(saved),p_note,auth.uid(),coalesce(actor,'Admin'),left(coalesce(p_reason,'Edit barang'),250));
 return saved;
end $$;

create function public.catalog_restore_revision(p_revision bigint,p_expected integer) returns public.catalog_parts
language plpgsql security definer set search_path='' as $$
declare r public.catalog_revisions; s jsonb;
begin
 if not public.catalog_is_admin() then raise exception 'Akses admin diperlukan.'; end if;
 select * into r from public.catalog_revisions where id=p_revision;
 if not found then raise exception 'Versi tidak ditemukan.'; end if;
 s=r.snapshot;
 return public.catalog_save(r.part_id,p_expected,s->>'code',s->'data',s->'images',s->>'status',r.note,'Pulihkan versi '||r.version);
end $$;

create function public.catalog_set_settings(p_shop text,p_base_url text,p_budget integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.catalog_is_owner() then raise exception 'Hanya pemilik dapat mengubah pengaturan.'; end if;
 if length(trim(p_shop)) not between 1 and 100 or p_base_url !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' or p_budget not between 1 and 1000000 then raise exception 'Nama, alamat HTTPS, atau batas penyimpanan tidak valid.'; end if;
 update public.catalog_settings set shop=trim(p_shop),base_url=p_base_url,storage_budget_mb=p_budget where id=1;
end $$;

create function public.catalog_set_admin(p_email text,p_role text,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not public.catalog_is_owner() then raise exception 'Hanya pemilik dapat mengatur akses.'; end if;
 if p_role not in ('owner','editor') or p_active is null then raise exception 'Peran tidak valid.'; end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email));
 if target is null then raise exception 'Buat pengguna di Supabase Authentication terlebih dahulu.'; end if;
 -- Serialisasi perubahan akses agar dua pemilik tidak saling menonaktifkan bersamaan.
 perform pg_advisory_xact_lock(724021);
 if exists(select 1 from public.catalog_admins where user_id=target and role='owner' and active) and (p_role<>'owner' or not p_active)
 and (select count(*) from public.catalog_admins where role='owner' and active)<=1 then raise exception 'Minimal satu pemilik aktif harus dipertahankan.'; end if;
 insert into public.catalog_admins values(target,lower(trim(p_email)),p_role,p_active)
 on conflict(user_id) do update set role=excluded.role,active=excluded.active,email=excluded.email;
end $$;

create function public.catalog_storage_usage() returns bigint language plpgsql security definer set search_path='' as $$
begin
 if not public.catalog_is_admin() then raise exception 'Akses admin diperlukan.'; end if;
 return (select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) from storage.objects where bucket_id='catalog-photos');
end $$;
create function public.catalog_backup() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.catalog_is_owner() then raise exception 'Backup lengkap hanya untuk pemilik.'; end if;
 return jsonb_build_object('format','KATALOG_AC_2','exported_at',now(),
 'signature',(select md5(coalesce(string_agg(id::text||':'||version::text,',' order by id),'empty')) from public.catalog_parts),
 'parts',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.catalog_parts p),
 'notes',(select coalesce(jsonb_agg(to_jsonb(n)),'[]') from public.catalog_notes n),
 'revisions',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.catalog_revisions r),
 'admins',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.catalog_admins a),
 'settings',(select to_jsonb(s) from public.catalog_settings s where id=1));
end $$;
create function public.catalog_restore_backup(p_backup jsonb,p_signature text) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; rev jsonb; p public.catalog_parts; signature text; note text;
begin
 if not public.catalog_is_owner() then raise exception 'Restore hanya untuk pemilik.'; end if;
 if p_backup->>'format' is distinct from 'KATALOG_AC_2' or jsonb_typeof(p_backup->'parts') is distinct from 'array' or jsonb_typeof(p_backup->'notes') is distinct from 'array' or jsonb_typeof(p_backup->'revisions') is distinct from 'array' or jsonb_typeof(p_backup->'settings') is distinct from 'object' then raise exception 'Format backup tidak valid.'; end if;
 lock table public.catalog_parts in share row exclusive mode;
 select md5(coalesce(string_agg(id::text||':'||version::text,',' order by id),'empty')) into signature from public.catalog_parts;
 if signature is distinct from p_signature then raise exception 'KONFLIK: Katalog berubah selama persiapan restore. Ulangi dari awal.'; end if;
 delete from public.catalog_revisions; delete from public.catalog_notes; delete from public.catalog_parts;
 for item in select * from jsonb_array_elements(p_backup->'parts') loop
   select coalesce(n->>'note','') into note from jsonb_array_elements(p_backup->'notes') n where n->>'part_id'=item->>'id';
   p=public.catalog_save((item->>'id')::uuid,0,item->>'code',item->'data',item->'images',item->>'status',coalesce(note,''),'Pemulihan backup');
   if (item->>'version')::integer<1 then raise exception 'Versi backup tidak valid.'; end if;
   update public.catalog_parts set version=(item->>'version')::integer,updated_at=(item->>'updated_at')::timestamptz where id=p.id;
 end loop;
 delete from public.catalog_revisions;
 for rev in select * from jsonb_array_elements(p_backup->'revisions') loop
   insert into public.catalog_revisions(part_id,version,snapshot,note,actor,actor_email,reason,created_at)
   values((rev->>'part_id')::uuid,(rev->>'version')::integer,rev->'snapshot',coalesce(rev->>'note',''),null,coalesce(rev->>'actor_email','Backup'),coalesce(rev->>'reason','Backup'),(rev->>'created_at')::timestamptz);
 end loop;
 for p in select * from public.catalog_parts loop
   select n.note into note from public.catalog_notes n where n.part_id=p.id;
   perform public.catalog_save(p.id,p.version,p.code,p.data,p.images,p.status,coalesce(note,''),'Pemulihan backup oleh pemilik');
 end loop;
 -- Hak akses pengguna tidak diambil dari file backup untuk mencegah pemberian akses yang tidak disengaja.
 update public.catalog_settings set shop=left(coalesce(p_backup->'settings'->>'shop','Katalog AC'),100),
 base_url=coalesce(p_backup->'settings'->>'base_url',''),storage_budget_mb=greatest(1,coalesce((p_backup->'settings'->>'storage_budget_mb')::integer,1000)) where id=1;
end $$;
revoke all on function public.catalog_backup(),public.catalog_restore_backup(jsonb,text) from public,anon;
grant execute on function public.catalog_backup(),public.catalog_restore_backup(jsonb,text) to authenticated;
revoke all on function public.catalog_save(uuid,integer,text,jsonb,jsonb,text,text,text),public.catalog_restore_revision(bigint,integer),public.catalog_set_settings(text,text,integer),public.catalog_set_admin(text,text,boolean),public.catalog_storage_usage() from public,anon;
grant execute on function public.catalog_save(uuid,integer,text,jsonb,jsonb,text,text,text),public.catalog_restore_revision(bigint,integer),public.catalog_set_settings(text,text,integer),public.catalog_set_admin(text,text,boolean),public.catalog_storage_usage() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalog-photos','catalog-photos',false,8388608,array['image/jpeg','image/png','image/webp']);
create policy catalog_photos_read on storage.objects for select to anon,authenticated using (
 bucket_id='catalog-photos' and (public.catalog_is_admin() or exists (
 select 1 from public.catalog_parts p, jsonb_array_elements(p.images) image
 where p.status in ('published','archived') and (image->>'path'=storage.objects.name or image->>'thumb'=storage.objects.name)
 ))
);
create policy catalog_photos_insert on storage.objects for insert to authenticated with check (
 bucket_id='catalog-photos' and public.catalog_is_admin() and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'
);
-- Tidak ada kebijakan update/delete file. File versi lama dipertahankan untuk restore.
commit;
