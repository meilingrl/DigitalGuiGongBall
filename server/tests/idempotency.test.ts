import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { workFixture, workInput } from './work-fixture.js'

test('concurrent same-key creates produce one work and canonical validated bodies replay exact responses', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const key = randomUUID()
  const responses = await Promise.all(Array.from({ length: 5 }, () => api.request('/api/works', { method: 'POST', cookie, key, body: workInput })))
  for (const response of responses) {
    assert.equal(response.status, 201)
    assert.deepEqual(response.data, responses[0]!.data)
  }
  const canonical = await api.request('/api/works', {
    method: 'POST', cookie, key,
    body: { config: Object.fromEntries(Object.entries(workInput.config).reverse()), description: workInput.description, title: ` ${workInput.title} ` },
  })
  assert.equal(canonical.status, 201)
  assert.deepEqual(canonical.data, responses[0]!.data)
  assert.equal((await api.request('/api/works', { cookie })).data.pagination.total, 1)
  const db = new DatabaseSync(api.dbPath)
  try { assert.equal(db.prepare('SELECT count(*) AS n FROM mutation_journal').get()!.n, 1) } finally { db.close() }
  await api.restart()
  const replay = await api.request('/api/works', { method: 'POST', cookie, key, body: workInput })
  assert.equal(replay.status, 201)
  assert.deepEqual(replay.data, responses[0]!.data)
})

test('PUT replay after later edits and restart returns the original snapshot without another increment', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const source = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  const path = `/api/works/${source.id}`
  const key = randomUUID()
  const body = { ...workInput, title: '第一次更新', version: 1 }
  const first = await api.request(path, { method: 'PUT', cookie, key, body })
  assert.equal(first.status, 200)
  assert.equal(first.data.work.version, 2)
  const newer = await api.request(path, { method: 'PUT', cookie, key: randomUUID(), body: { ...workInput, title: '后续更新', version: 2 } })
  assert.equal(newer.status, 200)
  await api.restart()
  const replay = await api.request(path, { method: 'PUT', cookie, key, body })
  assert.equal(replay.status, 200)
  assert.deepEqual(replay.data, first.data)
  assert.equal((await api.request(path, { cookie })).data.work.version, 3)
  const changed = await api.request(path, { method: 'PUT', cookie, key, body: { ...body, version: 3 } })
  assert.equal(changed.status, 409)
  assert.equal(changed.data.error.code, 'IDEMPOTENCY_CONFLICT')
})

test('duplicate, trash and restore replay their original snapshots even after the source changes state', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const source = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  const records: Array<{ path: string; key: string; body: { version: number }; result: unknown; status: number }> = []
  for (const [operation, version, status] of [['duplicate', 1, 201], ['trash', 1, 200], ['restore', 2, 200]] as const) {
    const path = `/api/works/${source.id}/${operation}`
    const key = randomUUID()
    const body = { version }
    const response = await api.request(path, { method: 'POST', cookie, key, body })
    assert.equal(response.status, status)
    records.push({ path, key, body, result: response.data, status })
  }
  await api.restart()
  for (const record of records) {
    const response = await api.request(record.path, { method: 'POST', cookie, key: record.key, body: record.body })
    assert.equal(response.status, record.status)
    assert.deepEqual(response.data, record.result)
  }
  assert.equal((await api.request('/api/works', { cookie })).data.pagination.total, 2)
  assert.equal((await api.request(`/api/works/${source.id}`, { cookie })).data.work.version, 3)
})

test('same-key different payload, path or method conflicts, and keys are isolated by authenticated owner', async (t) => {
  const api = await workFixture(t)
  const alice = await api.signup()
  const bob = await api.signup('second')
  const key = randomUUID()
  const created = await api.request('/api/works', { method: 'POST', cookie: alice, key, body: workInput })
  assert.equal(created.status, 201)
  const other = await api.request('/api/works', { method: 'POST', cookie: bob, key, body: workInput })
  assert.equal(other.status, 201)
  assert.notEqual(other.data.work.id, created.data.work.id)
  const id = created.data.work.id
  for (const [path, method, body] of [
    ['/api/works', 'POST', { ...workInput, title: '另一内容' }],
    [`/api/works/${id}/duplicate`, 'POST', { version: 1 }],
    [`/api/works/${id}`, 'PUT', { ...workInput, version: 1 }],
  ] as const) {
    const response = await api.request(path, { method, cookie: alice, key, body })
    assert.equal(response.status, 409)
    assert.equal(response.data.error.code, 'IDEMPOTENCY_CONFLICT')
  }
  assert.equal((await api.request('/api/works', { method: 'POST', key, body: workInput })).status, 401)
  assert.equal((await api.request(`/api/works/${id}/trash`, { method: 'POST', cookie: bob, key: randomUUID(), body: { version: 1 } })).status, 404)
})

