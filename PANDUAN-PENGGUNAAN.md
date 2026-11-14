# Pemakaian harian Katalog AC

## Identitas dan publikasi

Satu kode internal mewakili satu jenis barang. Gunakan kode berbeda untuk merek, part number, atau spesifikasi yang berbeda. Kode tidak bisa diubah setelah disimpan. Tautan QR menggunakan UUID barang yang tetap, sehingga mengubah nama/foto tidak mengubah tautan.

Status **Draf** hanya dapat dilihat admin. **Terbit** tampil di katalog dan tautan hasil scan. **Arsip** tidak tampil dalam daftar publik, tetapi QR lama tetap membuka halaman dengan keterangan barang tidak aktif. Arsip tetap menyajikan informasi publik dan fotonya.

Simpan barang baru sebagai draf, lengkapi foto dan data, gunakan **Pratinjau tersimpan**, lalu kembali ke editor dan pilih Terbit. Kode, nama, dan minimal satu foto wajib untuk terbit. Pratinjau menampilkan versi yang telah disimpan, bukan perubahan yang masih di formulir.

## Foto dan kecocokan

Maksimal 12 foto per barang. Unggah JPEG, PNG, atau WebP maksimal 8 MB per file dan 40 megapiksel. Aplikasi mengubah menjadi WebP dengan sisi terpanjang maksimal 1.800 piksel, serta thumbnail 420 piksel. Foto transparan tetap dapat diolah. Gambar yang tidak dapat dibaca browser ditolak.

Foto pertama adalah foto utama. Gunakan **Naik** untuk mengubah urutan dan **Lepas** untuk menghapus hubungan foto dari versi yang sedang diedit. Tambahkan keterangan seperti “Konektor”, “Dudukan”, atau “Label part number”. File lama dipertahankan untuk pemulihan versi.

Tuliskan kendaraan secara rinci: merek, model, rentang tahun, mesin/varian, dan perbedaan fisik penting. Status **Terverifikasi** adalah penilaian bengkel, bukan hasil verifikasi otomatis. Part number alternatif dan barang terkait juga tidak menjamin kompatibilitas.

## Impor massal

1. Buka **Impor massal > Unduh template Excel**. Hapus baris contoh sebelum mengisi data asli.
2. Jangan mengganti nama header. Worksheet utama bernama `Sparepart`.
3. Kode internal dan part number harus berupa teks. Jika Excel telanjur menghilangkan angka nol, aplikasi tidak dapat menebak angka yang hilang.
4. Isi `nama_file_foto` dengan nama/path file di ZIP. Pisahkan beberapa foto menggunakan `|`, misalnya `AC-001-depan.jpg|AC-001-konektor.jpg`.
5. Gunakan `verified` atau `unverified` pada kolom `verifikasi`. Barang baru yang kosong menggunakan `unverified`.
6. Kolom `kode_barang_terkait` menggunakan kode barang yang sudah ada di katalog, dipisahkan `|`. Untuk barang yang sama-sama baru, impor dahulu lalu tambahkan hubungan dalam pembaruan berikutnya.
7. Pilih mode tambah saja atau perbarui berdasarkan kode. Pencocokan kode mengabaikan kapitalisasi dan spasi pada ujung teks.
8. Periksa hasil validasi dan pasangan foto. Baris yang bermasalah dilewati; Anda mengonfirmasi hanya baris valid.
9. Setelah proses selesai, unduh laporan CSV. Semua hasil impor menjadi draf, termasuk barang lama yang diperbarui.

Sel kosong mempertahankan nilai lama. Mengosongkan nilai lama dilakukan melalui editor barang. Foto baru ditambahkan; impor tidak menghapus foto lama atau barang lain. File Excel `.xls` lama, formula Excel, serta gambar yang ditanam di dalam sel tidak didukung; simpan sebagai `.xlsx` berisi nilai teks dan gunakan ZIP terpisah untuk foto.

Batas per proses: 500 baris, file data 10 MB, ZIP foto 75 MB, total isi ZIP 180 MB, dan 8 MB per foto. Pecah katalog besar menjadi beberapa batch. Impor dilakukan per barang, bukan satu transaksi besar: barang yang berhasil tetap tersimpan jika baris berikutnya gagal. Jika koneksi putus ketika menyimpan, periksa katalog dan jalankan validasi ulang sebelum mengulangi proses; kode unik mencegah barang ganda.

## QR dan label

Atur domain permanen sebelum mencetak. Di menu **Label QR**, tentukan lebar dan tinggi minimum label, isi salinan tiap barang, kemudian cetak. Maksimal 100 salinan per barang dan 300 label per proses. Barang draf boleh dibuatkan label, tetapi halaman belum terbuka bagi pengunjung sampai diterbitkan.

Template menggunakan halaman A4; ukuran media, margin, orientasi, dan skala tetap diatur melalui dialog/driver printer. Untuk printer thermal, uji ukuran khusus terlebih dahulu. Nama panjang dapat menambah tinggi label. Uji satu label fisik dan scan dari HP sebelum mencetak banyak.

## Akun dan riwayat

**Editor** mengelola barang, foto, impor, label, serta riwayat. **Pemilik** juga mengatur akun, domain, dan backup/restore. Akun Auth dibuat melalui dashboard Supabase; pemilik mengaktifkan atau menonaktifkan aksesnya di aplikasi. Minimal satu pemilik aktif dipertahankan.

Setiap penyimpanan barang membuat versi beserta petugas, waktu, dan alasan. **Riwayat versi** menampilkan isi versi lama dan tombol pemulihan. Pemulihan menjadi versi baru sehingga versi sebelumnya tetap tercatat. Jika foto lama terhapus manual dari Storage, pulihkan filenya dari backup dahulu.

Jika muncul pesan konflik, admin lain sudah menyimpan perubahan. Salin perubahan Anda ke tempat aman, muat ulang data terbaru, lalu gabungkan secara manual. Aplikasi tidak menimpa perubahan terbaru secara diam-diam.

## Privasi informasi publik

Informasi dan foto barang terbit/arsip tersedia untuk siapa pun. Catatan internal dipisahkan pada tabel yang hanya dapat dibaca admin. Foto diambil melalui bucket privat dengan pemeriksaan akses, bukan tautan file publik permanen. Salinan foto yang sudah diunduh atau disimpan oleh pengunjung sebelum perubahan status tidak dapat ditarik kembali.

Backup lengkap memuat catatan internal dan daftar akses; simpan secara terbatas. Jangan menaruh data pelanggan, nomor kendaraan pelanggan, password, atau informasi yang tidak diperlukan pada kolom publik.
