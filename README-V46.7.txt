V46.7 Bangkok AUTO RESULT: complete site bundle based on V46.4 + Oregon V46.6 + Bangkok V46.7.
IMPORTANT: This is based on V46.4 index baseline. Backup current Production index before replacing; if newer UI changes exist, merge the new Bangkok function and JS block instead of overwriting.
Diagnostic: /api/bangkok-live?diagnose=1
GET /api/bangkok-live?date=YYYY-MM-DD reads D1. POST requires admin login.
Source: Bangkok Pools BKK API; 01:30 and 09:30 source sessions mapped to same-named dashboard markets.
Only valid 4-digit prize strings are accepted; period number is never used as prize.
Source Cloudflare connectivity is not verified yet.
