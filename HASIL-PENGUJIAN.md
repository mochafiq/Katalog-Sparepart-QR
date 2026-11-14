# Verifikasi paket

Pengujian dilakukan pada 10 November 2026, sebelum proyek Supabase/Vercel pengguna tersedia.

## Otomatis: aturan aplikasi

Perintah: `node --test test/core.test.cjs`.

- Parsing CSV: kutip, koma/titik-koma, multiline, serta kode/part number dengan nol di depan.
- Validasi kode duplikat, mode tambah/perbarui, sel kosong, foto hilang, dan barang terkait.
- Publikasi tanpa foto ditolak.
- Laporan CSV menetralkan awalan formula spreadsheet.
- Endpoint konfigurasi menolak service-role JWT dan secret key.

## Otomatis: PostgreSQL dan RLS

Perintah: `node test/database.test.cjs`, dengan `@electric-sql/pglite@0.3.14` tersedia.

Schema aplikasi dijalankan pada mesin PostgreSQL WASM; schema `auth` dan `storage` dibuat sebagai tiruan minimal untuk menguji kebijakan SQL.

- Pengunjung tidak dapat membaca barang draf, catatan internal, atau foto draf.
- Pengunjung dapat membaca barang/foto terbit dan tidak dapat melakukan update langsung.
- Akun biasa di luar daftar admin tidak dapat menyimpan.
- Editor dapat menyimpan tetapi tidak mengambil backup lengkap atau mengubah pengaturan pemilik.
- Versi lama tidak dapat menimpa versi terbaru.
- Terbit tanpa foto ditolak.
- Pemilik terakhir tidak dapat dinonaktifkan.
- Pemulihan versi dan backup berjalan; signature berbeda menggagalkan restore.
- Penonaktifan editor mencabut kemampuannya menyimpan.

## Browser: demo lokal

- Katalog, login demo, editor, halaman detail, dan pencarian/filter ditampilkan.
- Impor CSV + ZIP foto: dua baris valid berhasil; satu foto hilang ditandai dan dilewati.
- Foto dikompresi/di-thumbnail dan keterangan ditampilkan pada halaman detail.
- Part number `000123` tetap utuh setelah impor dan publikasi demo.
- Template Excel dapat diunduh.
- Backup demo menghasilkan manifest dan dua file foto/thumbnail.
- File Excel hasil unduhan dibaca kembali oleh aplikasi; nama foto yang belum disertakan ditandai.
- File template diperiksa ulang: part number `0012345` berupa teks, kolom menggunakan format teks, dan header lengkap.
- Isi backup hasil unduhan diperiksa ulang: ukuran serta hash SHA-256 kedua file cocok dengan manifest.
- Lebar katalog dan label diperiksa pada viewport 390, 768, dan 1.280 piksel tanpa luapan halaman ke samping.
- Gambar QR berhasil termuat tanpa layanan eksternal; isi QR diuji baca balik menggunakan decoder terpisah.

## Batas verifikasi

Pengujian tersebut tidak menggantikan uji integrasi pada Supabase/Vercel yang sebenarnya. Belum diverifikasi pada akun pengguna: provisioning proyek, API Auth/Storage langsung, SMTP/email pemulihan, deployment Vercel, domain/DNS/HTTPS, printer fisik, atau kamera HP. Ikuti checklist pemasangan sebelum digunakan operasional.

Mode demo memakai penyimpanan browser dan tidak memberikan jaminan keamanan database produksi. Keamanan produksi diterapkan oleh schema/RLS Supabase. Jangan menjadikan demo sebagai tempat penyimpanan data bengkel.
