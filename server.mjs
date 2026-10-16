import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import express from 'express'
import Stripe from 'stripe'
import { createAccountStore } from './accounts.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp({ store, stripe, priceId, webhookSecret, appUrl, secureCookies = false }) {
  const app = express()
  const origin = new URL(appUrl).origin
  secureCookies = secureCookies || origin.startsWith('https:')
  const cookieName = secureCookies ? '__Host-artminds-session' : 'artminds-session'
  const tokenFrom = (req) => req.headers.cookie?.split('; ').find((cookie) => cookie.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  const cookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/', maxAge: 30 * 86400000 }
  const requireUser = (req, res, next) => {
    req.user = store.userForSession(tokenFrom(req))
    if (!req.user) return res.status(401).json({ error: 'Please sign in to your account.' })
    next()
  }
  const fulfill = async (session) => {
    if (session.status !== 'complete' || session.payment_status !== 'paid') return false
    if (session.mode !== 'payment' || !session.client_reference_id || !priceId) return false
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })
    if (items.has_more || items.data.length !== 1 || items.data[0].price?.id !== priceId) return false
    store.grantPremium(session.id, session.client_reference_id)
    return true
  }

  app.disable('x-powered-by')
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe || !webhookSecret) return res.status(503).json({ error: 'Payments are not configured.' })
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret)
    } catch {
      return res.status(400).json({ error: 'Invalid webhook signature.' })
    }
    try {
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
        await fulfill(await stripe.checkout.sessions.retrieve(event.data.object.id))
      }
      res.json({ received: true })
    } catch {
      res.status(500).json({ error: 'Payment fulfillment failed. Stripe should retry.' })
    }
  })
  app.use(express.json({ limit: '8kb' }))
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) {
      return res.status(403).json({ error: 'Invalid request origin.' })
    }
    next()
  })
  const authAttempts = new Map()
  app.use('/api/auth', (req, res, next) => {
    if (req.method !== 'POST' || req.path === '/logout') return next()
    const now = Date.now()
    for (const [key, attempt] of authAttempts) if (attempt.until <= now) authAttempts.delete(key)
    const key = req.ip
    const attempt = authAttempts.get(key) || { count: 0, until: now + 15 * 60000 }
    attempt.count += 1
    authAttempts.set(key, attempt)
    if (attempt.count > 20) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
    next()
  })
  for (const action of ['register', 'login']) {
    app.post(`/api/auth/${action}`, async (req, res) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
      const password = req.body?.password
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string' || password.length < 12 || password.length > 128) {
        return res.status(400).json({ error: 'Enter a valid email and a password of 12 to 128 characters.' })
      }
      try {
        const user = await store[action](email, password)
        if (!user) return res.status(401).json({ error: 'Incorrect email or password.' })
        store.logout(tokenFrom(req))
        res.cookie(cookieName, store.createSession(user.id), cookieOptions)
        res.json({ user })
      } catch (error) {
        const duplicate = error.code?.includes('CONSTRAINT') || error.message?.includes('UNIQUE constraint')
        res.status(duplicate ? 409 : 500).json({ error: duplicate ? 'Unable to create account. Try signing in.' : 'Unable to sign in. Please try again.' })
      }
    })
  }
  app.post('/api/auth/logout', (req, res) => {
    store.logout(tokenFrom(req))
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined })
    res.json({ user: null })
  })
  app.get('/api/me', (req, res) => res.json({ user: store.userForSession(tokenFrom(req)) }))
  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.post('/api/checkout', requireUser, async (req, res) => {
    if (!stripe || !priceId || !webhookSecret) return res.status(503).json({ error: 'Checkout is not configured yet.' })
    if (req.user.isPremium) return res.status(409).json({ error: 'Unlimited art is already active.' })
    try {
      const price = await stripe.prices.retrieve(priceId)
      if (!price.active || price.type !== 'one_time') return res.status(503).json({ error: 'A one-time unlimited-art price must be configured.' })
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: req.user.id,
        customer_email: req.user.email,
        success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=cancelled`,
        integration_identifier: `artminds_${Array.from(randomBytes(8), (value) => String.fromCharCode(97 + value % 26)).join('')}`,
      })
      res.json({ url: session.url })
    } catch {
      res.status(502).json({ error: 'Unable to open checkout. Please try again.' })
    }
  })
  app.get('/api/verify-premium', requireUser, async (req, res) => {
    if (!stripe || !priceId) return res.status(503).json({ error: 'Payments are not configured.' })
    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : ''
    if (!sessionId) return res.status(400).json({ error: 'Missing checkout session.' })
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.client_reference_id !== req.user.id) return res.status(403).json({ error: 'Sign in with the account used for this purchase.' })
      const verified = await fulfill(session)
      res.json({ verified, user: store.userForSession(tokenFrom(req)) })
    } catch {
      res.status(400).json({ error: 'Unable to verify payment. Please try again.' })
    }
  })
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API endpoint.' }))
  app.use(express.static(path.join(__dirname, 'dist')))
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))
  return app
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (existsSync(path.join(__dirname, '.env'))) process.loadEnvFile(path.join(__dirname, '.env'))
  const port = Number(process.env.PORT || 3000)
  if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) throw new Error('APP_URL is required in production.')
  const store = createAccountStore(process.env.DATABASE_PATH || path.join(__dirname, 'data', 'artminds.sqlite'))
  const app = createApp({
    store,
    stripe: process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null,
    priceId: process.env.STRIPE_PRICE_ID,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    appUrl: process.env.APP_URL || `http://localhost:${port}`,
    secureCookies: process.env.NODE_ENV === 'production',
  })
  app.listen(port, () => console.log(`ArtMinds server running on port ${port}`))
}
