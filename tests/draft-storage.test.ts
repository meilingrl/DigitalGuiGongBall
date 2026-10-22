import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
import { defaultConfigs } from '../shared/design.js'
import { listDrafts, readDraft, removeDraft, writeDraft, type DraftRecord, type PendingSave, type StorageLike } from '../src/lib/drafts.js'

const now = 1_792_108_800_000
const day = 24 * 60 * 60 * 1000
const requestKey = '31ad5481-6fb8-4ba1-b765-fce9fd1ca6f1'
const keyFor = (userId: string, target: string) => `guigong:drafts:v1:${encodeURIComponent(userId)}:${encodeURIComponent(target)}`

// Web Storage is external I/O. This in-memory adapter retains real JSON strings,
// account-scoped enumeration and failure behavior without requiring a browser.
class MemoryStorage implements StorageLike {
  values = new Map<string, string>()
  reads: string[] = []
  removals: string[] = []
  fail: 'get' | 'set' | 'remove' | 'key' | 'length' | null = null
  quota = Infinity
  get length() { if (this.fail === 'length') throw new Error('disabled'); return this.values.size }
  key(index: number) { if (this.fail === 'key') throw new Error('disabled'); return [...this.values.keys()][index] ?? null }
  getItem(key: string) { this.reads.push(key); if (this.fail === 'get') throw new Error('disabled'); return this.values.get(key) ?? null }
  setItem(key: string, value: string) {
    if (this.fail === 'set' || new TextEncoder().encode(value).length > this.quota) throw new Error('quota exceeded')
    this.values.set(key, value)
  }
  removeItem(key: string) { this.removals.push(key); if (this.fail === 'remove') throw new Error('disabled'); this.values.delete(key) }
}

function draft(overrides: Partial<DraftRecord> = {}): DraftRecord {
  return {
    schemaVersion: 1, userId: 'alice', target: 'new:linglong', title: '我的创作', description: '',
    config: { ...defaultConfigs.linglong }, baseVersion: null, updatedAt: now, pendingSave: null,
    ...overrides,
  }
}

function pending(method: 'POST' | 'PUT' = 'POST'): PendingSave {
  const body = { title: '提交时的标题', description: '原始请求', config: { ...defaultConfigs.linglong } }
  return {
    key: requestKey, method, path: method === 'POST' ? '/api/works' : '/api/works/demo-linglong',
    body: method === 'POST' ? body : { ...body, version: 3 }, snapshot: JSON.stringify(body),
  }
}

function putRaw(storage: MemoryStorage, value: unknown, userId = 'alice', target = 'new:linglong') {
  storage.values.set(keyFor(userId, target), JSON.stringify(value))
}

test('writes real JSON and restores a separate plain config including temporarily empty titles', () => {
  const storage = new MemoryStorage()
  const original = reactive(draft({ title: '' }))
  assert.deepEqual(writeDraft(storage, original, now), { ok: true })
  const saved = storage.values.get(keyFor('alice', 'new:linglong'))!
  assert.equal(JSON.parse(saved).title, '')
  original.config.layers = 6
  const restored = readDraft(storage, 'alice', 'new:linglong', now)
  assert.equal(restored.draft!.config.layers, 4)
  assert.equal(restored.draft!.title, '')
  assert.equal(restored.notice, undefined)
  assert.doesNotThrow(() => structuredClone(restored.draft))
  restored.draft!.config.material = 'jade'
  assert.equal(readDraft(storage, 'alice', 'new:linglong', now).draft!.config.material, 'ivory')
})

test('missing keys are ordinary and account namespace components cannot collide', () => {
  const storage = new MemoryStorage()
  assert.deepEqual(readDraft(storage, 'alice', 'new:linglong', now), { draft: null })
  assert.deepEqual(listDrafts(storage, 'alice', now), { drafts: [] })
  const first = draft({ userId: 'a:b', title: 'first' })
  const second = draft({ userId: 'a%3Ab', title: 'second' })
  assert.equal(writeDraft(storage, first, now).ok, true)
  assert.equal(writeDraft(storage, second, now).ok, true)
  assert.equal(readDraft(storage, first.userId, first.target, now).draft!.title, 'first')
  assert.equal(readDraft(storage, second.userId, second.target, now).draft!.title, 'second')
})

