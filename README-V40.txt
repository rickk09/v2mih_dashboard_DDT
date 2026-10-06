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

V40.4 UPDATE — DYNAMIC SMART REPORT UX
- Tampilan SIMPAN REPORT dibuat lebih dinamis dan lebih cepat digunakan.
- Pemilih kategori menjadi 2 kartu besar: KETERLAMBATAN RESULT dan JENIS KENDALA, lengkap dengan jumlah item aktif.
- KETERLAMBATAN RESULT memakai workflow 3 langkah: Pilih Pasaran → Pilih Penyebab → Isi Jam Sudah Result.
- Panel kontrol berada di kiri dan 4 format wajib tampil live-preview di kanan pada layar lebar; otomatis responsif di layar kecil.
- Daftar Penyebab Keterlambatan sekarang dinamis, dapat dicari, dipilih dengan kartu, dan disinkronkan dari Admin.
- Default penyebab: Situs Resmi Belum Result, Live Result Berhenti, Live Result Tidak Tersedia/Tidak Live, Gangguan Provider, dan Lainnya/Custom.
- Lainnya/Custom otomatis menampilkan kolom alasan tambahan untuk User.
- Admin memiliki Pusat Template Report dengan 2 tab terpisah: Penyebab Keterlambatan dan Jenis Kendala.
- Admin dapat tambah/edit/hapus, aktif/nonaktifkan, serta mengubah kalimat Report Keterlambatan dan Postingan Keterlambatan.
- Template penyebab mendukung token {{pasaran}}, {{jam_result}}, {{jam_selesai}}, dan {{alasan}}.
- Penyebab dapat SIMPAN lokal Admin atau SIMPAN & UPDATE USER melalui D1 /api/data.
- User menerima update otomatis setiap ±5 detik dan tersedia tombol UPDATE ADMIN manual.
- Report Sudah Result dan Postingan Sudah Result tetap memakai format standar agar konsisten.
