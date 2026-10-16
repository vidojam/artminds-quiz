# ArtMinds Quiz

ArtMinds Quiz is a React + TypeScript app that shows artwork images and asks users to identify the painter and period.

## Features

- Two-attempt quiz flow per artwork
- Partial-match blast prompt:
  - "Painter matches only, try again or continue"
  - "Period matches only, try again or continue"
- Correct-answer blast: "You guessed it!"
- Score and progress tracking
- Account-linked premium upgrades via Stripe Checkout
- Email/password sign-in with hashed passwords and HttpOnly session cookies
- Unlimited access persisted in the server database, including across devices
- Premium "saved correct answers this play period" counter
- Responsive desktop + mobile layout
- Terms of Use link and legal page

## Tech Stack

- Vite
- React 19
- TypeScript

## Run Locally

1. Install dependencies:

```bash
npm install
```

Requires Node.js 22.16 or newer for built-in SQLite. Use `.env.example` as a reference for local `.env` configuration. Do not commit secrets.

2. Start the API server in one terminal:

```bash
npm start
```

3. Start the frontend in another terminal:

```bash
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` to port 3000. Set `APP_URL=http://localhost:5173` for this development setup. For a different frontend port or host, update `APP_URL` to match the browser origin and Vite's server settings.

4. Build production bundle:

```bash
npm run build
```

## Premium Stripe Setup

Premium is **permanent unlimited paint selection access for a one-time $9.99 payment**. The existing artwork collection repeats without the free five-artwork stopping point; this does not add a new artwork catalog.

1. Create an active **one-time** $9.99 Stripe Price in a development sandbox and use its `price_...` ID. Recurring prices are intentionally rejected.
2. Configure these server-only settings in `.env` locally or your deployment's secret settings:

```bash
APP_URL=http://localhost:5173
STRIPE_SECRET_KEY=your_restricted_stripe_key
STRIPE_PRICE_ID=price_your_one_time_price
STRIPE_WEBHOOK_SECRET=your_webhook_signing_secret
DATABASE_PATH=./data/artminds.sqlite
```

Prefer a restricted `rk_` key with only the Price and Checkout Session permissions this server needs. Never put credentials in `VITE_` variables, which are embedded in browser code. Rotate any previously exposed keys.

3. **Required:** register `/api/stripe/webhook` as a Stripe webhook endpoint for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Store its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally, forward these events with Stripe CLI to `http://localhost:3000/api/stripe/webhook` and use the CLI's signing secret.
4. Restart the API server after configuration changes.

Users create an account or sign in before checkout. The server attaches the account ID to Checkout and automatically returns to `APP_URL/?checkout=success&session_id={CHECKOUT_SESSION_ID}`. Both signed webhooks and the authenticated return-page check use the same idempotent fulfillment function. Unpaid sessions, unrelated prices, and another account's checkout session cannot unlock access. Delayed payments unlock when Stripe confirms payment; refresh or sign in again to retrieve the updated status.

Payment Links and the old browser-only local-storage premium flag are no longer trusted. Purchases made before account linking require support-assisted verification and migration; do not grant access from an old local-storage flag. Password reset and email verification are not implemented in this change.

Run `npm test`, `npm run build`, and `npm run lint` to validate. Automated tests mock Stripe API calls and use Stripe's real webhook signature verifier; a sandbox checkout is still required before launch.

## Deploy to Render (Web Service)

Use a **Web Service** (not Static Site) so the account, checkout, and webhook APIs can run. Use a single service instance with a persistent disk for SQLite and back up that disk. Ephemeral deployment storage will lose accounts and purchases.

- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

Set these Render environment variables:

- `NODE_ENV=production`
- `APP_URL=https://your-public-app-domain` (required; no trailing path)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (required one-time price)
- `STRIPE_WEBHOOK_SECRET` (required)
- `DATABASE_PATH=/var/data/artminds.sqlite` (mount the persistent disk at `/var/data`)

Register the production webhook at `https://your-public-app-domain/api/stripe/webhook` using matching live-mode configuration. HTTPS is required for production session cookies. Never commit the database or environment file.

## Test on iPhone (same Wi-Fi)

Run:

```bash
npm run dev -- --host
```

Open the LAN URL from your terminal on iPhone Safari (example: `http://192.168.1.23:5174`).

If needed, allow Node/Vite through Windows Firewall on private network.

## Legal

- Terms page: `/terms.html`
- Contact email: `vidojam@gmail.com`
- Copyright: © 2026 Jose Torres
