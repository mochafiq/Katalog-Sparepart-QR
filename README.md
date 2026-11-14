# Katalog AC Online — Supabase + Vercel

Website katalog publik berdasarkan QR. Pengunjung melihat foto dan detail tanpa login; pemilik dan editor mengelola isi lewat `/admin`. Paket dimulai kosong setelah tersambung Supabase. Mode demo lokal terpisah dan tidak diterapkan ke produksi.

Mulai dari **PANDUAN-PEMASANGAN.md**. Untuk mencoba tampilan di komputer Windows yang mempunyai Node.js, klik **PRATINJAU.bat** lalu buka `http://localhost:3090`. Demo menyimpan data di browser setempat, bukan database produksi.

## Isi paket

- `public/`: aplikasi browser, pustaka Supabase/Excel/ZIP/QR beserta lisensinya.
- `api/config.js`: hanya mengirim URL Supabase dan anon/publishable key dari environment Vercel; service-role/secret key ditolak.
- `supabase/01-schema.sql`: tabel, RLS, RPC penyimpanan, riwayat, backup/restore, dan bucket foto privat.
- `supabase/02-first-owner.sql`: aktivasi pemilik pertama setelah pengguna dibuat di Supabase Auth.
- `scripts/`: pemeriksaan build, server preview, dan backup/restore folder untuk katalog besar.
- `test/`: pengujian aturan impor, konfigurasi, dan PostgreSQL/RLS.
- `templates/`: template CSV kosong; template Excel berformat teks diunduh melalui halaman impor.

## Fitur

Katalog publik, pencarian part number tanpa membedakan spasi/tanda baca, filter merek/kategori, beberapa foto, perbesaran gambar, referensi kendaraan dan status verifikasi, barang terkait, draf/terbit/arsip, catatan internal, kompresi dan thumbnail, impor Excel/CSV + ZIP foto dengan pratinjau/konfirmasi/laporan, label QR satuan/massal, akun pemilik/editor, riwayat dan pemulihan versi, pemeriksaan konflik edit, pemantauan anggaran penyimpanan, serta backup/restore data dan foto.

Tidak ada modul stok, harga, pembelian, kasir, nomor seri per unit, atau fitur AI yang menebak kecocokan. Data kecocokan harus diperiksa oleh bengkel.

## Perintah

```text
npm run build
npm test
node scripts/preview.cjs --demo
node scripts/preview.cjs
node scripts/backup-server.cjs backup PATH_FOLDER_BARU
node scripts/backup-server.cjs restore PATH_FOLDER_BACKUP
```

Tidak ada dependency npm untuk menjalankan/build aplikasi: pustaka browser sudah dibundel. Untuk tes database opsional, instal `@electric-sql/pglite@0.3.14` pada lingkungan pengembangan lalu jalankan `node test/database.test.cjs`. Tes ini menggunakan PostgreSQL WASM dengan tiruan schema Auth/Storage, bukan proyek Supabase sungguhan.

## Batas pengujian

Paket telah diperiksa secara lokal: unit test impor/konfigurasi, database PostgreSQL/RLS, dan alur browser dalam mode demo. Belum dipasang atau diuji pada akun Supabase/Vercel pengguna. SMTP pemulihan password, izin Storage produksi, deploy, domain, cetak fisik, dan scan kamera HP harus melalui checklist pemasangan sebelum dipakai operasional.

Lihat **PANDUAN-PENGGUNAAN.md**, **BACKUP-DAN-PEMULIHAN.md**, dan **HASIL-PENGUJIAN.md** untuk rincian.
