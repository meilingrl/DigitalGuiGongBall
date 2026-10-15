import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { once } from 'node:events'
import type { Server } from 'node:http'
import { test, type TestContext } from 'node:test'
import { createApp, type AppOptions } from '../app.js'

const origin = 'http://localhost:5173'
const config = {
  schemaVersion: 1, templateId: 'linglong', layers: 4, patternScale: 12,
  aperture: 0.55, material: 'ivory', separation: 0, cutaway: false,
  autoRotate: false, activeLayer: 0,
}
const credentials = { username: 'artisan', displayName: '创作者', password: 'test-pass-123' }

async function fixture(t: TestContext, options: Partial<AppOptions> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'guigong-api-'))
  const dbPath = join(directory, 'nested', 'test.sqlite')
  let instance: ReturnType<typeof createApp>
  let server: Server
  let base: string
  async function open() {
    instance = createApp({ dbPath, allowedOrigins: [origin], ...options })
    server = instance.app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    base = `http://127.0.0.1:${address.port}`
  }
  async function close() {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    instance.close()
  }
  await open()
  t.after(async () => { await close(); await rm(directory, { recursive: true, force: true }) })
  return {
    dbPath,
    async restart() { await close(); await open() },
    async request(path: string, options: { method?: string; body?: unknown; cookie?: string; raw?: string; origin?: string | null; contentType?: string } = {}) {
      const method = options.method ?? 'GET'
      const headers: Record<string, string> = {}
      if (options.origin !== null) headers.Origin = options.origin ?? origin
      if (options.cookie) headers.Cookie = options.cookie
      if (options.body !== undefined || options.raw !== undefined) headers['Content-Type'] = options.contentType ?? 'application/json'
      const response = await fetch(`${base}${path}`, {
        method, headers, body: options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      })
      const text = await response.text()
      const isJson = response.headers.get('content-type')?.includes('application/json')
      return { status: response.status, headers: response.headers, data: text ? (isJson ? JSON.parse(text) : { raw: text }) : null }
    },
  }
}

function sessionCookie(headers: Headers) {
  const cookie = headers.get('set-cookie')
  assert.ok(cookie)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=Lax/i)
  assert.match(cookie, /Path=\//i)
  return cookie.split(';')[0]!
}

test('initializes an empty file database and serves health and complete public templates', async (t) => {
  const api = await fixture(t)
  assert.equal((await api.request('/api/health')).status, 200)
  const response = await api.request('/api/templates')
  assert.equal(response.status, 200)
  assert.deepEqual(response.data.templates.map((value: { id: string }) => value.id), ['linglong', 'ruyi', 'lianhua'])
  const db = new DatabaseSync(api.dbPath)
  try {
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name)
    for (const expected of ['users', 'sessions', 'works', 'schema_migrations']) assert.ok(names.includes(expected))
  } finally { db.close() }
})

test('registers, normalizes the username and returns only public user fields with a secure session', async (t) => {
  const api = await fixture(t)
  const registration = await api.request('/api/auth/register', { method: 'POST', body: { ...credentials, username: 'Artisan' } })
  assert.equal(registration.status, 201)
  assert.deepEqual(Object.keys(registration.data.user).sort(), ['displayName', 'id', 'username'])
  assert.equal(registration.data.user.username, 'artisan')
  const cookie = sessionCookie(registration.headers)
  const me = await api.request('/api/auth/me', { cookie })
  assert.deepEqual(me.data.user, registration.data.user)
  const duplicate = await api.request('/api/auth/register', { method: 'POST', body: credentials })
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.data.error.code, 'USERNAME_TAKEN')
  const db = new DatabaseSync(api.dbPath)
  try {
    const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('artisan')!
    assert.notEqual(user.password_hash, credentials.password)
    assert.match(String(user.password_hash), /^scrypt\$/)
    const sessions = db.prepare('SELECT token_hash FROM sessions').all()
    assert.equal(sessions.length, 1)
    assert.notEqual(sessions[0]!.token_hash, cookie.split('=')[1])
  } finally { db.close() }
})

