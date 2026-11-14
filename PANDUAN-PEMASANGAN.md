# Memasang Katalog AC di Supabase + Vercel

Paket ini adalah source website siap dipasang. Website belum online dan tidak memuat kredensial akun Anda. Komputer bengkel tidak perlu terus menyala setelah website dipasang di layanan cloud.

## 1. Siapkan akun dan proyek Supabase

1. Buat akun melalui [Supabase](https://supabase.com/), lalu buat proyek baru khusus katalog ini.
2. Simpan password database di tempat aman. Pilih region terdekat yang tersedia bagi pengguna Anda.
3. Buka **SQL Editor**, buat query baru, tempel seluruh isi `supabase/01-schema.sql`, lalu jalankan. Jalankan sekali pada proyek baru; script memakai transaksi agar kegagalan tidak meninggalkan pemasangan setengah selesai.
4. Periksa tabel `catalog_parts`, `catalog_notes`, `catalog_revisions`, `catalog_admins`, dan `catalog_settings`.
5. Buka Storage. Harus ada bucket **catalog-photos** dan statusnya **Private**. Jangan mengubah menjadi Public: itu akan membuka akses langsung ke foto draf.
6. Di pengaturan API proyek, ambil **Project URL** dan **anon key** atau **publishable key**. Label menu bisa berbeda antartampilan dashboard.
7. Jangan gunakan `service_role`, `sb_secret_...`, atau password database untuk konfigurasi website.

## 2. Buat pemilik pertama

1. Buka **Authentication > Users**, buat satu pengguna menggunakan email Anda dan password yang kuat. Aktifkan/konfirmasikan email melalui fasilitas dashboard yang tersedia.
2. Buka `supabase/02-first-owner.sql`. Ganti `GANTI-EMAIL-ANDA@example.com` dengan email tadi, lalu jalankan di SQL Editor.
3. Pastikan query terakhir mengembalikan satu baris dengan role `owner` dan `active = true`. Jika hasilnya kosong, periksa pengguna dan penulisan email.
4. Di pengaturan Authentication, nonaktifkan pendaftaran publik jika katalog hanya menggunakan akun yang dibuat pengelola. Sekadar memiliki akun Auth tidak memberikan hak admin; email pengguna tetap perlu diberi akses oleh pemilik.
5. Atur minimum password 12 karakter di pengaturan Auth jika tersedia. Form aplikasi juga menetapkan minimum tersebut untuk penggantian password.

## 3. Siapkan repository source

1. Buat repository GitHub privat untuk source ini. Jangan masukkan folder `.env`, `.env.local`, backup, atau data internal ke repository.
2. Unggah isi folder paket, sehingga `package.json`, `vercel.json`, `api/`, dan `public/` berada di root repository.
3. Gunakan repository milik Anda/organisasi bengkel, sehingga kendali website tidak bergantung pada akun orang lain.

Alternatif untuk teknisi yang sudah menggunakan Vercel CLI: jalankan deployment dari root folder paket. Tidak perlu menggunakan hosting Sites; source ini memang disiapkan untuk Vercel sesuai permintaan.

## 4. Deploy ke Vercel

1. Buat akun di [Vercel](https://vercel.com/), lalu pilih **Add New Project** dan impor repository tersebut.
2. Framework preset: **Other**. Root Directory: root repository paket.
3. Build Command: `node scripts/check.cjs`.
4. Output Directory: `public`.
5. Tambahkan dua environment variables berikut pada lingkungan Production dan Preview yang Anda gunakan:

| Nama | Nilai |
|---|---|
| `SUPABASE_URL` | `https://PROJECT-ANDA.supabase.co` |
| `SUPABASE_ANON_KEY` | Anon key atau publishable key proyek Anda |

6. Deploy. Build tidak memerlukan dependency npm tambahan.
7. Buka alamat hasil deployment. Jika halaman menampilkan pesan konfigurasi, periksa environment variables dan deploy ulang. Environment yang diubah tidak otomatis mengganti deployment lama.

Gunakan paket Vercel yang mengizinkan penggunaan bisnis Anda. Hobby ditujukan untuk penggunaan pribadi nonkomersial; periksa [ketentuan Vercel](https://vercel.com/docs/limits/fair-use-guidelines) dan biaya layanan sebelum operasional. Kuota dan pilihan paket Supabase/Vercel harus Anda periksa di dashboard masing-masing.

## 5. Domain dan pemulihan password

1. Bila mempunyai domain, tambahkan domain/subdomain katalog di pengaturan domain Vercel dan ikuti catatan DNS yang diberikan. Tunggu HTTPS aktif.
2. Di Supabase Authentication URL Configuration, isi **Site URL** dengan alamat website permanen.
3. Tambahkan URL redirect yang tepat: `https://DOMAIN-ANDA/reset-password`. Jika masih menguji melalui alamat Vercel, tambahkan URL pengujian yang diperlukan juga. Hindari wildcard domain yang terlalu luas.
4. Konfigurasikan SMTP melalui penyedia email yang Anda gunakan agar email pemulihan dapat terkirim. Ikuti [panduan password Supabase](https://supabase.com/docs/guides/auth/passwords).
5. Uji tombol **Lupa password?** dari halaman `/admin`; periksa email, buka tautannya, lalu simpan password baru. Jangan hanya menganggap berhasil karena tombol pengiriman tidak menampilkan error.

## 6. Pengaturan awal aplikasi

1. Buka `https://DOMAIN-ANDA/admin`, lalu login sebagai pemilik.
2. Buka **Pengaturan & backup**. Isi nama bengkel, domain permanen tanpa path tambahan, dan anggaran penyimpanan foto dalam MB.
3. Domain dapat berupa alamat produksi Vercel selama Anda mempertahankan alamat itu. Domain sendiri memberi fleksibilitas saat berpindah hosting.
4. Anggaran MB adalah ambang pemantauan di aplikasi, bukan pembacaan kuota paket Supabase secara otomatis.
5. Tambahkan satu sparepart uji yang memang milik bengkel, satu foto, dan informasi yang telah diperiksa. Simpan sebagai draf; pratinjau, lalu terbitkan.
6. Cetak satu label, scan dari HP dengan jaringan seluler, dan pastikan foto serta detail yang benar terbuka tanpa login.

## 7. Pemeriksaan sebelum dipakai

- Katalog publik dan deep link `/p/UUID` bisa dibuka lewat jaringan seluler, termasuk setelah refresh browser.
- Foto terbit bisa dilihat tanpa login; barang draf dan foto yang hanya melekat pada draf tidak dapat diunduh pengunjung.
- Catatan internal tidak terlihat pada respons publik dan tidak tampil di halaman barang.
- Akun editor bisa mengelola barang/impor, tetapi tidak dapat mengubah akses atau mengambil backup lengkap.
- Akun dinonaktifkan tidak dapat membaca data admin atau menyimpan perubahan meski masih mempunyai sesi login.
- Dua tab yang mengedit versi sama menghasilkan pesan konflik pada penyimpanan kedua.
- Uji impor Excel/CSV dan ZIP foto kecil dahulu; periksa angka nol di depan part number.
- Unduh backup dan uji pemulihan pada proyek pengujian terpisah. Jangan pertama kali belajar restore pada data operasional.
- Uji email pemulihan password, printer, keterbacaan QR, dan kesesuaian ukuran stiker.

## Jika ada masalah

| Gejala | Periksa |
|---|---|
| Konfigurasi belum siap | Environment Vercel, jenis key, dan redeploy |
| Login berhasil tetapi akses ditolak | Pengguna Auth telah masuk `catalog_admins` dengan status aktif |
| Foto tidak tampil | Bucket tetap Private, seluruh SQL berhasil, RLS dan koneksi Supabase |
| Foto hilang setelah edit | Jangan menghapus file secara manual di dashboard Storage; gunakan backup jika file terhapus |
| Reset password tidak terkirim | SMTP, konfirmasi email, spam, pembatasan pengiriman, URL redirect |
| Refresh halaman barang menghasilkan 404 | `vercel.json` ada di root proyek dan rewrite tidak dihapus |
| QR menunjuk alamat lama | Nilai domain yang tertanam pada stiker tidak berubah otomatis; pertahankan domain atau cetak ulang |

Referensi teknis: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage privat](https://supabase.com/docs/guides/storage/serving/downloads), [environment Vercel](https://vercel.com/docs/environment-variables).
