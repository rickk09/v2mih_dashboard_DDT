V33 OPERATIONS SUITE

CROSCHECK SELISIH V2MIH
- ReportPopup: UserID dari User / kolom B.
- Dynamic Transaction: UserID = teks pertama Memo kolom N sebelum ||.
- Selisih dari ReportPopup: UserID, Tanggal Terima, Jumlah.
- Selisih dari Dynamic: UserID, Paid At, Amount, Order ID, RRN, Memo.
- CSV/XLS/XLSX dan Export hasil CSV.

UPLOAD FILE + GAMBAR
- Memakai Cloudflare R2 agar file benar-benar online dan dapat didownload.
- Buat R2 bucket, lalu Pages > Settings > Bindings > Add > R2 bucket.
- Variable name wajib: FILES
- Save dan redeploy.

VALIDASI REKENING
- Seluruh pilihan bank/e-wallet yang diminta sudah ada.
- Validasi nama rekening REAL memerlukan API/provider resmi; hasil tidak dipalsukan.
- Endpoint sudah siap untuk ACCOUNT_VALIDATION_API_URL dan ACCOUNT_VALIDATION_API_KEY.
- Format API provider mungkin perlu adapter kecil sesuai dokumentasi provider yang dipilih.

ADMIN_PASSWORD dan D1 DB tetap seperti V32.
