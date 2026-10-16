import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Stripe from 'stripe'
import { createAccountStore } from './accounts.mjs'
import { createApp } from './server.mjs'

test('payment ownership, webhook idempotency, and persistent account access', async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'artminds-'))
  const filename = path.join(directory, 'accounts.sqlite')
  const store = createAccountStore(filename)
  let checkout
  let lineItemPrice = 'price_art'
  const session = { id: 'cs_paid', mode: 'payment', status: 'complete', payment_status: 'paid' }
  const stripe = {
    prices: { retrieve: async () => ({ active: true, type: 'one_time' }) },
    checkout: { sessions: {
      create: async (params) => { checkout = params; return { url: 'https://checkout.stripe.com/test' } },
      retrieve: async () => session,
      listLineItems: async () => ({ data: [{ price: { id: lineItemPrice } }] }),
    } },
    webhooks: new Stripe('sk_test_placeholder').webhooks,
  }
  const app = createApp({ store, stripe, priceId: 'price_art', webhookSecret: 'whsec_test', appUrl: 'http://localhost:5173' })
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://localhost:${server.address().port}`
  const request = async (route, body, cookie, origin = 'http://localhost:5173') => {
    const response = await fetch(`${base}${route}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
  }
  try {
    const credentials = { email: 'Artist@example.com', password: 'a-long-test-password' }
    assert.equal((await request('/api/auth/register', credentials, null, 'https://evil.example')).status, 403)
    const account = await request('/api/auth/register', credentials)
    assert.equal(account.status, 200)
    assert.equal(account.body.user.email, 'artist@example.com')
    assert.equal(account.body.user.isPremium, false)
    assert.equal((await request('/api/checkout', {})).status, 401)
    assert.equal((await request('/api/checkout', {}, account.cookie)).status, 200)
    assert.equal(checkout.client_reference_id, account.body.user.id)
    assert.equal(checkout.success_url, 'http://localhost:5173/?checkout=success&session_id={CHECKOUT_SESSION_ID}')
    session.client_reference_id = account.body.user.id
    const other = await request('/api/auth/register', { ...credentials, email: 'other@example.com' })
    assert.equal((await request('/api/verify-premium?session_id=cs_paid', null, other.cookie)).status, 403)
    session.payment_status = 'unpaid'
    assert.equal((await request('/api/verify-premium?session_id=cs_paid', null, account.cookie)).body.verified, false)
    session.payment_status = 'paid'
    lineItemPrice = 'price_unrelated'
    assert.equal((await request('/api/verify-premium?session_id=cs_paid', null, account.cookie)).body.verified, false)
    lineItemPrice = 'price_art'
    for (const eventType of ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_succeeded']) {
      const payload = JSON.stringify({ type: eventType, data: { object: { id: session.id } } })
      const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' })
      assert.equal((await fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 'invalid' }, body: payload })).status, 400)
      session.payment_status = eventType === 'checkout.session.completed' ? 'unpaid' : 'paid'
      assert.equal((await fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature }, body: payload })).status, 200)
      assert.equal((await request('/api/me', null, account.cookie)).body.user.isPremium, session.payment_status === 'paid')
    }
    assert.equal((await request('/api/me', null, account.cookie)).body.user.isPremium, true)
    assert.equal((await request('/api/me', null, other.cookie)).body.user.isPremium, false)
    assert.equal((await request('/api/verify-premium?session_id=cs_paid', null, account.cookie)).body.verified, true)
    await request('/api/auth/logout', {}, account.cookie)
    assert.equal((await request('/api/me', null, account.cookie)).body.user, null)
    assert.equal((await request('/api/auth/login', { ...credentials, password: 'wrong-password-value' })).status, 401)
    const login = await request('/api/auth/login', credentials)
    assert.equal(login.body.user.isPremium, true)
    store.close()
    const reopened = createAccountStore(filename)
    assert.equal((await reopened.login(credentials.email.toLowerCase(), credentials.password)).isPremium, true)
    reopened.close()
  } finally {
    await new Promise((resolve) => server.close(resolve))
    rmSync(directory, { recursive: true, force: true })
  }
})