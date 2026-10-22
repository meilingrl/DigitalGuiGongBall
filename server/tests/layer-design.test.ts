import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { workFixture, workInput } from './work-fixture.js'

const config = {
  ...workInput.config, schemaVersion: 2 as const,
  layerPatterns: {
    outer: { templateId: 'lianhua' as const, patternScale: 10, aperture: .7 },
    inner: { templateId: 'ruyi' as const, patternScale: 20, aperture: .4 },
  },
}
const body = { ...workInput, config, inspirationId: 'digital-heritage' }

test('v2 roles survive real HTTP create, update, database reopen, duplicate and list', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const created = await api.request('/api/works', { method: 'POST', cookie, body })
  assert.equal(created.status, 201)
  assert.deepEqual(created.data.work.config, config)
  const path = `/api/works/${created.data.work.id}`
  assert.deepEqual((await api.request(path, { cookie })).data.work.config, config)
  const updatedConfig = { ...config, layers: 6, layerPatterns: { ...config.layerPatterns, inner: { templateId: 'linglong', patternScale: 24, aperture: .8 } } }
  const updated = await api.request(path, { method: 'PUT', cookie, body: { ...body, config: updatedConfig, version: 1 } })
  assert.equal(updated.status, 200)
  assert.deepEqual(updated.data.work.config, updatedConfig)
  await api.restart()
  assert.deepEqual((await api.request(path, { cookie })).data.work, updated.data.work)
  const copied = await api.request(`${path}/duplicate`, { method: 'POST', cookie, body: { version: 2 } })
  assert.equal(copied.status, 201)
  assert.notEqual(copied.data.work.id, created.data.work.id)
  assert.deepEqual(copied.data.work.config, updatedConfig)
  assert.equal(copied.data.work.inspirationId, 'digital-heritage')
  const listed = await api.request('/api/works', { cookie })
  assert.equal(listed.data.pagination.total, 2)
  for (const work of listed.data.works) {
    assert.deepEqual(work.config, updatedConfig)
    assert.equal(work.inspirationId, 'digital-heritage')
  }
})

test('v2 read and write require ownership and invalid updates leave the exact record intact', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const otherCookie = await api.signup('other')
  const created = await api.request('/api/works', { method: 'POST', cookie, body })
  assert.equal(created.status, 201)
  const path = `/api/works/${created.data.work.id}`
  for (const [visitor, status] of [[undefined, 401], [otherCookie, 404]] as const) {
    assert.equal((await api.request(path, { cookie: visitor })).status, status)
    assert.equal((await api.request(path, { method: 'PUT', cookie: visitor, body: { ...body, version: 1 } })).status, status)
    assert.equal((await api.request(`${path}/duplicate`, { method: 'POST', cookie: visitor, body: { version: 1 } })).status, status)
  }
  assert.equal((await api.request('/api/works', { method: 'POST', body })).status, 401)
  for (const invalid of [
    { ...config, layerPatterns: { outer: config.layerPatterns.outer } },
    { ...config, layerPatterns: { ...config.layerPatterns, inner: { ...config.layerPatterns.inner, aperture: .9 } } },
    { ...config, layerPatterns: { ...config.layerPatterns, middle: config.layerPatterns.inner } },
    { ...config, schemaVersion: 3 },
  ]) {
    assert.equal((await api.request(path, { method: 'PUT', cookie, body: { ...body, config: invalid, version: 1 } })).status, 400)
    assert.deepEqual((await api.request(path, { cookie })).data.work, created.data.work)
  }
  assert.equal((await api.request('/api/works', { cookie: otherCookie })).data.pagination.total, 0)
})

test('v1 and v2 journal replay coexist after restart, and a changed inner role conflicts', async (t) => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const oldKey = randomUUID()
  const old = await api.request('/api/works', { method: 'POST', cookie, key: oldKey, body: workInput })
  assert.equal(old.status, 201)
  assert.deepEqual(old.data.work.config, workInput.config)
  const key = randomUUID()
  const created = await api.request('/api/works', { method: 'POST', cookie, key, body })
  assert.equal(created.status, 201)
  await api.restart()
  assert.deepEqual((await api.request('/api/works', { method: 'POST', cookie, key: oldKey, body: workInput })).data, old.data)
  const replay = await api.request('/api/works', { method: 'POST', cookie, key, body })
  assert.equal(replay.status, 201)
  assert.deepEqual(replay.data, created.data)
  const conflict = await api.request('/api/works', { method: 'POST', cookie, key, body: { ...body, config: { ...config, layerPatterns: { ...config.layerPatterns, inner: { ...config.layerPatterns.inner, patternScale: 22 } } } } })
  assert.equal(conflict.status, 409)
  assert.equal(conflict.data.error.code, 'IDEMPOTENCY_CONFLICT')
  assert.deepEqual((await api.request(`/api/works/${created.data.work.id}`, { cookie })).data, created.data)
  assert.equal((await api.request('/api/works', { cookie })).data.pagination.total, 2)
})
