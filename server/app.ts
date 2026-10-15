import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import express from 'express'
import { designConfigSchema, templates, type Work } from '../shared/design.js'
import { createSessions, hashPassword, publicUser, verifyPassword } from './auth.js'
import { openDatabase } from './database.js'
import { ApiError, errorHandler } from './errors.js'
import { authRateLimiter } from './rate-limit.js'
import { createWorkSchema, loginSchema, registerSchema, updateWorkSchema, workSearchSchema } from './validation.js'

export interface AppOptions {
  dbPath: string
  allowedOrigins?: string[]
  now?: () => number
  sessionTtlMs?: number
  secureCookies?: boolean
  authRateLimit?: { windowMs: number; maxAttempts: number; maxEntries?: number }
  staticDir?: string
}

function workFromRow(row: Record<string, unknown>): Work {
  return {
    id: String(row.id), title: String(row.title), description: String(row.description),
    config: designConfigSchema.parse(JSON.parse(String(row.config_json))), version: Number(row.version),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

export function createApp(options: AppOptions) {
  const db = openDatabase(options.dbPath)
  const now = options.now ?? Date.now
  const origins = new Set(options.allowedOrigins ?? [
    'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001',
  ])
  const sessions = createSessions(db, { now, ttlMs: options.sessionTtlMs ?? 7 * 24 * 60 * 60_000, secure: options.secureCookies ?? false })
  const limitAuth = authRateLimiter({ now, windowMs: 15 * 60_000, maxAttempts: 30, ...options.authRateLimit })
  const app = express()
  app.disable('x-powered-by')
  app.set('query parser', 'simple')
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })
  app.use('/api', (request, _response, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.get('origin')
      if (!origin || !origins.has(origin)) {
        next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', '请求来源不受信任，请从本站页面重试'))
        return
      }
      if (!request.is('application/json') && request.path !== '/auth/logout') {
        next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', '请使用 JSON 格式提交'))
        return
      }
    }
    next()
  })
  app.use('/api', express.json({ limit: '16kb', strict: true }))
  app.get('/api/health', (_request, response) => {
    db.prepare('SELECT 1').get()
    response.json({ status: 'ok' })
  })
  app.get('/api/templates', (_request, response) => response.json({ templates }))
  app.post('/api/auth/register', limitAuth, async (request, response) => {
    const input = registerSchema.parse(request.body)
    const passwordHash = await hashPassword(input.password)
    const id = randomUUID()
    try {
      db.prepare('INSERT INTO users(id, username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, input.username, input.displayName, passwordHash, new Date(now()).toISOString())
    } catch (error) {
      if (db.prepare('SELECT id FROM users WHERE username = ?').get(input.username)) {
        throw new ApiError(409, 'USERNAME_TAKEN', '这个用户名已被使用，请换一个')
      }
      throw error
    }
    sessions.issue(id, request, response)
    response.status(201).json({ user: { id, username: input.username, displayName: input.displayName } })
  })
  app.post('/api/auth/login', limitAuth, async (request, response) => {
    const input = loginSchema.parse(request.body)
    const row = db.prepare('SELECT id, username, display_name, password_hash FROM users WHERE username = ?').get(input.username)
    const valid = await verifyPassword(input.password, row ? String(row.password_hash) : undefined)
    if (!row || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', '用户名或密码不正确')
    const user = publicUser(row)
    sessions.issue(user.id, request, response)
    response.json({ user })
  })
  app.get('/api/auth/me', (request, response) => response.json({ user: sessions.require(request) }))
  app.post('/api/auth/logout', (request, response) => {
    sessions.revoke(request, response)
    response.status(204).end()
  })
  app.get('/api/works', (request, response) => {
    const user = sessions.require(request)
    const { search = '' } = workSearchSchema.parse(request.query)
    const rows = db.prepare(`
      SELECT * FROM works WHERE owner_id = ? AND (instr(title, ?) > 0 OR instr(description, ?) > 0)
      ORDER BY updated_at DESC, id DESC
    `).all(user.id, search, search)
    response.json({ works: rows.map(workFromRow) })
  })
  app.post('/api/works', (request, response) => {
    const user = sessions.require(request)
    const input = createWorkSchema.parse(request.body)
    const id = randomUUID()
    const time = new Date(now()).toISOString()
    db.prepare('INSERT INTO works(id, owner_id, title, description, config_json, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
      .run(id, user.id, input.title, input.description, JSON.stringify(input.config), time, time)
    response.status(201).json({ work: { id, ...input, version: 1, createdAt: time, updatedAt: time } })
  })
  app.get('/api/works/:id', (request, response) => {
    const user = sessions.require(request)
    const row = db.prepare('SELECT * FROM works WHERE id = ? AND owner_id = ?').get(String(request.params.id), user.id)
    if (!row) throw new ApiError(404, 'NOT_FOUND', '找不到这件作品')
    response.json({ work: workFromRow(row) })
  })
  app.put('/api/works/:id', (request, response) => {
    const user = sessions.require(request)
    const id = String(request.params.id)
    const input = updateWorkSchema.parse(request.body)
    const result = db.prepare(`
      UPDATE works SET title = ?, description = ?, config_json = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND owner_id = ? AND version = ?
    `).run(input.title, input.description, JSON.stringify(input.config), new Date(now()).toISOString(), id, user.id, input.version)
    const row = db.prepare('SELECT * FROM works WHERE id = ? AND owner_id = ?').get(id, user.id)
    if (!row) throw new ApiError(404, 'NOT_FOUND', '找不到这件作品')
    if (result.changes === 0) throw new ApiError(409, 'VERSION_CONFLICT', '作品已在其他页面更新，请重新打开后再保存')
    response.json({ work: workFromRow(row) })
  })
  app.use('/api', (_request, _response, next) => next(new ApiError(404, 'NOT_FOUND', '找不到这个接口')))
  if (options.staticDir) {
    const directory = resolve(options.staticDir)
    app.use(express.static(directory))
    app.get('/{*path}', (_request, response) => response.sendFile(join(directory, 'index.html')))
  }
  app.use(errorHandler)
  return { app, close() { db.close() } }
}
