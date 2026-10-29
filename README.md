DINGDONGTOGEL V46.3 — TOTO MACAO 5D AUTO RESULT

New:
- /api/macao5-live POST: authenticated source fetch, strict 5-ball/5-digit validation, same-day WIB date and source time matched to SORE 15:13–15:25 or MALAM 21:15–21:30, after result time; deduplicated D1 insert, no overwrite on conflicts.
- /api/macao5-live GET: read stored daily 5D results.
- Dashboard: 60-second sync with AUTO RESULT ON and admin login; D1 results pulled to Live Draw and daily history. Live Draw accepts 5 digits for 5D markets.
- Preserves HOKIDRAW V46.2 and Toto Macao 4D functions.

Important: A 5D source timestamp outside those windows is intentionally NOT auto-saved. Source publication time vs draw time must be checked in production before trusting automatic classification. D1 DB and ADMIN_PASSWORD required. Browser must stay open and admin logged in for automatic POST sync. Deploy to preview first, back up production.