test('requires credentials, logs in, invalidates logout server-side and expires sessions', async (t) => {
  let now = Date.UTC(2026, 9, 16)
  const api = await fixture(t, { now: () => now, sessionTtlMs: 60_000 })
  assert.equal((await api.request('/api/auth/me')).status, 401)
  await api.request('/api/auth/register', { method: 'POST', body: credentials })
  const bad = await api.request('/api/auth/login', { method: 'POST', body: { username: 'artisan', password: 'wrong-password' } })
  assert.equal(bad.status, 401)
  assert.equal(bad.data.error.code, 'INVALID_CREDENTIALS')
  const missing = await api.request('/api/auth/login', { method: 'POST', body: { username: 'unknown', password: 'wrong-password' } })
  assert.deepEqual(missing.data, bad.data)
  const login = await api.request('/api/auth/login', { method: 'POST', body: { username: 'artisan', password: credentials.password } })
  assert.equal(login.status, 200)
  const cookie = sessionCookie(login.headers)
  const logout = await api.request('/api/auth/logout', { method: 'POST', cookie })
  assert.equal(logout.status, 204)
  assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/)
  assert.equal((await api.request('/api/auth/me', { cookie })).status, 401)
  const again = await api.request('/api/auth/login', { method: 'POST', body: { username: 'artisan', password: credentials.password } })
  const expiring = sessionCookie(again.headers)
  now += 60_001
  assert.equal((await api.request('/api/auth/me', { cookie: expiring })).status, 401)
})

test('saves, searches, updates and reopens works with optimistic version protection', async (t) => {
  const api = await fixture(t)
  const signup = await api.request('/api/auth/register', { method: 'POST', body: credentials })
  assert.equal(signup.status, 201)
  const cookie = sessionCookie(signup.headers)
  const created = await api.request('/api/works', { method: 'POST', cookie, body: { title: '玲珑初作', description: '持久保存', config } })
  assert.equal(created.status, 201)
  const work = created.data.work
  assert.equal(work.version, 1)
  assert.equal(work.title, '玲珑初作')
  assert.deepEqual(work.config, config)
  assert.ok(Number.isFinite(Date.parse(work.createdAt)))
  assert.equal((await api.request('/api/works?search=玲珑', { cookie })).data.works.length, 1)
  assert.equal((await api.request('/api/works?search=不存在', { cookie })).data.works.length, 0)
  const change = { title: '莲华新作', description: '', config: { ...config, templateId: 'lianhua', material: 'jade' }, version: 1 }
  const updated = await api.request(`/api/works/${work.id}`, { method: 'PUT', cookie, body: change })
  assert.equal(updated.status, 200)
  assert.equal(updated.data.work.version, 2)
  assert.equal(updated.data.work.createdAt, work.createdAt)
  const stale = await api.request(`/api/works/${work.id}`, { method: 'PUT', cookie, body: { ...change, title: '过期覆盖' } })
  assert.equal(stale.status, 409)
  assert.equal(stale.data.error.code, 'VERSION_CONFLICT')
  await api.restart()
  const read = await api.request(`/api/works/${work.id}`, { cookie })
  assert.equal(read.status, 200)
  assert.equal(read.data.work.title, '莲华新作')
  assert.equal(read.data.work.version, 2)
  assert.equal((await api.request('/api/auth/me', { cookie })).status, 200)
})

test('enforces ownership on reads, lists and updates and requires login on every works route', async (t) => {
  const api = await fixture(t)
  const first = await api.request('/api/auth/register', { method: 'POST', body: credentials })
  assert.equal(first.status, 201)
  const alice = sessionCookie(first.headers)
  const second = await api.request('/api/auth/register', { method: 'POST', body: { ...credentials, username: 'other' } })
  const bob = sessionCookie(second.headers)
  const created = await api.request('/api/works', { method: 'POST', cookie: alice, body: { title: '私人作品', description: '', config } })
  assert.equal(created.status, 201)
  const id = created.data.work.id
  for (const method of ['GET', 'PUT']) {
    const body = method === 'PUT' ? { title: '越权', description: '', config, version: 1 } : undefined
    const foreign = await api.request(`/api/works/${id}`, { method, cookie: bob, body })
    assert.equal(foreign.status, 404)
    const anonymous = await api.request(`/api/works/${id}`, { method, body })
    assert.equal(anonymous.status, 401)
  }
  assert.deepEqual((await api.request('/api/works', { cookie: bob })).data.works, [])
  assert.equal((await api.request('/api/works')).status, 401)
  assert.equal((await api.request('/api/works', { method: 'POST', body: { title: '未登录', description: '', config } })).status, 401)
  assert.equal((await api.request(`/api/works/${id}`, { cookie: alice })).data.work.version, 1)
})

