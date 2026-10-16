import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
import type { StorageLike } from '../src/lib/drafts.js'
import { readPendingAction, removePendingAction, writePendingAction, type PendingAction } from '../src/lib/pending-action.js'

const now = 1_792_108_800_000
const day = 24 * 60 * 60 * 1000
const requestKey = '31ad5481-6fb8-4ba1-b765-fce9fd1ca6f1'
const storageKey = (userId: string) => `guigong:collection-pending:v1:${encodeURIComponent(userId)}`
const attempt = (changes: Partial<PendingAction> = {}): PendingAction => ({ action: 'duplicate', id: 'demo-linglong', title: ' 原始副本名称 ', version: 3, key: requestKey, ...changes })
const record = (changes: Record<string, unknown> = {}) => ({ schemaVersion: 1, userId: 'alice', updatedAt: now, attempt: attempt(), ...changes })

class MemoryStorage implements StorageLike {
  values = new Map<string, string>()
  reads: string[] = []
  removals: string[] = []
  failure: 'get' | 'set' | 'remove' | null = null
  get length(): number { throw new Error('enumeration is unnecessary') }
  key(_index: number): string | null { throw new Error('enumeration is unnecessary') }
  getItem(key: string) { this.reads.push(key); if (this.failure === 'get') throw new Error('blocked'); return this.values.get(key) ?? null }
  setItem(key: string, value: string) { if (this.failure === 'set') throw new Error('quota'); this.values.set(key, value) }
  removeItem(key: string) { this.removals.push(key); if (this.failure === 'remove') throw new Error('blocked'); this.values.delete(key) }
}

test('serializes a pending action and restores its exact key, body and version after reload', () => {
  const storage = new MemoryStorage()
  const original = reactive(attempt())
  assert.deepEqual(writePendingAction(storage, 'alice', original, now), { ok: true })
  assert.deepEqual(JSON.parse(storage.values.get(storageKey('alice'))!), record())
  original.title = 'later change'
  original.version = 9
  const restored = readPendingAction(storage, 'alice', now)
  assert.deepEqual(restored, { attempt: attempt() })
  assert.doesNotThrow(() => structuredClone(restored.attempt))
  restored.attempt!.key = 'outside mutation'
  assert.deepEqual(readPendingAction(storage, 'alice', now), { attempt: attempt() })
})

for (const action of ['duplicate', 'trash', 'restore'] as const) {
  test(`restores ${action} including a UUID resource id`, () => {
    const storage = new MemoryStorage()
    const value = attempt({ action, id: '1551b3d1-1c69-4407-8390-dd9dd5fceabb', version: Number.MAX_SAFE_INTEGER })
    assert.equal(writePendingAction(storage, 'alice', value, now).ok, true)
    assert.deepEqual(readPendingAction(storage, 'alice', now).attempt, value)
  })
}

test('isolates account keys including encoded punctuation without reading other records', () => {
  const storage = new MemoryStorage()
  for (const [userId, title] of [['alice', 'alice copy'], ['bob', 'bob copy'], ['a:b', 'colon'], ['a%3Ab', 'percent']]) {
    assert.equal(writePendingAction(storage, userId!, attempt({ title: title! }), now).ok, true)
  }
  storage.values.set('guigong:theme', 'dark')
  assert.equal(readPendingAction(storage, 'alice', now).attempt!.title, 'alice copy')
  assert.deepEqual(storage.reads, [storageKey('alice')])
  assert.deepEqual(removePendingAction(storage, 'alice'), { ok: true })
  assert.equal(readPendingAction(storage, 'alice', now).attempt, null)
  assert.equal(readPendingAction(storage, 'bob', now).attempt!.title, 'bob copy')
  assert.equal(readPendingAction(storage, 'a:b', now).attempt!.title, 'colon')
  assert.equal(readPendingAction(storage, 'a%3Ab', now).attempt!.title, 'percent')
  assert.equal(storage.values.get('guigong:theme'), 'dark')
})

test('ordinary missing records have no notice', () => {
  const storage = new MemoryStorage()
  assert.deepEqual(readPendingAction(storage, 'alice', now), { attempt: null })
  assert.deepEqual(removePendingAction(storage, 'alice'), { ok: true })
})

for (const [name, invalid] of [
  ['foreign user', record({ userId: 'bob' })],
  ['unknown schema version', record({ schemaVersion: 2 })],
  ['unknown record fields', { ...record(), Cookie: 'never restore' }],
  ['unknown action fields', record({ attempt: { ...attempt(), password: 'never restore' } })],
  ['missing action', record({ attempt: null })],
  ['invalid timestamp', record({ updatedAt: null })],
  ['unsupported action', record({ attempt: { ...attempt(), action: 'delete' } })],
  ['unsafe resource', record({ attempt: attempt({ id: '../foreign' }) })],
  ['invalid key', record({ attempt: attempt({ key: 'unstable' }) })],
] as const) {
  test(`discards an owned record with ${name} and leaves the other account intact`, () => {
    const storage = new MemoryStorage()
    storage.values.set(storageKey('alice'), JSON.stringify(invalid))
    storage.values.set(storageKey('bob'), 'other account data')
    const result = readPendingAction(storage, 'alice', now)
    assert.equal(result.attempt, null)
    assert.ok(result.notice)
    assert.equal(storage.values.has(storageKey('alice')), false)
    assert.equal(storage.values.get(storageKey('bob')), 'other account data')
    assert.deepEqual(storage.reads, [storageKey('alice')])
    assert.deepEqual(storage.removals, [storageKey('alice')])
  })
}