test('listing and pruning inspect only the selected account and preserve unrelated storage', () => {
  const storage = new MemoryStorage()
  putRaw(storage, draft({ target: 'work:demo-linglong', baseVersion: 2 }), 'alice', 'work:demo-linglong')
  const bobKey = keyFor('bob', 'new:linglong')
  storage.values.set(bobKey, 'invalid foreign JSON')
  storage.values.set('guigong:theme', 'dark')
  storage.reads = []
  const result = listDrafts(storage, 'alice', now)
  assert.deepEqual(result.drafts.map(item => item.target), ['work:demo-linglong'])
  assert.ok(storage.reads.every(key => key.startsWith('guigong:drafts:v1:alice:')))
  assert.equal(storage.values.get(bobKey), 'invalid foreign JSON')
  assert.equal(storage.values.get('guigong:theme'), 'dark')
})

for (const [name, value] of [
  ['unknown record fields', { ...draft(), password: 'must never persist' }],
  ['foreign owner', draft({ userId: 'bob' })],
  ['wrong target', draft({ target: 'new:ruyi' })],
  ['unknown schema', { ...draft(), schemaVersion: 2 }],
  ['invalid config', { ...draft(), config: { ...defaultConfigs.linglong, activeLayer: 6 } }],
  ['extra config fields', { ...draft(), config: { ...defaultConfigs.linglong, token: 'no' } }],
  ['long title', draft({ title: 'x'.repeat(81) })],
  ['long description', draft({ description: 'x'.repeat(1001) })],
  ['invalid timestamp', draft({ updatedAt: Number.NaN })],
  ['invalid base version', draft({ baseVersion: 0 })],
] as const) {
  test(`ignores and removes an owned record with ${name}`, () => {
    const storage = new MemoryStorage()
    putRaw(storage, value)
    const result = readDraft(storage, 'alice', 'new:linglong', now)
    assert.equal(result.draft, null)
    assert.ok(result.notice)
    assert.equal(storage.values.has(keyFor('alice', 'new:linglong')), false)
  })
}

test('corrupt JSON and noncanonical owned keys are pruned without decoding foreign namespaces', () => {
  const storage = new MemoryStorage()
  storage.values.set(keyFor('alice', 'new:linglong'), '{')
  storage.values.set('guigong:drafts:v1:alice:%XX', JSON.stringify(draft()))
  storage.values.set('guigong:drafts:v1:alice:new%3alinglong', JSON.stringify(draft()))
  storage.values.set('guigong:drafts:v1:alice:work%3A..%2Fbob', JSON.stringify(draft()))
  storage.values.set('guigong:drafts:v1:bob:%XX', 'private')
  const result = listDrafts(storage, 'alice', now)
  assert.deepEqual(result.drafts, [])
  assert.ok(result.notice)
  assert.deepEqual([...storage.values.keys()], ['guigong:drafts:v1:bob:%XX'])
})

test('expires at seven days and bounds future timestamps while retaining a small clock skew', () => {
  const storage = new MemoryStorage()
  putRaw(storage, draft({ updatedAt: now - 7 * day }))
  assert.equal(readDraft(storage, 'alice', 'new:linglong', now).draft, null)
  assert.equal(storage.values.size, 0)
  putRaw(storage, draft({ updatedAt: now - 7 * day + 1 }))
  assert.ok(readDraft(storage, 'alice', 'new:linglong', now).draft)
  putRaw(storage, draft({ updatedAt: now + 5 * 60 * 1000 }))
  assert.ok(readDraft(storage, 'alice', 'new:linglong', now).draft)
  putRaw(storage, draft({ updatedAt: now + 5 * 60 * 1000 + 1 }))
  assert.equal(readDraft(storage, 'alice', 'new:linglong', now).draft, null)
})

test('write prunes expired current-user drafts without touching other accounts', () => {
  const storage = new MemoryStorage()
  putRaw(storage, draft({ target: 'new:ruyi', updatedAt: now - 8 * day }), 'alice', 'new:ruyi')
  putRaw(storage, draft({ userId: 'bob', updatedAt: now - 8 * day }), 'bob')
  assert.equal(writeDraft(storage, draft(), now).ok, true)
  assert.deepEqual(listDrafts(storage, 'alice', now).drafts.map(item => item.target), ['new:linglong'])
  assert.ok(storage.values.has(keyFor('bob', 'new:linglong')))
})

