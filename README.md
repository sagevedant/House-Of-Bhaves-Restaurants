# House of Bhaves WhatsApp Restaurant Platform 🍽️

Multi-tenant WhatsApp Cloud API automation engine for restaurants and hospitality businesses featuring automated table reservations, dynamic slots, Gemini AI intent processing, and Meta Tech Provider Embedded Signup integration.

---

## 🔒 Security & Webhook Signature Verification

Meta sends an `X-Hub-Signature-256` header on every inbound webhook payload (`POST /webhook`). This header contains the HMAC-SHA256 signature of the raw payload calculated using your **Meta App Secret**.

### 1. How to get your `META_APP_SECRET`
1. Log in to the [Meta for Developers Dashboard](https://developers.facebook.com/apps/).
2. Select your App (or your agency's Tech Provider App).
3. Navigate to **App settings** → **Basic** in the left sidebar.
4. Locate the **App secret** field, click **Show** (you may be prompted for your Meta password), and copy the secret key.
5. Paste it into your `.env` file:
   ```env
   META_APP_SECRET=your_meta_app_secret_here
   ```

### 2. When to Enable `ENFORCE_WEBHOOK_SIGNATURE`
* **Development / Pending Business Verification:**
  Keep `ENFORCE_WEBHOOK_SIGNATURE=false` (or unset). The server will log a startup notice:
  ```text
  ⚠️ Webhook signature verification is DISABLED — do not use in production
  ```
  This allows local testing, simulator demos, and webhook validation without requiring an active App Secret.
* **Production Live Deployment:**
  Once your Meta Business Account and App Secret are configured:
  ```env
  ENFORCE_WEBHOOK_SIGNATURE=true
  ```
  When enabled:
  - All incoming POST requests to `/webhook` must contain a valid `X-Hub-Signature-256` header matching `sha256=HMAC_SHA256(rawBody, META_APP_SECRET)`.
  - Unsigned or forged payloads are rejected immediately with HTTP `401 Unauthorized`.
  - Constant-time comparison (`crypto.timingSafeEqual`) prevents timing attacks.

---

## 🛠️ Environment Variables Configuration

Refer to [`.env.example`](.env.example) for the complete list of environment variables:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `TURSO_DATABASE_URL` | **Yes** | Turso cloud database connection URL (`libsql://...`). |
| `TURSO_AUTH_TOKEN` | **Yes** | Turso authentication token. |
| `META_APP_ID` | Yes (Tech Provider) | Meta Developer App ID for Embedded Signup. |
| `META_APP_SECRET` | Yes (Production) | Meta App Secret for token exchange & webhook HMAC verification. |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Yes (Tech Provider) | Embedded Signup configuration ID from Meta Dashboard. |
| `ENFORCE_WEBHOOK_SIGNATURE` | Optional | Set to `true` in production to enforce `X-Hub-Signature-256` checks. |
| `WEBHOOK_VERIFY_TOKEN` | **Yes** | Secret challenge token for Meta Webhook subscription verification. |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for natural language slot extraction. |
| `ADMIN_BASIC_AUTH_USER/PASS` | Optional | Credentials for admin operations dashboard (`/agency`). |

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run TypeScript typecheck
npm run typecheck

# Start development server
npm run dev

# Build for production
npm run build
npm start
```
