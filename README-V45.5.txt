V45.5 — STRICT 4D PARSER FIX
- Memisahkan region 4D dari 5D.
- Menangani duplikasi gambar bola keempat HANYA bila digit sama dan label 第四个球 muncul dua kali.
- Mengembalikan tanggal, jam WIB, angka 4D untuk pencocokan periode di dashboard.
- Menolak angka jika tidak dapat diverifikasi.
- Pengambilan berjalan saat dashboard terbuka dan Auto Result ON; belum ada Cron background.
- UJI DI BRANCH test-v45 DAHULU. Periksa /api/totomacao sebelum Production.
