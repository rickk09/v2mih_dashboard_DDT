DINGDONGTOGEL V46.13 - AUTO SYNC CONTROL CENTER

Dari ZIP GitHub yang diunggah.
Perubahan: index.html menambahkan panel sinkronisasi terpusat pada Live Draw Result.
API asli seluruh market dipertahankan.

Cara deploy: upload file-file di dalam folder ZIP ke root repository GitHub (jangan folder induknya). Commit dan tunggu Cloudflare Pages Production Success.

Panel: SYNC SEMUA SEKARANG memanggil POST API sumber yang tersedia, kemudian GET D1 dan menarik angka ke dashboard. AUTO SYNC ON/OFF menggunakan preferensi lama workdash_auto_result.

Batasan penting:
- Kentucky saat ini masih memakai sumber parser arsip lama yang gagal; panel akan memperlihatkan error, bukan mengarang angka.
- Pasaran tanpa API sumber belum bisa otomatis.
- POST API memerlukan admin login aktif; API yang gagal HTTP 401/404 akan ditandai gagal.
- Sistem ini berjalan ketika tab dashboard terbuka. Untuk auto sync 24 jam tanpa browser diperlukan Cloudflare Cron/Worker terpisah.
- Data D1 tidak dimodifikasi oleh ZIP sebelum deployment.
