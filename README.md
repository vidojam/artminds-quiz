# ArtMinds Quiz

ArtMinds Quiz is a React + TypeScript app that shows artwork images and asks users to identify the painter and period.

## Features

- Two-attempt quiz flow per artwork
- Partial-match blast prompt:
  - "Painter matches only, try again or continue"
  - "Period matches only, try again or continue"
- Correct-answer blast: "You guessed it!"
- Score and progress tracking
- Premium upgrade CTA via Stripe
- Premium unlock state persisted in local storage
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

2. Start dev server:

```bash
npm run dev
```

3. Build production bundle:

```bash
npm run build
```

## Premium Stripe Setup

Premium plan in this app is **unlimited paint selection option for $9.99/year**.

1. Create a Stripe Payment Link in Stripe Dashboard and copy its `https://buy.stripe.com/...` URL. A Stripe API key (`sk_...` or `pk_...`) is not a payment URL.
2. Create `.env` in project root:

```bash
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/your-payment-link
VITE_PREMIUM_VERIFY_ENDPOINT=/api/verify-premium
STRIPE_SECRET_KEY=sk_test_or_sk_live_key
STRIPE_PRICE_ID=price_optional_for_strict_validation
```

3. Restart the dev server after changing `.env`, or rebuild and redeploy production.

Only public configuration belongs in `VITE_` variables: Vite includes these values in browser code. Keep `STRIPE_SECRET_KEY` server-side only. If a secret key was placed in a `VITE_` variable, rotate it in Stripe immediately, remove it from that variable, and rebuild/redeploy. Checkout is disabled when the payment link is missing or is not a valid HTTPS Stripe checkout URL.

When configured, the **Pay with Stripe** button redirects to Stripe Checkout.

### Premium Auto-Unlock Return URL

Set Stripe success return URL to include both a success marker and checkout session id:

- `?checkout=success&session_id={CHECKOUT_SESSION_ID}`

The app verifies the session against Stripe on your server before unlocking premium.

## Deploy to Render (Web Service)

Use a **Web Service** (not Static Site) so `/api/verify-premium` can run.

- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

Set these Render environment variables:

- `VITE_STRIPE_PAYMENT_LINK`
- `VITE_PREMIUM_VERIFY_ENDPOINT=/api/verify-premium`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (optional but recommended)

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