test('rejects invalid credentials and strict bounded work inputs without changing stored state', async (t) => {
  const api = await fixture(t)
  for (const body of [
    { ...credentials, username: 'ab' }, { ...credentials, username: 'bad name' },
    { ...credentials, displayName: ' ' }, { ...credentials, password: 'short' },
    { ...credentials, password: 'a'.repeat(129) }, { ...credentials, role: 'admin' },
  ]) assert.equal((await api.request('/api/auth/register', { method: 'POST', body })).status, 400)
  const signup = await api.request('/api/auth/register', { method: 'POST', body: credentials })
  assert.equal(signup.status, 201)
  const cookie = sessionCookie(signup.headers)
  for (const change of [
    { title: '' }, { title: ' ' }, { title: 'a'.repeat(81) }, { description: 'a'.repeat(1001) },
    { config: { ...config, layers: 7 } }, { config: { ...config, activeLayer: 5 } },
    { config: { ...config, injected: true } }, { ownerId: 'other' }, { config: null },
  ]) {
    const response = await api.request('/api/works', { method: 'POST', cookie, body: { title: '测试', description: '', config, ...change } })
    assert.equal(response.status, 400, JSON.stringify(change))
    assert.equal(response.data.error.code, 'VALIDATION_ERROR')
  }
  assert.deepEqual((await api.request('/api/works', { cookie })).data.works, [])
})

test('returns bounded JSON errors for malformed JSON, large payloads, invalid origins and missing APIs', async (t) => {
  const api = await fixture(t)
  const malformed = await api.request('/api/auth/register', { method: 'POST', raw: '{bad-json' })
  assert.equal(malformed.status, 400)
  assert.equal(malformed.data.error.code, 'INVALID_JSON')
  const tooLarge = await api.request('/api/auth/register', { method: 'POST', body: { text: 'x'.repeat(20_000) } })
  assert.equal(tooLarge.status, 413)
  assert.equal(tooLarge.data.error.code, 'PAYLOAD_TOO_LARGE')
  for (const badOrigin of ['http://evil.example', 'null', null]) {
    const response = await api.request('/api/auth/register', { method: 'POST', body: credentials, origin: badOrigin })
    assert.equal(response.status, 403)
    assert.equal(response.data.error.code, 'ORIGIN_NOT_ALLOWED')
  }
  const missing = await api.request('/api/missing')
  assert.equal(missing.status, 404)
  assert.equal(missing.data.error.code, 'NOT_FOUND')
})

test('limits repeated authentication attempts and resets the bounded window', async (t) => {
  let now = Date.now()
  const api = await fixture(t, { now: () => now, authRateLimit: { windowMs: 10_000, maxAttempts: 2, maxEntries: 10 } })
  const request = () => api.request('/api/auth/login', { method: 'POST', body: { username: 'nobody', password: 'bad-password' } })
  assert.equal((await request()).status, 401)
  assert.equal((await request()).status, 401)
  const limited = await request()
  assert.equal(limited.status, 429)
  assert.equal(limited.data.error.code, 'RATE_LIMITED')
  assert.ok(Number(limited.headers.get('retry-after')) >= 1)
  now += 10_001
  assert.equal((await request()).status, 401)
})

test('returns a bounded 400 error when a work URL contains invalid percent encoding', async (t) => {
  const api = await fixture(t)
  const response = await api.request('/api/works/%GG')
  assert.equal(response.status, 400)
  assert.equal(typeof response.data.error.message, 'string')
  assert.ok(!JSON.stringify(response.data).includes('decode_param'))
})

test('returns 415 for an unsupported JSON charset without exposing a server exception', async (t) => {
  const api = await fixture(t)
  const response = await api.request('/api/auth/register', {
    method: 'POST', body: credentials, contentType: 'application/json; charset=madeup',
  })
  assert.equal(response.status, 415)
  assert.equal(typeof response.data.error.message, 'string')
})

test('rejects embedded NUL in text fields before database constraints or storage', async (t) => {
  const api = await fixture(t)
  const badName = await api.request('/api/auth/register', { method: 'POST', body: { ...credentials, displayName: '\u0000' } })
  assert.equal(badName.status, 400)
  const signup = await api.request('/api/auth/register', { method: 'POST', body: credentials })
  assert.equal(signup.status, 201)
  const cookie = sessionCookie(signup.headers)
  for (const change of [{ title: '\u0000' }, { title: 'title\u0000suffix' }, { description: 'text\u0000suffix' }]) {
    const response = await api.request('/api/works', { method: 'POST', cookie, body: { title: '正常标题', description: '', config, ...change } })
    assert.equal(response.status, 400)
    assert.equal(response.data.error.code, 'VALIDATION_ERROR')
  }
  assert.deepEqual((await api.request('/api/works', { cookie })).data.works, [])
})