test('invalid keys and failed validation/state requests do not reserve a key or modify works', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  for (const key of ['', 'not-a-uuid', 'x'.repeat(100), `${randomUUID()}, ${randomUUID()}`]) {
    const response = await api.request('/api/works', { method: 'POST', cookie, key, body: workInput })
    assert.equal(response.status, 400)
    assert.equal(response.data.error.code, 'INVALID_IDEMPOTENCY_KEY')
  }
  const key = randomUUID()
  assert.equal((await api.request('/api/works', { method: 'POST', cookie, key, body: { ...workInput, title: '' } })).status, 400)
  const created = await api.request('/api/works', { method: 'POST', cookie, key, body: workInput })
  assert.equal(created.status, 201)
  const retryKey = randomUUID()
  const path = `/api/works/${created.data.work.id}`
  assert.equal((await api.request(path, { method: 'PUT', cookie, key: retryKey, body: { ...workInput, version: 3 } })).status, 409)
  const corrected = await api.request(path, { method: 'PUT', cookie, key: retryKey, body: { ...workInput, version: 1 } })
  assert.equal(corrected.status, 200)
  const db = new DatabaseSync(api.dbPath)
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM works').get()!.n, 1)
    assert.equal(db.prepare('SELECT count(*) AS n FROM mutation_journal').get()!.n, 2)
  } finally { db.close() }
})

test('journal failure rolls back business mutations and leaves the key available for a later attempt', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const key = randomUUID()
  const db = new DatabaseSync(api.dbPath)
  try {
    db.exec("CREATE TRIGGER journal_failure BEFORE INSERT ON mutation_journal BEGIN SELECT RAISE(ABORT, 'test journal failure'); END;")
    const failed = await api.request('/api/works', { method: 'POST', cookie, key, body: workInput })
    assert.equal(failed.status, 500)
    assert.equal(db.prepare('SELECT count(*) AS n FROM works').get()!.n, 0)
    assert.equal(db.prepare('SELECT count(*) AS n FROM mutation_journal').get()!.n, 0)
    db.exec('DROP TRIGGER journal_failure')
    const success = await api.request('/api/works', { method: 'POST', cookie, key, body: workInput })
    assert.equal(success.status, 201)
    assert.equal(db.prepare('SELECT count(*) AS n FROM works').get()!.n, 1)
    assert.equal(db.prepare('SELECT count(*) AS n FROM mutation_journal').get()!.n, 1)
    db.exec("CREATE TRIGGER journal_failure BEFORE INSERT ON mutation_journal BEGIN SELECT RAISE(ABORT, 'test journal failure'); END;")
    const workId = success.data.work.id
    const failedUpdate = await api.request(`/api/works/${workId}`, {
      method: 'PUT', cookie, key: randomUUID(), body: { ...workInput, title: '不应提交', version: 1 },
    })
    assert.equal(failedUpdate.status, 500)
    const failedTrash = await api.request(`/api/works/${workId}/trash`, {
      method: 'POST', cookie, key: randomUUID(), body: { version: 1 },
    })
    assert.equal(failedTrash.status, 500)
    const remaining = db.prepare('SELECT title, version, deleted_at FROM works WHERE id = ?').get(workId)!
    assert.equal(remaining.title, workInput.title)
    assert.equal(remaining.version, 1)
    assert.equal(remaining.deleted_at, null)
    assert.equal(db.prepare('SELECT count(*) AS n FROM mutation_journal').get()!.n, 1)
    db.exec('DROP TRIGGER journal_failure')
  } finally { db.close() }
})
