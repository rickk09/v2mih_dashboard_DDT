DINGDONGTOGEL V46.2 — HOKIDRAW AUTO RESULT 24 JAM

Changes:
- functions/api/hokidraw-live.js: POST sync fetches official HOKIDRAW history, requires admin login, checks Finish, presetTime, 1st Winner, 5 digits, current WIB date/time, persists D1 with uniqueness and conflict protection.
- GET /api/hokidraw-live: reads persisted daily results.
- index.html: automatic sync each 60 seconds when AUTO is ON and admin session valid, and displays D1 results in Live Draw.
- Existing TOTOMACAU endpoints and dashboard preserved.

NOTE: Cloudflare D1 binding DB and ADMIN_PASSWORD must exist. Auto sync requires a logged-in admin browser open; Cloudflare Pages does not automatically execute periodic tasks when no browser is open. Test on preview before deploying to main.
