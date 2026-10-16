import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import express, { type Request, type Response } from 'express'
import { templates, type Work } from '../shared/design.js'
import { createSessions, hashPassword, publicUser, verifyPassword } from './auth.js'
import { openDatabase } from './database.js'
import { ApiError, errorHandler } from './errors.js'
import { authRateLimiter } from './rate-limit.js'
import { createWorkSchema, duplicateWorkSchema, loginSchema, registerSchema, updateWorkSchema, workSearchSchema, workVersionSchema } from './validation.js'
import { executeMutation, parseIdempotencyKey } from './idempotency.js'
import { createWorks } from './works.js'

export interface AppOptions {
  dbPath: string
  allowedOrigins?: string[]
  now?: () => number
  sessionTtlMs?: number
  secureCookies?: boolean
  authRateLimit?: { windowMs: number; maxAttempts: number; maxEntries?: number }
  staticDir?: string
}

export function createApp(options: AppOptions) {
  const db = openDatabase(options.dbPath)
  const now = options.now ?? Date.now
  const works = createWorks(db, now)
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
  app.use('/api/works', (request, _response, next) => {
    const expected = request.get('X-Expected-User-Id')
    // This header is only a consistency guard. The authenticated session and
    // owner-scoped SQL remain the authority; a supplied id grants no access.
    if (expected !== undefined && sessions.require(request).id !== expected) {
      throw new ApiError(401, 'ACCOUNT_CHANGED', '登录账号已在其他页面更换，请重新登录后再操作；原草稿与待确认请求已保留')
    }
    next()
  })
  function mutate(request: Request, response: Response, ownerId: string, input: object, status: number, operation: () => Work) {
    const result = executeMutation(db, {
      ownerId, key: parseIdempotencyKey(request.get('Idempotency-Key')), method: request.method,
      path: request.path, input, now,
    }, () => ({ status, body: { work: operation() } }))
    response.status(result.status).json(result.body)
  }
  app.get('/api/works', (request, response) => {
    const user = sessions.require(request)
    response.json(works.list(user.id, workSearchSchema.parse(request.query)))
  })
  app.post('/api/works', (request, response) => {
    const user = sessions.require(request)
    const input = createWorkSchema.parse(request.body)
    mutate(request, response, user.id, input, 201, () => works.create(user.id, input))
  })
  app.get('/api/works/:id', (request, response) => {
    const user = sessions.require(request)
    response.json({ work: works.find(user.id, String(request.params.id)) })
  })
  app.put('/api/works/:id', (request, response) => {
    const user = sessions.require(request)
    const input = updateWorkSchema.parse(request.body)
    mutate(request, response, user.id, input, 200, () => works.update(user.id, String(request.params.id), input))
  })
  app.post('/api/works/:id/duplicate', (request, response) => {
    const user = sessions.require(request)
    const input = duplicateWorkSchema.parse(request.body)
    mutate(request, response, user.id, input, 201, () => works.duplicate(user.id, String(request.params.id), input))
  })
  for (const operation of ['trash', 'restore'] as const) {
    app.post(`/api/works/:id/${operation}`, (request, response) => {
      const user = sessions.require(request)
      const input = workVersionSchema.parse(request.body)
      mutate(request, response, user.id, input, 200, () => works.changeState(user.id, String(request.params.id), input.version, operation === 'trash' ? 'trash' : 'active'))
    })
  }
  app.use('/api', (_request, _response, next) => next(new ApiError(404, 'NOT_FOUND', '找不到这个接口')))
  if (options.staticDir) {
    const directory = resolve(options.staticDir)
    app.use(express.static(directory))
    app.get('/{*path}', (_request, response) => response.sendFile(join(directory, 'index.html')))
  }
  app.use(errorHandler)
  return { app, close() { db.close() } }
}
