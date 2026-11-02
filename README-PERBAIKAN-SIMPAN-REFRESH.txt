PERBAIKAN LIVE DRAW & PENGATURAN — 2026-11-02

1. Tombol SIMPAN PERUBAHAN JAM tersedia di bagian atas tabel Pengaturan.
2. Draft perubahan jam dipertahankan saat pencarian/filter tabel berubah.
3. Validasi jam HH:MM:SS memastikan nilai jam/menit/detik benar.
4. Tombol REFRESH LIVE DRAW menjalankan sync semua sumber melalui AUTO SYNC CONTROL CENTER V46.13 dan refresh tampilan.
5. Fitur lain dan API yang sudah ada dipertahankan.

CARA PASANG:
- Backup repository GitHub dahulu.
- Ganti file index.html pada root repository dengan index.html di ZIP ini.
- File functions/api tidak perlu diganti untuk dua perubahan antarmuka ini.
- Commit, tunggu Cloudflare Pages deploy, login admin, lalu Ctrl+Shift+R.
- Uji pengeditan jam lalu klik SIMPAN PERUBAHAN JAM; uji REFRESH LIVE DRAW.

CATATAN:
- Refresh tetap akan menampilkan error jika situs sumber mengembalikan 503/405 atau memblokir Cloudflare.
- Sinkronisasi tidak akan mengarang nomor hasil.
- Jadwal disimpan ke localStorage dan dijadwalkan untuk disinkronkan melalui mekanisme D1 dashboard yang sudah ada.
