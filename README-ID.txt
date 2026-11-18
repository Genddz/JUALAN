FIRIA — MARKET DAY (PWA)
=======================

Aplikasi kasir sederhana untuk iPhone. Tidak memakai PHP, MySQL, XAMPP, atau server laptop.
Data produk dan transaksi disimpan secara lokal di browser/web app iPhone.

FITUR
-----
- Tambah, edit, dan hapus menu/varian muffin tanpa gambar.
- Atur harga sendiri.
- Tambah/kurangi jumlah pesanan dengan tombol + dan -.
- Pilih pembayaran Tunai atau QRIS.
- Pembayaran Tunai menampilkan total dan tombol "Sudah bayar" / "Kembali".
- Pembayaran QRIS menampilkan foto QRIS yang diberikan, total harga, tombol perbesar, "Sudah bayar" / "Kembali".
- Setelah ditandai sudah dibayar, bukti transaksi dibuat dan disimpan.
- Riwayat transaksi, omzet hari ini, dan jumlah transaksi.
- Unduh laporan CSV dan backup JSON.
- Cache offline melalui Service Worker setelah aplikasi pertama kali dibuka online.

PENTING TENTANG QRIS
--------------------
QR pada gambar adalah QRIS statis. Aplikasi menampilkan total yang harus dibayar, tetapi pembeli tetap perlu memasukkan nominal tersebut di aplikasi pembayaran mereka.
Aplikasi FIRIA tidak bisa membaca status pembayaran secara otomatis. Kasir harus memastikan pembayaran benar-benar berhasil di aplikasi/akun merchant sebelum menekan "Sudah bayar".

CARA MEMASANG DI IPHONE
-----------------------
Agar bisa ditambahkan ke Home Screen dan cache offline bekerja, situs perlu dibuka melalui alamat HTTPS. Tidak perlu menjalankan server di laptop atau HP setelah dipasang, tetapi perlu hosting statis HTTPS satu kali.

Salah satu cara: GitHub Pages
1. Ekstrak ZIP ini.
2. Buat repository baru di GitHub (misalnya bernama firia-market-day).
3. Upload seluruh ISI folder FIRIA-Market-Day ke repository (index.html harus berada di root repository, bukan di dalam subfolder tambahan).
4. Di repository, buka Settings > Pages.
5. Pada Build and deployment, pilih Deploy from a branch.
6. Pilih branch main dan folder /(root), lalu Save.
7. Setelah GitHub Pages menerbitkan situs, buka alamat HTTPS yang diberikan GitHub menggunakan Safari di iPhone.
8. Di Safari tekan tombol Share > Add to Home Screen > Add.
9. Jalankan FIRIA dari ikon Home Screen. Gunakan ikon itu untuk transaksi berikutnya agar data tetap berada pada konteks web app yang sama.
10. Buka sekali saat online agar semua file termasuk gambar QRIS tersimpan untuk penggunaan offline.

PENGUJIAN SEBELUM MARKET DAY
----------------------------
1. Tambahkan semua varian muffin dan harga yang benar.
2. Buat transaksi percobaan dengan metode Tunai.
3. Buat transaksi percobaan QRIS, pastikan gambar QRIS dapat dibaca oleh HP lain. Jangan tekan "Sudah bayar" pada transaksi percobaan yang belum dibayar sungguhan jika tidak ingin masuk laporan; transaksi percobaan bisa dihapus melalui browser storage, atau gunakan backup/akun data percobaan terpisah.
4. Setelah instalasi, coba aktifkan Airplane Mode dan buka FIRIA dari Home Screen untuk memastikan aplikasi dan gambar QRIS masih tampil. Pembayaran QRIS tetap memerlukan koneksi internet pada HP pembeli.
5. Unduh backup JSON setelah transaksi penting. Data tersimpan di perangkat/browser ini, bukan tersinkron otomatis ke perangkat lain.

CATATAN DATA
------------
- Produk dan riwayat disimpan secara lokal pada perangkat/browser iPhone.
- Jangan hapus data situs / website data Safari selama masih membutuhkan riwayat transaksi.
- Ekspor backup JSON secara berkala. Ekspor CSV untuk rekap transaksi.
- Tombol "Sudah bayar" adalah konfirmasi manual kasir, bukan verifikasi otomatis dari DANA/penyedia QRIS.

STRUKTUR FILE
-------------
index.html                 Halaman aplikasi
style.css                  Tampilan responsif iPhone
app.js                     Logika kasir, produk, transaksi, bukti
manifest.webmanifest        Konfigurasi PWA
sw.js                      Cache offline
assets/qris-gend-shop.jpeg Gambar QRIS yang diberikan
assets/*.png               Ikon aplikasi
