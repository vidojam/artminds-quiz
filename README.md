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

Premium plan in this app is **unlimited artwork limit for $9.99/year**.

1. Create a Stripe Payment Link in Stripe Dashboard.
2. Create `.env` in project root:

```bash
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/your-payment-link
```

3. Restart dev server.

When configured, the **Pay with Stripe** button redirects to Stripe Checkout.

### Premium Auto-Unlock Return URL

Set Stripe success return URL to include one of these query params:

- `?premium=success`
- `?checkout=success`
- `?payment=success`

This marks premium as unlocked in local storage.

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
