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

============================================
V40.5 — HOKIDRAW HOURLY + INLINE LIVE DRAW
============================================
- HOKIDRAW default 24 sesi harian, betclose xx:50 dan result (xx+1):00.
  Contoh 00:50 > 01:00; 01:50 > 02:00; ...; 23:50 > 00:00.
- Tiap sesi HOKIDRAW punya kunci penyimpanan angka sendiri.
- Home LiveDraw diperbarui: input angka langsung di baris pasaran (tanpa buka halaman input).
- Dukungan 1 Prize / 3 Prize / Singapore TOTO tetap ada. Singapore memiliki pemilih mode dalam baris.
- Tombol SALIN per pasaran, HAPUS per baris, dan SALIN SEMUA TERISI.
- Kolom pencarian cepat dan filter HOKIDRAW 24x.
- Indikator titik kuning/biru dan warna latar penanda 0-40 menit di daftar LiveDraw dihapus.
- Tampilan desktop dan mobile dibuat lebih ringkas; header mobile khusus LiveDraw dipadatkan.
- Penyimpanan hasil dan pengaturan pasaran lama dipertahankan (migration legacy HOKIDRAW kosong).
- Bagian SIMPAN REPORT, Smart Report Admin, dashboard, dan modul lain tidak diubah.

============================================
V40.6 — TOTOCAMBODIA + RAPATKAN INPUT + ANTI-SKIP
============================================
- TOTOCAMBODIA sudah tersedia sebagai pasaran default (tanpa diduplikasi):
  BETCLOSE 10:45:00 WIB, RESULT 11:00:00 WIB, mode 3 Prize.
  Jam juga ada di jadwal global sehingga bisa dipakai oleh Smart Report Keterlambatan.
- Nama pasaran, input angka, SALIN, dan × (hapus) sekarang dalam satu kelompok rapat.
  Di desktop jarak antar input terakhir dengan SALIN sekitar 7px pada pengujian;
  di ponsel input dan aksi berada tepat di bawah nama tanpa horizontal overflow.
- Panel ANTI-SKIP: jumlah LEWAT JAM RESULT, BELUM DISALIN, dan SUDAH DISALIN.
  Peringatan hanya menyatakan angka belum dicatat dan tidak mengklaim situs resmi sudah result.
- Filter 'Perlu Cek' menampilkan pasaran yang melewati jadwal belum diinput
  dan pasaran yang sudah lengkap tetapi tombol Copy belum digunakan.
- Status tiap pasaran: LEWAT JAM RESULT (merah), BELUM DISALIN (merah lembut),
  SUDAH DISALIN (hijau), mendekati result (netral), belum diisi (netral).
  Tidak menggunakan indikator titik/latar biru dan kuning lama.
- Status salin mengikuti isi hasil (dan mode Singapore); mengubah angka
  mengembalikan status BELUM DISALIN. Tombol × mereset catatan salin.
- Pencatatan Copy tersimpan per hari di penyimpanan lokal perangkat/browser;
  indikator SUDAH DISALIN bukan konfirmasi bahwa hasil telah dikirim ke member.
- Tombol SALIN SEMUA TERISI juga menandai seluruh hasil lengkap sebagai disalin
  hanya setelah aksi penyalinan sukses.
- Menu lain, Smart Report Studio, dan seluruh pengaturan sebelumnya tidak diubah.

============================================
V40.7 — POSISI INDIKATOR ANTI-SKIP
============================================
- Status Mendekati Result, Lewat Jam Result, Belum Disalin, Sudah Disalin, dll dipindah ke kanan tombol × pada baris aksi yang sama.
- Di mobile, jika kolom angka terlalu panjang, baris aksi boleh berada di bawah input, tetapi urutannya tetap SALIN → × → STATUS secara mendatar.
- Logika Anti-Skip, jadwal, Smart Report, semua input dan aksi lainnya tidak diubah.


V40.8 — LIVE DRAW LAYOUT
- Nama pasaran diperbesar untuk mengurangi salah baca nama.
- Informasi 3 PRIZE / 4D / 5D serta dropdown mode SINGAPORE ditempatkan tepat di sisi RESULT (jam) di bawah nama pasaran.
- Input angka, SALIN, X dan indikator Anti-Skip tetap tidak berubah.
- Ukuran responsif untuk desktop dan ponsel.

V40.9 UPDATE — FORMAT SALIN HOKIDRAW OPSIONAL JAM
- Output SALIN HOKIDRAW default: HOKIDRAW 1234, tanpa jam meski memiliki 24 sesi berbeda.
- Checkbox Aktifkan Jam HOKIDRAW di LiveDraw: jika dicentang output menjadi HOKIDRAW 01:00 1234 (menurut sesi).
- Pengaturan checkbox disimpan di browser dan default awal nonaktif.
- SALIN baris, SALIN SEMUA TERISI, preview input, dan status Anti-Skip memakai formatter yang sama.
- Nama sesi, jadwal, pemisahan hasil 24 sesi, dan output pasaran lain tetap dipertahankan.
