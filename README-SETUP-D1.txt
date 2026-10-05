DINGDONGTOGEL V28 - ONLINE DATABASE (Cloudflare D1)

STRUKTUR:
index.html
functions/
  api/
    data.js
    result.js

PENTING:
V28 memerlukan Cloudflare D1 binding dengan nama persis: DB

LANGKAH:
1. Buat D1 database di Cloudflare, misalnya: dingdongtogel-db
2. Buka project Pages v2mih-dashboard-ddt
3. Settings > Bindings > Add > D1 database
4. Variable name: DB
5. Pilih database dingdongtogel-db
6. Save
7. Upload file V28 ke GitHub sesuai struktur
8. Redeploy project / tunggu deployment baru selesai
9. Refresh dashboard Ctrl+F5

Tidak perlu membuat tabel manual. /api/data akan membuat tabel app_data otomatis saat pertama dipakai.

V28 menyinkronkan secara online:
- REPORT
- HASIL RESULT / riwayat hari ini
- PREDIKSI DINGDONGTOGEL
- Jadwal BET CLOSED + RESULT
- Tabel SHIO
- Link sumber History Nomor

Perangkat lain yang membuka dashboard akan mengambil state yang sama dari D1.