test('corrupt JSON is ignored and safely removed', () => {
  const storage = new MemoryStorage()
  storage.values.set(storageKey('alice'), '{')
  const result = readPendingAction(storage, 'alice', now)
  assert.equal(result.attempt, null)
  assert.ok(result.notice)
  assert.equal(storage.values.size, 0)
})

test('expires at seven days and accepts only five minutes of future clock skew', () => {
  const storage = new MemoryStorage()
  for (const [updatedAt, recoverable] of [[now - 7 * day, false], [now - 7 * day + 1, true], [now + 300_000, true], [now + 300_001, false]] as const) {
    storage.values.set(storageKey('alice'), JSON.stringify(record({ updatedAt })))
    const result = readPendingAction(storage, 'alice', now)
    assert.equal(result.attempt !== null, recoverable)
    assert.equal(storage.values.has(storageKey('alice')), recoverable)
    if (!recoverable) assert.ok(result.notice)
  }
})

for (const [name, changes] of [
  ['empty title', { title: '' }], ['long title', { title: 'a'.repeat(81) }], ['NUL title', { title: 'a\u0000b' }],
  ['empty id', { id: '' }], ['long id', { id: 'a'.repeat(129) }], ['path id', { id: '../bob' }], ['newline id', { id: 'demo\n' }],
  ['zero version', { version: 0 }], ['fractional version', { version: 1.5 }], ['unsafe version', { version: Number.MAX_SAFE_INTEGER + 1 }],
  ['invalid key', { key: 'not-a-uuid' }], ['unknown metadata', { token: 'forbidden' }],
] as const) {
  test(`rejects ${name} before replacing the recoverable action`, () => {
    const storage = new MemoryStorage()
    storage.values.set(storageKey('alice'), JSON.stringify(record()))
    const result = writePendingAction(storage, 'alice', { ...attempt(), ...changes }, now)
    assert.equal(result.ok, false)
    assert.ok(result.notice)
    assert.deepEqual(readPendingAction(storage, 'alice', now).attempt, attempt())
  })
}

test('enforces the serialized UTF-8 size boundary before restoring', () => {
  const storage = new MemoryStorage()
  const serialized = JSON.stringify(record({ attempt: attempt({ title: '中'.repeat(80) }) }))
  const bytes = new TextEncoder().encode(serialized).length
  storage.values.set(storageKey('alice'), serialized + ' '.repeat(4096 - bytes))
  assert.equal(readPendingAction(storage, 'alice', now).attempt!.title, '中'.repeat(80))
  const oversized = serialized + ' '.repeat(4097 - bytes)
  assert.ok(oversized.length < 4096)
  storage.values.set(storageKey('alice'), oversized)
  const result = readPendingAction(storage, 'alice', now)
  assert.equal(result.attempt, null)
  assert.ok(result.notice)
  assert.equal(storage.values.size, 0)
})

test('quota failure preserves the previous key and original immutable action', () => {
  const storage = new MemoryStorage()
  assert.equal(writePendingAction(storage, 'alice', attempt(), now).ok, true)
  storage.failure = 'set'
  const result = writePendingAction(storage, 'alice', attempt({ title: 'new attempt', version: 4 }), now + 1)
  assert.equal(result.ok, false)
  assert.ok(result.notice)
  assert.deepEqual(readPendingAction(storage, 'alice', now + 1).attempt, attempt())
})

test('unavailable storage explicitly reports every operation without throwing', () => {
  assert.ok(readPendingAction(undefined, 'alice', now).notice)
  assert.equal(readPendingAction(undefined, 'alice', now).attempt, null)
  assert.equal(writePendingAction(undefined, 'alice', attempt(), now).ok, false)
  assert.ok(writePendingAction(undefined, 'alice', attempt(), now).notice)
  assert.equal(removePendingAction(undefined, 'alice').ok, false)
  assert.ok(removePendingAction(undefined, 'alice').notice)
})

test('read, remove and corrupt-record cleanup handle security exceptions with notices', () => {
  const storage = new MemoryStorage()
  storage.values.set(storageKey('alice'), '{')
  storage.failure = 'get'
  assert.equal(readPendingAction(storage, 'alice', now).attempt, null)
  assert.ok(readPendingAction(storage, 'alice', now).notice)
  storage.failure = 'remove'
  assert.equal(readPendingAction(storage, 'alice', now).attempt, null)
  assert.ok(readPendingAction(storage, 'alice', now).notice)
  assert.equal(removePendingAction(storage, 'alice').ok, false)
  assert.ok(removePendingAction(storage, 'alice').notice)
  assert.equal(storage.values.get(storageKey('alice')), '{')
})

test('invalid identities and clocks never access or overwrite storage', () => {
  const storage = new MemoryStorage()
  for (const userId of ['', 'alice\n', '\uD800', 'a'.repeat(129), undefined as unknown as string]) {
    assert.equal(readPendingAction(storage, userId, now).attempt, null)
    assert.ok(readPendingAction(storage, userId, now).notice)
    assert.equal(writePendingAction(storage, userId, attempt(), now).ok, false)
    assert.equal(removePendingAction(storage, userId).ok, false)
  }
  for (const clock of [Number.NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(readPendingAction(storage, 'alice', clock).attempt, null)
    assert.equal(writePendingAction(storage, 'alice', attempt(), clock).ok, false)
  }
  assert.equal(storage.values.size, 0)
  assert.equal(storage.reads.length, 0)
  assert.equal(storage.removals.length, 0)
})
