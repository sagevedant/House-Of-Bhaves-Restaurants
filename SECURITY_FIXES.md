# Security & Correctness Fixes

Applied on top of the compiled `dist/` output provided (no original `.ts`
source was available, so these are direct patches to the compiled JS —
**if you have the TypeScript source, port these same changes into `src/`
and rebuild**, since anyone deploying from `src/` via `tsc` would overwrite
these files).

## ⚠️ ACTION REQUIRED BY YOU BEFORE DEPLOYING

1. **Rotate the Turso auth token immediately** in the Turso dashboard —
   the old one was committed in plaintext to source and is considered
   compromised regardless of these code fixes.
2. Set `META_APP_SECRET` in your `.env` (find it in Meta App Dashboard →
   Settings → Basic). Without it, the webhook signature check fails closed
   (rejects all inbound webhooks) rather than accepting unsigned requests.
3. Set `ADMIN_BASIC_AUTH_USER` / `ADMIN_BASIC_AUTH_PASS` in `.env`. Without
   them, `/agency`, `/onboard`, `/restaurant/:slug`, and the export/status
   APIs return `503` (fail closed) rather than being reachable.
4. Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `WEBHOOK_VERIFY_TOKEN` —
   the app now throws at boot if these are missing instead of falling back
   to hardcoded defaults.
5. Basic Auth is a stopgap, not a real multi-tenant auth model. Before
   onboarding real external agency staff, replace it with per-user
   sessions/roles.

## Fixes applied

| # | File | Fix |
|---|------|-----|
| 1 | `config.js` | Removed hardcoded Turso URL/token; app now throws at boot if required env vars are missing instead of silently using a baked-in credential |
| 2 | `middleware/auth.js` (new) | Fail-closed HTTP Basic Auth middleware, constant-time credential comparison |
| 3 | `whatsapp/webhook.js` | Verifies Meta's `X-Hub-Signature-256` HMAC on every inbound POST; rejects unsigned/invalid requests with 401 |
| 4 | `utils/escape.js` (new) | `escapeHtml` and `escapeCsvField` helpers |
| 5 | `index.js` | Raw-body capture for signature verification; `requireAdminAuth` added to `/agency`, `/onboard`, `POST /api/agency/onboard`, `/restaurant/:slug`, `/api/restaurant/:slug/export`, `/api/reservations/status`, `/api/reservations/demo`, `/api/agency/trigger-review-queue`; all customer-controlled fields HTML-escaped before rendering; all CSV fields escaped against formula injection; removed hardcoded demo customer PII (real-looking name/phone); onboarding no longer silently falls back to shared/placeholder Meta credentials — clients without their own credentials are created `active: false` |
| 6 | `utils/reservationCode.js` | Uniqueness check now covers both `reservations` and `bookings` tables, not just one |
| 7 | `bot/steps/confirm.js` | Dual-table booking write wrapped in a DB transaction (atomic — no more silent divergence between `reservations`/`bookings` on partial failure); wired the previously-dead `quotaService` into the actual booking flow |
| 8 | `utils/dateHelpers.js` | Fixed midnight-wraparound slot filtering bug — was comparing time-of-day strings lexically (`"00:30" < "19:00"`), which could incorrectly drop/keep post-midnight slots; now compares numeric minutes-from-window-start |
| 9 | `ai/slotExtractor.js` | Gemini's JSON output is now validated field-by-field against expected types/enums/ranges before being trusted; malformed output falls back to the regex extractor instead of flowing straight into DB writes |
| 10 | `whatsapp/parser.js` | Phone numbers sanitized exactly once, at ingestion, instead of inconsistently downstream |
| 11 | `.env.example` (new) | Full list of required/optional env vars, matches new fail-fast config |

## Known remaining gaps (not fixed here — flagging for you)

- **Domain-mismatch content** (restaurant occasion labels mapped to dental
  treatments, `bot/fallback.js` still says "Spice Factory", FAQ knowledge
  base answers about valet/hookah/DJ nights) — this is a product/content
  issue, not security, left as-is pending a decision on whether this is
  staying a restaurant bot or fully becoming a clinic bot.
- **Basic Auth is single-shared-credential**, not per-tenant. Fine as an
  immediate stopgap; not fine for a real multi-tenant agency product.
- **`sanitizePhone` is still India-only** (assumes 10-digit numbers are
  Indian and prepends `91`). International numbers will still be mangled.
  Left as-is since fixing this properly needs a real phone number library
  (e.g. `libphonenumber-js`) and a decision on supported markets.
- I did **not** have the original TypeScript source — only compiled
  `dist/*.js` + sourcemaps were provided. These patches are to the compiled
  output. If a `src/` directory with `.ts` files exists in your actual repo,
  the same logical changes need to be ported there or your next `npm run
  build` will overwrite everything here.
