-- Ganti email ini dengan pengguna yang sudah dibuat di Authentication > Users.
insert into public.catalog_admins(user_id,email,role,active)
select id,email,'owner',true from auth.users where lower(email)=lower('GANTI-EMAIL-ANDA@example.com')
on conflict(user_id) do update set role='owner',active=true;

-- Pastikan hasilnya satu baris sebelum melanjutkan.
select email,role,active from public.catalog_admins;