test('retains at most twenty records and evicts the oldest own target deterministically', () => {
  const storage = new MemoryStorage()
  putRaw(storage, draft({ userId: 'bob' }), 'bob')
  for (let index = 0; index < 21; index++) {
    const current = now + index
    assert.equal(writeDraft(storage, draft({ target: `work:item-${String(index).padStart(2, '0')}`, baseVersion: 1, updatedAt: current }), current).ok, true)
  }
  const result = listDrafts(storage, 'alice', now + 21)
  assert.equal(result.drafts.length, 20)
  assert.equal(readDraft(storage, 'alice', 'work:item-00', now + 21).draft, null)
  assert.ok(readDraft(storage, 'alice', 'work:item-20', now + 21).draft)
  assert.equal(storage.values.size, 21)
  assert.ok(storage.values.has(keyFor('bob', 'new:linglong')))
})

test('equal timestamps use the target name to select an oldest draft independently of insertion order', () => {
  const storage = new MemoryStorage()
  for (let index = 19; index >= 0; index--) putRaw(storage, draft({ target: `work:item-${String(index).padStart(2, '0')}`, baseVersion: 1 }), 'alice', `work:item-${String(index).padStart(2, '0')}`)
  assert.equal(writeDraft(storage, draft({ target: 'work:newest', baseVersion: 1, updatedAt: now + 1 }), now + 1).ok, true)
  assert.equal(storage.values.has(keyFor('alice', 'work:item-00')), false)
  assert.ok(storage.values.has(keyFor('alice', 'work:item-19')))
})

test('updating an existing target does not evict a different record at the twenty-record limit', () => {
  const storage = new MemoryStorage()
  for (let index = 0; index < 20; index++) putRaw(storage, draft({ target: `work:item-${index}`, baseVersion: 1 }), 'alice', `work:item-${index}`)
  assert.equal(writeDraft(storage, draft({ target: 'work:item-0', baseVersion: 1, title: 'revised', updatedAt: now + 1 }), now + 1).ok, true)
  assert.equal(listDrafts(storage, 'alice', now + 1).drafts.length, 20)
  assert.equal(readDraft(storage, 'alice', 'work:item-0', now + 1).draft!.title, 'revised')
})

test('pending POST keeps its original key, payload and snapshot while later edits survive a reload', () => {
  const storage = new MemoryStorage()
  const request = pending()
  const current = draft({ title: '提交期间的新标题', description: '继续编辑', config: { ...defaultConfigs.linglong, material: 'jade' }, pendingSave: request })
  assert.equal(writeDraft(storage, current, now).ok, true)
  request.body.title = 'outside mutation'
  const result = readDraft(storage, 'alice', 'new:linglong', now).draft!
  assert.equal(result.title, '提交期间的新标题')
  assert.equal(result.description, '继续编辑')
  assert.equal(result.config.material, 'jade')
  assert.deepEqual(result.pendingSave, pending())
  assert.equal(result.pendingSave!.key, requestKey)
})

test('pending PUT restores a legacy demo resource with its exact positive request version', () => {
  const storage = new MemoryStorage()
  const current = draft({ target: 'work:demo-linglong', baseVersion: 3, pendingSave: pending('PUT') })
  assert.equal(writeDraft(storage, current, now).ok, true)
  assert.deepEqual(readDraft(storage, 'alice', current.target, now).draft!.pendingSave, pending('PUT'))
})

for (const [name, change, target] of [
  ['non-UUID key', { key: 'not-an-idempotency-key' }, 'new:linglong'],
  ['foreign path', { path: '/api/works/other-user' }, 'new:linglong'],
  ['absolute path', { path: 'https://example.com/api/works' }, 'new:linglong'],
  ['POST under a work target', {}, 'work:demo-linglong'],
  ['PUT under a new target', pending('PUT'), 'new:linglong'],
  ['unknown metadata', { headers: { Cookie: 'forbidden' } }, 'new:linglong'],
  ['version on POST', { body: { ...pending().body, version: 1 } }, 'new:linglong'],
  ['empty request title', { body: { ...pending().body, title: ' ' } }, 'new:linglong'],
  ['unknown request field', { body: { ...pending().body, token: 'forbidden' } }, 'new:linglong'],
  ['invalid snapshot JSON', { snapshot: '{' }, 'new:linglong'],
  ['unknown snapshot field', { snapshot: JSON.stringify({ ...pending().body, password: 'forbidden' }) }, 'new:linglong'],
  ['snapshot that differs from request', { snapshot: JSON.stringify({ ...pending().body, title: 'not sent' }) }, 'new:linglong'],
] as const) {
  test(`rejects pending save with ${name} before persisting it`, () => {
    const storage = new MemoryStorage()
    const candidate = draft({ target, pendingSave: { ...pending(), ...change } as PendingSave })
    const result = writeDraft(storage, candidate, now)
    assert.equal(result.ok, false)
    assert.ok(result.notice)
    assert.equal(storage.values.size, 0)
  })
}

