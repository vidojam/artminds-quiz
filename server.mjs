import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import Stripe from 'stripe'

const app = express()
const port = Number(process.env.PORT || 3000)

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const stripePriceId = process.env.STRIPE_PRICE_ID || ''

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.join(__dirname, 'dist')

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/verify-premium', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')

  const sessionId = req.query.session_id?.toString().trim()
  if (!sessionId) {
    res.status(400).json({ verified: false, error: 'missing_session_id' })
    return
  }

  if (!stripe) {
    res.status(500).json({ verified: false, error: 'missing_stripe_secret_key' })
    return
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      res.json({ verified: false, error: 'session_not_paid' })
      return
    }

    if (stripePriceId) {
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 25 })
      const hasExpectedPrice = lineItems.data.some((lineItem) => lineItem.price?.id === stripePriceId)

      if (!hasExpectedPrice) {
        res.json({ verified: false, error: 'unexpected_price' })
        return
      }
    }

    res.json({ verified: true })
  } catch {
    res.status(400).json({ verified: false, error: 'invalid_session' })
  }
})

app.use(express.static(distPath))

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(port, () => {
  // Keep logs minimal in production startup.
  console.log(`ArtMinds server running on port ${port}`)
})
