import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import type { User } from '../shared/design.js'
import { ApiError } from './errors.js'

const cookieName = 'guigong_session'
const dummyHash = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`

function derivePassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, result) => error ? reject(error) : resolve(result))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = await derivePassword(password, salt)
  return `scrypt$${salt}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, encoded: string = dummyHash): Promise<boolean> {
  const match = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(encoded)
  if (!match) return false
  const derived = await derivePassword(password, match[1]!)
  return timingSafeEqual(derived, Buffer.from(match[2]!, 'hex'))
}

function sessionToken(request: Request): string | undefined {
  const matches = (request.headers.cookie ?? '').split(';').map((value) => value.trim())
    .filter((value) => value.startsWith(`${cookieName}=`))
  if (matches.length !== 1) return undefined
  const token = matches[0]!.slice(cookieName.length + 1)
  return /^[0-9a-f]{64}$/.test(token) ? token : undefined
}

function digest(token: string) { return createHash('sha256').update(token).digest('hex') }

export function publicUser(row: Record<string, unknown>): User {
  return { id: String(row.id), username: String(row.username), displayName: String(row.display_name) }
}

export function createSessions(db: DatabaseSync, options: { now: () => number; ttlMs: number; secure: boolean }) {
  const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: options.secure, path: '/' }
  return {
    read(request: Request): User | undefined {
      const token = sessionToken(request)
      if (!token) return undefined
      const hash = digest(token)
      const row = db.prepare(`
        SELECT users.id, users.username, users.display_name FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
      `).get(hash, options.now())
      if (!row) {
        db.prepare('DELETE FROM sessions WHERE token_hash = ? AND expires_at <= ?').run(hash, options.now())
        return undefined
      }
      return publicUser(row)
    },
    require(request: Request): User {
      const user = this.read(request)
      if (!user) throw new ApiError(401, 'UNAUTHENTICATED', '请先登录后继续')
      return user
    },
    issue(userId: string, request: Request, response: Response) {
      const now = options.now()
      const token = randomBytes(32).toString('hex')
      const previous = sessionToken(request)
      db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now)
        if (previous) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(previous))
        db.prepare('INSERT INTO sessions(token_hash, user_id, created_at, expires_at) VALUES(?, ?, ?, ?)')
          .run(digest(token), userId, now, now + options.ttlMs)
        db.prepare(`DELETE FROM sessions WHERE user_id = ? AND token_hash NOT IN (
          SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10
        )`).run(userId, userId)
        db.exec('COMMIT')
      } catch (error) { db.exec('ROLLBACK'); throw error }
      response.cookie(cookieName, token, { ...cookieOptions, maxAge: options.ttlMs })
    },
    revoke(request: Request, response: Response) {
      const token = sessionToken(request)
      if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token))
      response.cookie(cookieName, '', { ...cookieOptions, maxAge: 0 })
    },
  }
}
