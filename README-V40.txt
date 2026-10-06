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

V40.3 UPDATE — DUAL REPORT MODE
- SIMPAN REPORT sekarang memiliki 2 kategori utama: KETERLAMBATAN RESULT dan JENIS KENDALA.
- KETERLAMBATAN RESULT khusus pasaran/result dan otomatis membaca jam RESULT dari jadwal pasaran aktif.
- Setelah memilih nama pasaran, sistem wajib menampilkan 4 format sekaligus:
  1) Report Keterlambatan
  2) Report Sudah Result
  3) Postingan Keterlambatan
  4) Postingan Sudah Result
- Jam Result normal otomatis dari Pengaturan Jadwal; contoh CALIFORNIA = 08:30:00 WIB.
- Jam Sudah Result / Terbayarkan dapat diisi manual sampai detik; bila belum diisi akan tampil XXXXXX WIB.
- Tiap format memiliki tombol COPY sendiri dan tersedia COPY 4 FORMAT.
- JENIS KENDALA tetap memakai template dinamis dari Admin seperti V40.2.1.
- Arsip Report Tersimpan hanya ditampilkan pada mode JENIS KENDALA agar mode KETERLAMBATAN tetap luas dan rapi.