for (const body of [
  { title: 'title', description: '', config: defaultConfigs.linglong },
  { title: 'title', description: '', config: defaultConfigs.linglong, version: 0 },
]) {
  test(`rejects PUT without a positive version (${String('version' in body ? body.version : 'missing')})`, () => {
    const storage = new MemoryStorage()
    const result = writeDraft(storage, draft({ target: 'work:demo-linglong', baseVersion: 3, pendingSave: { ...pending('PUT'), body } }), now)
    assert.equal(result.ok, false)
    assert.ok(result.notice)
    assert.equal(storage.values.size, 0)
  })
}

test('pending snapshot preserves editor whitespace while matching the normalized request', () => {
  const storage = new MemoryStorage()
  const request = pending()
  request.snapshot = JSON.stringify({ ...request.body, title: `  ${request.body.title}  `, description: `  ${request.body.description}  ` })
  assert.equal(writeDraft(storage, draft({ pendingSave: request }), now).ok, true)
  assert.equal(readDraft(storage, 'alice', 'new:linglong', now).draft!.pendingSave!.snapshot, request.snapshot)
})

test('checks UTF-8 byte size before parsing and removes an oversized stored record', () => {
  const storage = new MemoryStorage()
  const encoded = JSON.stringify(draft({ description: '中'.repeat(1000) })) + ' '.repeat(13_600)
  assert.ok(encoded.length < 16 * 1024)
  assert.ok(new TextEncoder().encode(encoded).length > 16 * 1024)
  storage.values.set(keyFor('alice', 'new:linglong'), encoded)
  const result = readDraft(storage, 'alice', 'new:linglong', now)
  assert.equal(result.draft, null)
  assert.ok(result.notice)
  assert.equal(storage.values.size, 0)
})

test('rejects an oversized serialized record even when all individual fields are in bounds', () => {
  const storage = new MemoryStorage()
  const body = { title: 'title', description: '\u0001'.repeat(1000), config: { ...defaultConfigs.linglong } }
  const value = draft({ description: body.description, pendingSave: { ...pending(), body, snapshot: JSON.stringify(body) } })
  assert.ok(new TextEncoder().encode(JSON.stringify(value)).length > 16 * 1024)
  const result = writeDraft(storage, value, now)
  assert.equal(result.ok, false)
  assert.ok(result.notice)
  assert.equal(storage.values.size, 0)
})

test('quota failure is reported and does not erase the previous recoverable target', () => {
  const storage = new MemoryStorage()
  assert.equal(writeDraft(storage, draft(), now).ok, true)
  storage.quota = 10
  const result = writeDraft(storage, draft({ title: 'failed replacement', updatedAt: now + 1 }), now + 1)
  assert.equal(result.ok, false)
  assert.ok(result.notice)
  assert.equal(readDraft(storage, 'alice', 'new:linglong', now + 1).draft!.title, '我的创作')
})

test('absent storage returns explicit notices for every operation', () => {
  assert.ok(readDraft(undefined, 'alice', 'new:linglong', now).notice)
  assert.ok(listDrafts(undefined, 'alice', now).notice)
  assert.deepEqual(writeDraft(undefined, draft(), now).ok, false)
  assert.ok(writeDraft(undefined, draft(), now).notice)
  assert.equal(removeDraft(undefined, 'alice', 'new:linglong').ok, false)
  assert.ok(removeDraft(undefined, 'alice', 'new:linglong').notice)
})

for (const failure of ['get', 'key', 'length', 'remove'] as const) {
  test(`reports storage ${failure} exceptions without throwing or claiming a full write`, () => {
    const storage = new MemoryStorage()
    putRaw(storage, draft({ updatedAt: now - 8 * day }))
    storage.fail = failure
    assert.doesNotThrow(() => listDrafts(storage, 'alice', now))
    assert.ok(listDrafts(storage, 'alice', now).notice)
    const result = writeDraft(storage, draft({ target: 'new:ruyi' }), now)
    assert.equal(result.ok, false)
    assert.ok(result.notice)
  })
}

