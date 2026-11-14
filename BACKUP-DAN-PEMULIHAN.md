# Backup dan pemulihan

## Backup dari browser

Pemilik membuka **Pengaturan & backup > Unduh backup lengkap**. Simpan ZIP di tempat berbeda dari perangkat kerja dan batasi aksesnya karena berisi catatan internal.

Isi ZIP:

- `manifest.json`: barang, catatan internal, riwayat versi, pengaturan, daftar akses untuk referensi, dan daftar hash SHA-256 file.
- `photos/`: seluruh foto/thumbnail yang dirujuk oleh barang sekarang maupun versi lama.

Database diambil sebagai satu snapshot. File foto bersifat tetap setelah diunggah; aplikasi tidak menimpa atau menghapusnya. Karena itu, pengunduhan foto setelah snapshot tetap menggunakan isi file yang sama.

Backup browser dibatasi 180 MB total foto dan 4.999 file foto/thumbnail; ukuran arsip restore maksimum 210 MB. Ini adalah batas aplikasi untuk mengendalikan pemakaian memori, bukan kuota layanan. Jika katalog lebih besar, gunakan alat folder di bawah. Jika backup terlalu besar, aplikasi berhenti dengan pesan; jangan menganggap backup parsial sebagai backup yang berhasil.

Foto hasil unggahan gagal yang tidak pernah direferensikan oleh barang/riwayat tidak dimasukkan. Pemakaian storage menampilkan semua file bucket, sehingga angkanya dapat lebih besar daripada ukuran backup. Jangan menghapus file secara manual hanya karena tidak muncul pada barang saat ini; file itu mungkin digunakan oleh versi lama.

## Restore dari browser

1. Gunakan proyek pengujian terpisah untuk uji pertama. Schema harus sudah dipasang, bucket harus ada, dan akun pemilik aktif harus tersedia.
2. Pilih ZIP backup pada halaman pengaturan. Ketik **PULIHKAN**.
3. Aplikasi memeriksa format, path file, kelengkapan foto, ukuran, dan hash SHA-256.
4. Backup kondisi sekarang diunduh terlebih dahulu. Pastikan unduhan tersebut benar-benar tersimpan sebelum menyetujui dialog terakhir.
5. Foto disiapkan di Storage. File dengan path yang sama hanya diterima jika isinya mempunyai hash yang sama; aplikasi tidak menimpanya.
6. Penggantian database dilakukan dalam satu transaksi. Jika validasi database gagal, isi database sebelumnya tetap dipertahankan. Foto baru yang sempat diunggah bisa tetap tersimpan, tetapi tidak otomatis menjadi publik.
7. Jika katalog berubah selama persiapan restore, pemeriksaan signature menggagalkan penggantian. Ulangi setelah koordinasi dengan editor lain.
8. Periksa nama bengkel, domain QR, jumlah barang, sampel foto, riwayat, catatan internal, dan akses pengunjung sesudah restore.

Restore mengganti barang, catatan, riwayat, dan pengaturan katalog. Akun Supabase Auth, password, dan hak akses admin yang aktif **tidak** diambil dari backup. Daftar akses dalam manifest hanya untuk referensi jika Anda harus membuat ulang akun pada proyek lain. Riwayat lama mempertahankan label email/waktu dari backup; identitas Auth lama tidak dipaksakan ke proyek baru. Pemulihan dicatat sebagai versi baru oleh pemilik yang melakukan restore.

Gunakan hanya backup dari sumber yang Anda percaya. Hash memeriksa kerusakan/perbedaan file; hash bukan tanda tangan digital yang membuktikan asal backup.

## Alat backup folder untuk katalog besar

Alat ini dijalankan di komputer dengan Node.js 22 atau lebih baru. Foto diproses sebagai stream dan disimpan sebagai file terpisah sehingga tidak harus ditampung sekaligus di memori. Manifest metadata tetap dimuat ke memori; untuk database yang sangat besar gunakan prosedur backup PostgreSQL/Storage yang dikelola teknisi.

1. Salin `.env.example` menjadi `.env.local` pada root paket.
2. Isi Project URL dan anon/publishable key yang sama dengan konfigurasi Vercel. Jangan menggunakan service-role key.
3. Dari terminal pada folder paket, jalankan:

```text
node scripts/backup-server.cjs backup "D:\Cadangan\Katalog-2026-11-10"
```

4. Masukkan email pemilik dan password saat diminta. Password tidak ditampilkan. Jangan memasukkan password sebagai argumen perintah atau menyimpannya di repository.
5. Tunggu pesan **Backup selesai**. Pastikan folder berisi `manifest.json` dan folder `photos`.

Pemulihan folder:

```text
node scripts/backup-server.cjs restore "D:\Cadangan\Katalog-2026-11-10"
```

Alat memeriksa file, membuat backup folder kondisi sekarang, meminta konfirmasi **PULIHKAN**, menyiapkan foto, dan menjalankan pemulihan database. Akun/hak akses tetap dipertahankan. Folder backup tidak sama dengan ZIP browser; gunakan jenis pemulihan yang sesuai.

Alat ini menggunakan API proyek Supabase yang sebenarnya. Koneksi/kuota layanan dan konfigurasi SMTP tidak dapat diuji sebelum proyek pengguna tersedia. Uji backup dan restore pada proyek percobaan setelah pemasangan.

## Kebiasaan operasional

- Ambil backup sebelum impor besar atau perubahan banyak barang.
- Simpan beberapa versi bertanggal, dengan setidaknya satu salinan di tempat lain.
- Uji restore secara berkala. File yang berhasil diunduh belum membuktikan pemulihan berhasil.
- Jadwal otomatis/penyimpanan eksternal belum diaktifkan oleh paket ini; teknisi dapat menjadwalkan alat folder dengan pengelolaan kredensial yang sesuai.
- Backup layanan database saja tidak otomatis berarti file Storage sudah tercadangkan. Paket ini menyertakan foto secara eksplisit.
