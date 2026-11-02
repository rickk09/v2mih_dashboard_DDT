DINGDONGTOGEL V46.4 — OREGON PICK 4 (CONSERVATIVE)
Base: V46.3. Adds /api/oregon-live and dashboard 60-second sync.
Source: https://www.oregonlottery.org/pick-4/winning-numbers/
Mapping source 1 PM/4 PM/7 PM/10 PM -> OREGON03/06/09/12; source date + 1 day = dashboard date.
Winning numbers are read as text digits only, not OCR/images; draw ID is not a result.
Important: Oregon site is JavaScript-rendered in external web inspection. This release intentionally does NOT insert any result if Cloudflare fetch cannot see verified server-side HTML table rows. Use /api/oregon-live?diagnose=1 after deployment to confirm parser viability. No guarantee of automated results until actual API source identified and validated.
POST /api/oregon-live requires admin login, AUTO RESULT ON, D1 DB binding.
Back up Production first. Existing Macao/Hoki code retained.