test('read and removal report security exceptions, while valid removal is narrowly scoped', () => {
  const storage = new MemoryStorage()
  putRaw(storage, draft())
  putRaw(storage, draft({ userId: 'bob' }), 'bob')
  storage.fail = 'get'
  assert.equal(readDraft(storage, 'alice', 'new:linglong', now).draft, null)
  assert.ok(readDraft(storage, 'alice', 'new:linglong', now).notice)
  storage.fail = 'remove'
  assert.equal(removeDraft(storage, 'alice', 'new:linglong').ok, false)
  assert.ok(removeDraft(storage, 'alice', 'new:linglong').notice)
  storage.fail = null
  assert.deepEqual(removeDraft(storage, 'alice', 'new:linglong'), { ok: true })
  assert.equal(readDraft(storage, 'alice', 'new:linglong', now).draft, null)
  assert.equal(readDraft(storage, 'bob', 'new:linglong', now).draft!.userId, 'bob')
})

test('rejects unsafe identities and targets without touching any storage entries', () => {
  const storage = new MemoryStorage()
  putRaw(storage, draft())
  for (const target of ['', 'new:invalid', 'work:', 'work:../bob', 'work:demo?cookie=secret']) {
    assert.equal(writeDraft(storage, draft({ target }), now).ok, false)
    assert.equal(readDraft(storage, 'alice', target, now).draft, null)
    assert.equal(removeDraft(storage, 'alice', target).ok, false)
  }
  assert.equal(writeDraft(storage, draft({ userId: '' }), now).ok, false)
  assert.deepEqual(listDrafts(storage, '', now).drafts, [])
  assert.equal(storage.reads.length, 0)
  assert.equal(storage.removals.length, 0)
  assert.equal(storage.values.size, 1)
})

test('runtime missing targets cannot read or remove an arbitrary owned key', () => {
  const storage = new MemoryStorage()
  storage.values.set('guigong:drafts:v1:alice:undefined', 'unrelated')
  const target = undefined as unknown as string
  assert.equal(readDraft(storage, 'alice', target, now).draft, null)
  assert.equal(removeDraft(storage, 'alice', target).ok, false)
  assert.equal(storage.reads.length, 0)
  assert.equal(storage.removals.length, 0)
  assert.equal(storage.values.get('guigong:drafts:v1:alice:undefined'), 'unrelated')
})

test('rejects trailing newlines in identities and targets before accessing storage', () => {
  const storage = new MemoryStorage()
  for (const candidate of [draft({ target: 'new:linglong\n' }), draft({ userId: 'alice\n' })]) {
    assert.equal(writeDraft(storage, candidate, now).ok, false)
    assert.equal(removeDraft(storage, candidate.userId, candidate.target).ok, false)
    assert.equal(readDraft(storage, candidate.userId, candidate.target, now).draft, null)
  }
  assert.equal(storage.values.size, 0)
  assert.equal(storage.reads.length, 0)
  assert.equal(storage.removals.length, 0)
})

test('v2 edits and pending v1 or v2 payloads retain separate complete configs through storage', () => {
  const config = {
    ...defaultConfigs.linglong, schemaVersion: 2 as const,
    layerPatterns: {
      outer: { templateId: 'lianhua' as const, patternScale: 10, aperture: .7 },
      inner: { templateId: 'ruyi' as const, patternScale: 20, aperture: .4 },
    },
  }
  for (const sentConfig of [defaultConfigs.linglong, config]) {
    const storage = new MemoryStorage()
    const body = { title: '待重放', description: '', config: sentConfig }
    const request: PendingSave = { ...pending(), body, snapshot: JSON.stringify(body) }
    const originalRequest = JSON.stringify(request)
    const current = reactive(draft({ config: { ...config, layerPatterns: { outer: { ...config.layerPatterns.outer }, inner: { ...config.layerPatterns.inner, patternScale: 22 } } }, pendingSave: request }))
    assert.equal(writeDraft(storage, current, now).ok, true)
    current.config.material = 'bronze'
    if (current.config.schemaVersion === 2) current.config.layerPatterns.outer.aperture = .8
    const restored = readDraft(storage, 'alice', current.target, now).draft!
    assert.deepEqual(restored.config, { ...config, layerPatterns: { outer: config.layerPatterns.outer, inner: { ...config.layerPatterns.inner, patternScale: 22 } } })
    assert.deepEqual(restored.pendingSave, JSON.parse(originalRequest))
    assert.equal(JSON.stringify(restored.pendingSave!.body.config), JSON.stringify(sentConfig))
    assert.doesNotThrow(() => structuredClone(restored))
  }
})
