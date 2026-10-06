V40 CYBERPUNK UNIFIED
- LIVE DRAW RESULT menyatu dalam index.html; tidak memerlukan live-draw-result.html.
- Panel Live Draw diperbesar dan header ganda dihapus.
- Refresh Live Draw dipindahkan ke header utama.
- SIMPAN REPORT menjadi Smart Report Studio dengan template Link Situs Nawala, Salah Proses Withdraw, dan Custom.
- Preview otomatis, Copy, Simpan, Bersihkan, pencarian arsip.
- Semua fitur V39 lainnya dipertahankan.


V40.1 UPDATE — UNIFIED LIVE DRAW
- LIVE DRAW RESULT tidak lagi memakai iframe/srcdoc.
- Header/logo dan bottom navigation aplikasi kedua dihilangkan/dipadatkan.
- LiveDraw sekarang menyatu langsung dengan layout utama V40.
- Tabel dibuat full-width, lebih luas, dan responsif.
- Fitur input result, Singapore/TOTO, jadwal, notifikasi, backup/restore tetap dipertahankan.

V40.2 UPDATE — ADMIN-DRIVEN SMART REPORT
- Double header Dashboard dihapus. Dashboard langsung dimulai dari KPI; status DB dipindahkan ke header utama.
- Smart Report Studio sekarang memakai template dinamis yang dibuat Admin.
- Admin dapat membuat banyak jenis kendala dengan Judul Besar, keterangan untuk User, kata-kata report, dan field isian User.
- Field User mendukung Teks, Teks Banyak Baris, Angka, Tanggal, dan URL serta opsi wajib/tidak wajib.
- Kata-kata Admin menggunakan token seperti {{userid}}, {{periode}}, {{domain}}, {{lampiran}}, dan {{judul}}.
- Tombol SIMPAN & UPDATE USER mempublikasikan template melalui D1 /api/data; User menarik pembaruan otomatis setiap ±5 detik atau lewat tombol UPDATE DARI ADMIN.
- Default contoh: Link Situs Nawala, Kemenangan Tidak Terbayar, dan Salah Proses Withdraw.
- User hanya melihat field yang ditentukan Admin; preview report dibentuk otomatis dan tetap bisa Copy / Simpan / Bersihkan.
