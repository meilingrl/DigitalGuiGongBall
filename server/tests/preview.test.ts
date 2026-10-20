import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { deflateSync } from 'node:zlib'
import { workFixture, workInput } from './work-fixture.js'
import { createWorkSchema, updateWorkSchema } from '../validation.js'

// Generate an actual decodable RGBA PNG, including CRCs, without image libraries.
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(name: string, bytes: Buffer): Buffer {
  const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length)
  const payload = Buffer.concat([Buffer.from(name), bytes])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(payload))
  return Buffer.concat([length, payload, crc])
}
function png(width = 1, height = 1, extra?: Buffer): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr),
    ...(extra ? [chunk('tEXt', Buffer.concat([Buffer.from('Comment\0'), extra]))] : []),
    chunk('IDAT', deflateSync(Buffer.alloc((width * 4 + 1) * height))), chunk('IEND', Buffer.alloc(0)),
  ])
}
const imageDataUrl = (bytes = png()) => `data:image/png;base64,${bytes.toString('base64')}`

// Omitting inspirationId must not change old parsed request hashes.
test('inspiration metadata stays optional in mutation input and is validated independently from config v1', () => {
  assert.deepEqual(createWorkSchema.parse(workInput), workInput)
  assert.deepEqual(updateWorkSchema.parse({ ...workInput, version: 1 }), { ...workInput, version: 1 })
  assert.equal(createWorkSchema.safeParse({ ...workInput, inspirationId: 'nested-structure' }).success, true)
  assert.equal(createWorkSchema.safeParse({ ...workInput, inspirationId: null }).success, true)
  assert.equal(createWorkSchema.safeParse({ ...workInput, inspirationId: 'invented' }).success, false)
})

