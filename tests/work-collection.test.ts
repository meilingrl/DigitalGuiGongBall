import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { defaultConfigs, type Work } from '../shared/design.js'
import { ApiError, type ApiOptions } from '../src/lib/api.js'
import { useWorkCollection } from '../src/composables/useWorkCollection.js'
const work: Work = { id: 'a-work', title: '作品', description: '', config: defaultConfigs.linglong, version: 1, deletedAt: null, createdAt: '', updatedAt: '' }
const page = (total = 1) => ({ works: [work], pagination: { page: 1, pageSize: 12, total, totalPages: Math.ceil(total / 12) } })

test('collection sends real search, state and pagination parameters and resets page when filtering', async () => {
  const urls: string[] = []
  const scope = effectScope()
  const model = scope.run(() => useWorkCollection({ userId: 'user-a', request: async url => { urls.push(url); return page(30) } }))!
  try {
    await model.load(); await model.goTo(2)
    assert.ok(urls[1]!.includes('page=2'))
    model.search.value = '如意 & 莲'
    await model.submitSearch()
    assert.ok(urls[2]!.includes('search=%E5%A6%82%E6%84%8F+%26+%E8%8E%B2'))
    assert.equal(model.pagination.value.page, 1)
    await model.setState('trash')
    assert.ok(urls[3]!.includes('state=trash'))
  } finally { scope.stop() }
})

test('ambiguous copy retries use the original key and version and only show success after acknowledgment', async () => {
  const calls: ApiOptions[] = []
  let fail = true
  const scope = effectScope()
  const model = scope.run(() => useWorkCollection({ userId: 'user-a', request: async (_url, options) => {
    if (!options?.method) return page()
    calls.push(options)
    if (fail) throw new ApiError('网络中断')
    return { work: { ...work, id: 'copy-id' } }
  } }))!
  try {
    await model.mutate(work, 'duplicate')
    assert.equal(model.notice.value, '')
    assert.ok(model.pendingAction.value)
    assert.ok(model.actionError.value)
    fail = false
    await model.retryAction()
    assert.equal(calls[0]!.idempotencyKey, calls[1]!.idempotencyKey)
    assert.deepEqual(calls[0]!.body, { version: 1 })
    assert.deepEqual(calls[1]!.body, { version: 1 })
    assert.equal(model.pendingAction.value, null)
    assert.equal(model.copiedId.value, 'copy-id')
    assert.ok(model.notice.value.includes('复制'))
  } finally { scope.stop() }
})

test('a definitive version conflict clears pending action and never pretends a trash operation succeeded', async () => {
  const scope = effectScope()
  const model = scope.run(() => useWorkCollection({ userId: 'user-a', request: async () => { throw new ApiError('版本冲突', 409, 'VERSION_CONFLICT') } }))!
  try {
    await model.mutate(work, 'trash')
    assert.equal(model.pendingAction.value, null)
    assert.equal(model.actionError.value, '版本冲突')
    assert.equal(model.notice.value, '')
  } finally { scope.stop() }
})

test('out-of-order list responses cannot replace the current filter results', async () => {
  const resolves: Array<(value: unknown) => void> = []
  const scope = effectScope()
  const model = scope.run(() => useWorkCollection({ userId: 'user-a', request: () => new Promise(resolve => resolves.push(resolve)) }))!
  try {
    const old = model.load()
    const current = model.setState('trash')
    resolves[1]!({ ...page(), works: [{ ...work, id: 'trash-work' }] })
    await current
    resolves[0]!(page())
    await old
    assert.equal(model.works.value[0]!.id, 'trash-work')
  } finally { scope.stop() }
})

test('late action acknowledgment after leaving does not mutate collection state', async () => {
  let resolveAction!: (value: unknown) => void
  const scope = effectScope()
  const model = scope.run(() => useWorkCollection({ userId: 'user-a', request: () => new Promise(resolve => { resolveAction = resolve }) }))!
  const saving = model.mutate(work, 'restore')
  scope.stop()
  resolveAction({ work })
  await saving
  assert.equal(model.notice.value, '')
})

test('a pending copy survives leaving and reopening with the same immutable request', async () => {
  const values = new Map<string, string>()
  const storage = { get length() { return values.size }, key: (i: number) => [...values.keys()][i] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  const calls: ApiOptions[] = []
  let fail = true
  const request = async (_url: string, options?: ApiOptions) => {
    if (!options?.method) return page()
    calls.push(options)
    if (fail) throw new ApiError('复制已提交，响应丢失')
    return { work: { ...work, id: 'confirmed-copy' } }
  }
  let scope = effectScope()
  let model = scope.run(() => useWorkCollection({ userId: 'user-a', storage, request }))!
  await model.mutate(work, 'duplicate')
  scope.stop()
  scope = effectScope()
  model = scope.run(() => useWorkCollection({ userId: 'user-a', storage, request }))!
  try {
    assert.equal(model.pendingAction.value?.id, work.id)
    fail = false
    await model.retryAction()
    assert.equal(calls[0]!.idempotencyKey, calls[1]!.idempotencyKey)
    assert.equal(values.size, 0)
  } finally { scope.stop() }
})
