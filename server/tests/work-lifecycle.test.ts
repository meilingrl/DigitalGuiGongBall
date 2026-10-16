import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import * as database from '../database.js'
import { hashPassword, verifyPassword } from '../auth.js'
import { workFixture, workInput } from './work-fixture.js'

test('schema v2 initializes empty files and migrates a real v1 database without resetting passwords or works', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'guigong-v1-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const path = join(directory, 'v1.sqlite')
  const passwordHash = await hashPassword('original-password')
  let db = new DatabaseSync(path)
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    INSERT INTO schema_migrations VALUES(1, '2026-10-15T00:00:00.000Z');
    CREATE TABLE users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE works(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80), description TEXT NOT NULL CHECK(length(description) <= 1000), config_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX works_owner_updated_idx ON works(owner_id, updated_at DESC);
  `)
  db.prepare('INSERT INTO users VALUES(?, ?, ?, ?, ?)').run('old-user', 'original', '原用户', passwordHash, '2026-10-15T00:00:00.000Z')
  db.prepare('INSERT INTO works VALUES(?, ?, ?, ?, ?, ?, ?, ?)')
    .run('old-work', 'old-user', workInput.title, workInput.description, JSON.stringify(workInput.config), 7, '2026-10-15T00:00:00.000Z', '2026-10-15T01:00:00.000Z')
  db.close()
  db = database.openDatabase(path)
  try {
    const work = db.prepare('SELECT * FROM works WHERE id = ?').get('old-work')!
    assert.equal(work.deleted_at, null)
    assert.equal(work.version, 7)
    assert.equal(work.title, workInput.title)
    assert.deepEqual(JSON.parse(String(work.config_json)), workInput.config)
    assert.equal(work.updated_at, '2026-10-15T01:00:00.000Z')
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get('old-user')!
    assert.equal(user.password_hash, passwordHash)
    assert.equal(await verifyPassword('original-password', String(user.password_hash)), true)
    assert.deepEqual(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version), [1, 2])
    assert.equal((database as Record<string, unknown>).SCHEMA_VERSION, 2)
  } finally { db.close() }
  db = database.openDatabase(path)
  try { assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get()!.n, 2) } finally { db.close() }
  db = database.openDatabase(join(directory, 'new.sqlite'))
  try {
    assert.equal(db.prepare('SELECT max(version) AS version FROM schema_migrations').get()!.version, 2)
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mutation_journal'").get())
  } finally { db.close() }
})

test('duplicates are independent version-one copies with bounded default and custom titles', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const title = 'a'.repeat(75) + '😀x'
  const source = (await api.request('/api/works', { method: 'POST', cookie, body: { ...workInput, title } })).data.work
  const copied = await api.request(`/api/works/${source.id}/duplicate`, { method: 'POST', cookie, body: { version: 1 } })
  assert.equal(copied.status, 201)
  const copy = copied.data.work
  assert.notEqual(copy.id, source.id)
  assert.equal(copy.version, 1)
  assert.equal(copy.deletedAt, null)
  assert.ok(copy.title.length <= 80)
  assert.ok(copy.title.endsWith('（副本）'))
  assert.equal(copy.title.isWellFormed(), true)
  assert.deepEqual(copy.config, source.config)
  assert.equal(copy.description, source.description)
  const update = await api.request(`/api/works/${copy.id}`, { method: 'PUT', cookie, body: { ...workInput, title: '独立修改', version: 1 } })
  assert.equal(update.status, 200)
  assert.equal((await api.request(`/api/works/${source.id}`, { cookie })).data.work.title, title)
  const custom = await api.request(`/api/works/${source.id}/duplicate`, { method: 'POST', cookie, body: { version: 1, title: '  自定标题  ' } })
  assert.equal(custom.data.work.title, '自定标题')
  for (const body of [{ version: 2 }, { version: 1, title: '' }, { version: 1, title: 'x'.repeat(81) }]) {
    const response = await api.request(`/api/works/${source.id}/duplicate`, { method: 'POST', cookie, body })
    assert.equal(response.status, body.version === 2 ? 409 : 400)
  }
})

test('trash and restore preserve content, enforce state and version, and hide trash from normal reads and updates', async (t) => {
  let now = Date.UTC(2026, 9, 16)
  const api = await workFixture(t, { now: () => now })
  const cookie = await api.signup()
  const source = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  assert.equal(source.deletedAt, null)
  now += 1000
  const trashed = await api.request(`/api/works/${source.id}/trash`, { method: 'POST', cookie, body: { version: 1 } })
  assert.equal(trashed.status, 200)
  assert.equal(trashed.data.work.version, 2)
  assert.equal(trashed.data.work.deletedAt, new Date(now).toISOString())
  assert.equal(trashed.data.work.updatedAt, new Date(now).toISOString())
  assert.deepEqual(trashed.data.work.config, source.config)
  assert.equal((await api.request('/api/works', { cookie })).data.works.length, 0)
  const trashList = await api.request('/api/works?state=trash', { cookie })
  assert.deepEqual(trashList.data.works, [trashed.data.work])
  for (const [method, suffix, body] of [
    ['GET', '', undefined], ['PUT', '', { ...workInput, version: 2 }], ['POST', '/duplicate', { version: 2 }],
  ] as const) assert.equal((await api.request(`/api/works/${source.id}${suffix}`, { method, cookie, body })).status, 404)
  const wrongState = await api.request(`/api/works/${source.id}/trash`, { method: 'POST', cookie, body: { version: 2 } })
  assert.equal(wrongState.status, 409)
  assert.equal(wrongState.data.error.code, 'WORK_STATE_CONFLICT')
  const stale = await api.request(`/api/works/${source.id}/restore`, { method: 'POST', cookie, body: { version: 1 } })
  assert.equal(stale.status, 409)
  assert.equal(stale.data.error.code, 'VERSION_CONFLICT')
  now += 1000
  const restored = await api.request(`/api/works/${source.id}/restore`, { method: 'POST', cookie, body: { version: 2 } })
  assert.equal(restored.status, 200)
  assert.equal(restored.data.work.version, 3)
  assert.equal(restored.data.work.deletedAt, null)
  assert.equal(restored.data.work.createdAt, source.createdAt)
  assert.equal((await api.request(`/api/works/${source.id}`, { cookie })).data.work.version, 3)
  assert.equal((await api.request('/api/works?state=trash', { cookie })).data.works.length, 0)
  assert.equal((await api.request(`/api/works/${source.id}/restore`, { method: 'POST', cookie, body: { version: 3 } })).status, 409)
})

test('every lifecycle route checks owner and authentication before exposing a work', async (t) => {
  const api = await workFixture(t)
  const alice = await api.signup()
  const bob = await api.signup('second')
  const source = (await api.request('/api/works', { method: 'POST', cookie: alice, body: workInput })).data.work
  for (const operation of ['duplicate', 'trash', 'restore']) {
    for (const cookie of [bob, undefined]) {
      const response = await api.request(`/api/works/${source.id}/${operation}`, { method: 'POST', cookie, body: { version: 1 } })
      assert.equal(response.status, cookie ? 404 : 401)
    }
  }
  assert.equal((await api.request('/api/works?state=trash', { cookie: bob })).data.works.length, 0)
  assert.equal((await api.request(`/api/works/${source.id}`, { cookie: alice })).data.work.version, 1)
})

test('search pagination is bounded and stable at timestamp ties without overlapping pages or foreign works', async (t) => {
  const api = await workFixture(t, { now: () => Date.UTC(2026, 9, 16) })
  const cookie = await api.signup()
  const bob = await api.signup('second')
  const ids: string[] = []
  for (let i = 0; i < 27; i++) {
    const response = await api.request('/api/works', { method: 'POST', cookie, body: { ...workInput, title: i < 25 ? `匹配-${i}` : `其他-${i}`, description: '' } })
    assert.equal(response.status, 201)
    ids.push(response.data.work.id)
  }
  await api.request('/api/works', { method: 'POST', cookie: bob, body: { ...workInput, title: '匹配-他人' } })
  await api.request(`/api/works/${ids[0]}/trash`, { method: 'POST', cookie, body: { version: 1 } })
  const first = await api.request('/api/works?search=匹配', { cookie })
  const second = await api.request('/api/works?search=匹配&page=2', { cookie })
  assert.deepEqual(first.data.pagination, { page: 1, pageSize: 12, total: 24, totalPages: 2 })
  assert.equal(second.data.works.length, 12)
  const returnedIds = [...first.data.works, ...second.data.works].map((work) => work.id)
  assert.equal(new Set(returnedIds).size, 24)
  assert.deepEqual(returnedIds, ids.slice(1, 25).sort().reverse())
  const pastEnd = await api.request('/api/works?search=匹配&page=3&pageSize=12', { cookie })
  assert.deepEqual(pastEnd.data.works, [])
  assert.equal(pastEnd.data.pagination.total, 24)
  assert.equal((await api.request('/api/works?pageSize=48', { cookie })).data.works.length, 26)
  const empty = await api.request('/api/works?search=不存在', { cookie })
  assert.deepEqual(empty.data.pagination, { page: 1, pageSize: 12, total: 0, totalPages: 0 })
  const trash = await api.request('/api/works?state=trash&search=匹配', { cookie })
  assert.equal(trash.data.pagination.total, 1)
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1e2', 'page=', 'page=9007199254740992', 'pageSize=0', 'pageSize=49', 'pageSize=1&pageSize=2', 'state=deleted', 'unknown=x']) {
    assert.equal((await api.request(`/api/works?${query}`, { cookie })).status, 400, query)
  }
})

test('competing stale updates or lifecycle changes cannot overwrite the winning version', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const source = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  const competing = await Promise.all(['第一个', '第二个'].map((title) => api.request(`/api/works/${source.id}`, { method: 'PUT', cookie, body: { ...workInput, title, version: 1 } })))
  assert.deepEqual(competing.map((response) => response.status).sort(), [200, 409])
  for (const operation of ['duplicate', 'trash']) {
    const stale = await api.request(`/api/works/${source.id}/${operation}`, { method: 'POST', cookie, body: { version: 1 } })
    assert.equal(stale.status, 409)
    assert.equal(stale.data.error.code, 'VERSION_CONFLICT')
  }
  assert.equal((await api.request(`/api/works/${source.id}`, { cookie })).data.work.version, 2)
})

test('a work at the safe version limit can still be copied while incrementing mutations are rejected', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const work = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  const db = new DatabaseSync(api.dbPath)
  try { db.prepare('UPDATE works SET version = ? WHERE id = ?').run(Number.MAX_SAFE_INTEGER, work.id) } finally { db.close() }
  const copied = await api.request(`/api/works/${work.id}/duplicate`, { method: 'POST', cookie, body: { version: Number.MAX_SAFE_INTEGER } })
  assert.equal(copied.status, 201)
  assert.equal(copied.data.work.version, 1)
  for (const [path, method, body] of [
    [`/api/works/${work.id}`, 'PUT', { ...workInput, version: Number.MAX_SAFE_INTEGER }],
    [`/api/works/${work.id}/trash`, 'POST', { version: Number.MAX_SAFE_INTEGER }],
  ] as const) assert.equal((await api.request(path, { method, cookie, body })).status, 409)
})

test('expected principal is a consistency guard on every work route and never an authorization source', async t => {
  const f = await workFixture(t)
  const aliceCookie = await f.signup('alice_expected')
  const bobCookie = await f.signup('bob_expected')
  const alice = (await f.request('/api/auth/me', { cookie: aliceCookie })).data.user
  const bob = (await f.request('/api/auth/me', { cookie: bobCookie })).data.user
  const created = (await f.request('/api/works', { method: 'POST', cookie: aliceCookie, body: workInput })).data.work
  for (const route of [
    { path: '/api/works' }, { path: `/api/works/${created.id}` },
    { path: '/api/works', method: 'POST', body: workInput },
    { path: `/api/works/${created.id}`, method: 'PUT', body: { ...workInput, version: 1 } },
    ...['duplicate', 'trash', 'restore'].map(action => ({ path: `/api/works/${created.id}/${action}`, method: 'POST', body: { version: 1 } })),
  ]) {
    const { path, ...options } = route
    const response = await f.request(path, { ...options, cookie: bobCookie, expectedUserId: alice.id })
    assert.equal(response.status, 401, path)
    assert.equal(response.data.error.code, 'ACCOUNT_CHANGED')
  }
  assert.equal((await f.request('/api/works', { cookie: bobCookie })).data.pagination.total, 0)
  const forged = await f.request(`/api/works/${created.id}`, { cookie: bobCookie, expectedUserId: bob.id })
  assert.equal(forged.status, 404, 'matching a header to your own identity cannot access another owner')
  assert.equal((await f.request('/api/works', { expectedUserId: alice.id })).status, 401, 'a header alone is not authentication')
  assert.equal((await f.request('/api/works', { cookie: aliceCookie, expectedUserId: alice.id })).status, 200)
  assert.equal((await f.request('/api/works', { cookie: aliceCookie })).status, 200, 'old clients remain compatible')
})