test('real PNG and inspiration persist across restart, expose private bytes only for current owner and version', async t => {
  const api = await workFixture(t)
  const cookie = await api.signup()
  const created = await api.request('/api/works', { method: 'POST', cookie, body: { ...workInput, inspirationId: 'nested-structure' } })
  assert.equal(created.status, 201)
  const work = created.data.work
  assert.equal(work.inspirationId, 'nested-structure'); assert.equal(work.previewVersion, null)
  const path = `/api/works/${work.id}/preview`
  const large = png(1, 1, Buffer.alloc(20000, 65))
  const uploaded = await api.request(path, { method: 'PUT', cookie, body: { version: 1, imageDataUrl: imageDataUrl(large) } })
  assert.equal(uploaded.status, 200, 'preview uses its larger route limit')
  assert.equal(uploaded.data.work.version, 1); assert.equal(uploaded.data.work.previewVersion, 1)
  assert.equal(uploaded.data.work.updatedAt, work.updatedAt)
  await api.restart()
  const get = await api.rawRequest(`${path}?version=1`, { cookie })
  assert.equal(get.status, 200); assert.equal(get.headers.get('content-type'), 'image/png')
  assert.equal(get.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(Buffer.from(await get.arrayBuffer()), large)
  assert.equal((await api.request('/api/works', { cookie })).data.works[0].previewVersion, 1)
  assert.equal((await api.request(`/api/works/${work.id}`, { cookie })).data.work.inspirationId, 'nested-structure')
  const bob = await api.signup('second')
  for (const foreign of [undefined, bob]) {
    assert.equal((await api.rawRequest(`${path}?version=1`, { cookie: foreign })).status, foreign ? 404 : 401)
    assert.equal((await api.request(path, { method: 'PUT', cookie: foreign, body: { version: 1, imageDataUrl: imageDataUrl() } })).status, foreign ? 404 : 401)
  }
  for (const method of ['GET', 'PUT']) {
    const response = await api.rawRequest(`${path}${method === 'GET' ? '?version=1' : ''}`, {
      method, cookie, expectedUserId: 'wrong-account', ...(method === 'PUT' ? { body: { version: 1, imageDataUrl: imageDataUrl() } } : {}),
    })
    assert.equal(response.status, 401)
  }
})

test('updates invalidate current preview; duplication and trash/restore preserve only valid versioned bytes', async t => {
  const api = await workFixture(t); const cookie = await api.signup()
  const work = (await api.request('/api/works', { method: 'POST', cookie, body: { ...workInput, inspirationId: 'openwork-rhythm' } })).data.work
  const path = `/api/works/${work.id}`
  const upload = (version: number) => api.request(`${path}/preview`, { method: 'PUT', cookie, body: { version, imageDataUrl: imageDataUrl() } })
  assert.equal((await upload(1)).status, 200)
  const copy = (await api.request(`${path}/duplicate`, { method: 'POST', cookie, body: { version: 1 } })).data.work
  assert.equal(copy.previewVersion, 1); assert.equal(copy.inspirationId, work.inspirationId)
  const copiedImage = await api.rawRequest(`/api/works/${copy.id}/preview?version=1`, { cookie })
  assert.equal(copiedImage.status, 200)
  assert.deepEqual(Buffer.from(await copiedImage.arrayBuffer()), png())
  const trash = (await api.request(`${path}/trash`, { method: 'POST', cookie, body: { version: 1 } })).data.work
  assert.equal(trash.previewVersion, 2)
  assert.equal((await api.rawRequest(`${path}/preview?version=2`, { cookie })).status, 404)
  const restored = (await api.request(`${path}/restore`, { method: 'POST', cookie, body: { version: 2 } })).data.work
  assert.equal(restored.previewVersion, 3)
  assert.equal((await api.rawRequest(`${path}/preview?version=3`, { cookie })).status, 200)
  const changed = (await api.request(path, { method: 'PUT', cookie, body: { ...workInput, version: 3, config: { ...workInput.config, layers: 5 } } })).data.work
  assert.equal(changed.inspirationId, work.inspirationId, 'old update clients preserve metadata')
  assert.equal(changed.previewVersion, null)
  for (const version of [1, 3, 4]) assert.equal((await api.rawRequest(`${path}/preview?version=${version}`, { cookie })).status, 404)
  assert.equal((await upload(3)).status, 409)
  const staleCopy = (await api.request(`${path}/duplicate`, { method: 'POST', cookie, body: { version: 4 } })).data.work
  assert.equal(staleCopy.previewVersion, null)
  assert.equal((await upload(4)).status, 200)
  const changedSource = await api.request(path, { method: 'PUT', cookie, body: { ...workInput, inspirationId: 'digital-heritage', version: 4 } })
  assert.equal(changedSource.data.work.inspirationId, 'digital-heritage')
  assert.equal((await api.request(path, { method: 'PUT', cookie, body: { ...workInput, inspirationId: null, version: 5 } })).data.work.inspirationId, null)
})

test('PNG boundary rejects malformed, unbounded, noncanonical, corrupt and stale uploads without changing saved preview', async t => {
  const api = await workFixture(t); const cookie = await api.signup()
  const work = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  const path = `/api/works/${work.id}/preview`
  assert.equal(work.inspirationId, null); assert.equal(work.previewVersion, null)
  const original = imageDataUrl()
  assert.equal((await api.request(path, { method: 'PUT', cookie, body: { version: 1, imageDataUrl: original } })).status, 200)
  const corrupt = png(); corrupt[corrupt.length - 1]! ^= 1
  const invalid = [
    'data:image/jpeg;base64,YQ==', original + '\n', original.replace('base64,', 'base64, '),
    imageDataUrl(Buffer.from('not a png')), imageDataUrl(png(1025, 1)), imageDataUrl(png(1, 1025)),
    imageDataUrl(corrupt), imageDataUrl(png().subarray(0, -1)), imageDataUrl(Buffer.concat([png(), Buffer.from('trailing')])),
    imageDataUrl(png(1, 1, Buffer.alloc(256 * 1024))),
    imageDataUrl(Buffer.concat([png().subarray(0, 33), chunk('IDAT', Buffer.from('bad zlib')), chunk('IEND', Buffer.alloc(0))])),
  ]
  for (const value of invalid) {
    const response = await api.request(path, { method: 'PUT', cookie, body: { version: 1, imageDataUrl: value } })
    assert.equal(response.status, 400, value.slice(0, 70))
  }
  assert.equal((await api.request(path, { method: 'PUT', cookie, body: { version: 1, imageDataUrl: 'x'.repeat(384 * 1024) } })).status, 413)
  assert.equal((await api.request('/api/works', { method: 'POST', cookie, body: { ...workInput, description: 'x'.repeat(20000) } })).status, 413, 'other routes retain 16 KiB body ceiling')
  for (const query of ['', '?version=0', '?version=1&version=1', '?version=01', '?version=2', '?version=1&other=x']) {
    assert.equal((await api.rawRequest(path + query, { cookie })).status, query === '?version=2' ? 404 : 400)
  }
  assert.deepEqual(Buffer.from(await (await api.rawRequest(`${path}?version=1`, { cookie })).arrayBuffer()), png())
})

test('PNG chunk names must be actual ASCII letters rather than high-bit lookalikes', async t => {
  const api = await workFixture(t); const cookie = await api.signup()
  const work = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  const idat = chunk('IDAT', deflateSync(Buffer.alloc(5)))
  idat[4] = 0xc9 // Node's ascii decoder masks this to I; PNG forbids the actual byte.
  idat.writeUInt32BE(crc32(idat.subarray(4, -4)), idat.length - 4)
  const malformed = Buffer.concat([png().subarray(0, 33), idat, chunk('IEND', Buffer.alloc(0))])
  const response = await api.request(`/api/works/${work.id}/preview`, { method: 'PUT', cookie, body: { version: 1, imageDataUrl: imageDataUrl(malformed) } })
  assert.equal(response.status, 400)
  assert.equal((await api.request(`/api/works/${work.id}`, { cookie })).data.work.previewVersion, null)
})

test('old journal replay retains its original hash and response snapshot without nullable-field injection', async t => {
  const api = await workFixture(t); const cookie = await api.signup()
  const work = (await api.request('/api/works', { method: 'POST', cookie, body: workInput })).data.work
  const { inspirationId: _source, previewVersion: _preview, ...legacy } = work
  const key = randomUUID()
  const db = new DatabaseSync(api.dbPath)
  try {
    const owner = db.prepare('SELECT owner_id FROM works WHERE id=?').get(work.id)!.owner_id as string
    const canonical = (value: unknown): unknown => value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => [k, canonical(v)])) : value
    db.prepare('INSERT INTO mutation_journal VALUES(?,?,?,?,?,?,?,?)').run(owner, key, 'POST', '/api/works',
      createHash('sha256').update(JSON.stringify(canonical(workInput))).digest('hex'), 201, JSON.stringify({ work: legacy }), new Date().toISOString())
  } finally { db.close() }
  const replay = await api.request('/api/works', { method: 'POST', cookie, key, body: workInput })
  assert.equal(replay.status, 201); assert.deepEqual(replay.data.work, legacy)
  assert.equal((await api.request('/api/works', { cookie })).data.pagination.total, 1)
})
