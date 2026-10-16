import { randomBytes, randomUUID, scrypt as deriveKey, timingSafeEqual, createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { DatabaseSync } from 'node:sqlite'

const scrypt = promisify(deriveKey)
const digest = (value) => createHash('sha256').update(value).digest('hex')

export function createAccountStore(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
      premium INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchases (
      session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id)
    );
  `)
  const publicUser = (user) => user ? { id: user.id, email: user.email, isPremium: Boolean(user.premium) } : null

  return {
    async register(email, password) {
      const salt = randomBytes(16).toString('hex')
      const hash = (await scrypt(password, salt, 64)).toString('hex')
      const id = randomUUID()
      db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(id, email, `${salt}:${hash}`)
      return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id))
    },
    async login(email, password) {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
      const [salt, storedHash] = user?.password.split(':') || ['missing-user', '00'.repeat(64)]
      const hash = await scrypt(password, salt, 64)
      return timingSafeEqual(hash, Buffer.from(storedHash, 'hex')) ? publicUser(user) : null
    },
    createSession(userId) {
      const token = randomBytes(32).toString('hex')
      db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now())
      db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), userId, Date.now() + 30 * 86400000)
      return token
    },
    userForSession(token) {
      if (!token) return null
      return publicUser(db.prepare(`SELECT users.* FROM users JOIN sessions ON users.id = sessions.user_id
        WHERE sessions.token = ? AND sessions.expires > ?`).get(digest(token), Date.now()))
    },
    logout(token) {
      if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(digest(token))
    },
    grantPremium(sessionId, userId) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const purchase = db.prepare('SELECT user_id FROM purchases WHERE session_id = ?').get(sessionId)
        if (purchase && purchase.user_id !== userId) throw new Error('Payment already belongs to another account')
        db.prepare('INSERT OR IGNORE INTO purchases VALUES (?, ?)').run(sessionId, userId)
        db.prepare('UPDATE users SET premium = 1 WHERE id = ?').run(userId)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    close: () => db.close(),
  }
}