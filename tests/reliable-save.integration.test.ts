import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { workFixture, workInput } from '../server/tests/work-fixture.js'
import { useAtelierDocument } from '../src/composables/useAtelierDocument.js'
import { ApiError, type ApiOptions } from '../src/lib/api.js'

class DeviceStorage {
  data = new Map<string, string>()
  get length() { return this.data.size }
  key(i: number) { return [...this.data.keys()][i] ?? null }
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, value) }
  removeItem(key: string) { this.data.delete(key) }
}

for (const existing of [false, true]) {
  test(`real HTTP ${existing ? 'PUT' : 'POST'} commit with lost response survives editor and backend restart without duplicating`, async t => {
    const f = await workFixture(t)
    const cookie = await f.signup()
    const user = (await f.request('/api/auth/me', { cookie })).data.user
    const initial = existing ? (await f.request('/api/works', { method: 'POST', body: workInput, cookie })).data.work : null
    let loseNextResponse = true
    const request = async (path: string, options?: ApiOptions) => {
      const response = await f.request(path, { method: options?.method, body: options?.body, cookie, key: options?.idempotencyKey })
      if (response.status >= 400) throw new ApiError(response.data.error.message, response.status, response.data.error.code)
      // Fault is injected after a real HTTP response has been read. The actual
      // server has committed; the document must act as if the response was lost.
      if (options && loseNextResponse) { loseNextResponse = false; throw new ApiError('Injected lost response after commit') }
      return response.data
    }
    const storage = new DeviceStorage()
    let scope = effectScope()
    const options = { userId: user.id, storage, request, source: () => existing ? { workId: initial.id } : { templateId: 'linglong' }, replaceWorkId: async (_id: string) => {} }
    let doc = scope.run(() => useAtelierDocument(options))!
    await doc.load()
    doc.title.value = '已经提交但响应丢失'
    await doc.save()
    assert.ok(doc.pendingSave.value)
    assert.equal(doc.saveState.value, 'idle')
    doc.title.value = '响应丢失后继续编辑'
    scope.stop()
    await f.restart()
    scope = effectScope()
    doc = scope.run(() => useAtelierDocument(options))!
    try {
      await doc.load()
      assert.ok(doc.recovery.value)
      doc.restoreDraft()
      await doc.save()
      assert.equal(doc.saveError.value, '')
      assert.equal(doc.work.value!.title, '已经提交但响应丢失')
      assert.equal(doc.work.value!.version, existing ? 2 : 1)
      assert.equal(doc.title.value, '响应丢失后继续编辑')
      assert.equal(doc.dirty.value, true)
      const listing = (await f.request('/api/works', { cookie })).data
      assert.equal(listing.pagination.total, 1)
      await doc.save()
      assert.equal(doc.work.value!.version, existing ? 3 : 2)
      assert.equal(doc.work.value!.title, '响应丢失后继续编辑')
      assert.equal(doc.dirty.value, false)
    } finally { scope.stop() }
  })
}

test('real HTTP copy commits once when its response is lost and the collection is reopened after restart', async t => {
  const { useWorkCollection } = await import('../src/composables/useWorkCollection.js')
  const f = await workFixture(t)
  const cookie = await f.signup()
  const user = (await f.request('/api/auth/me', { cookie })).data.user
  const work = (await f.request('/api/works', { method: 'POST', body: workInput, cookie })).data.work
  let lose = true
  const request = async (path: string, options?: ApiOptions) => {
    const response = await f.request(path, { method: options?.method, body: options?.body, cookie, key: options?.idempotencyKey })
    if (response.status >= 400) throw new ApiError(response.data.error.message, response.status, response.data.error.code)
    if (options && lose) { lose = false; throw new ApiError('Injected lost copy response after commit') }
    return response.data
  }
  const storage = new DeviceStorage()
  let scope = effectScope()
  let model = scope.run(() => useWorkCollection({ userId: user.id, storage, request }))!
  await model.mutate(work, 'duplicate')
  assert.ok(model.pendingAction.value)
  assert.equal((await f.request('/api/works', { cookie })).data.pagination.total, 2)
  scope.stop()
  await f.restart()
  scope = effectScope()
  model = scope.run(() => useWorkCollection({ userId: user.id, storage, request }))!
  try {
    assert.ok(model.pendingAction.value)
    await model.retryAction()
    assert.equal(model.pendingAction.value, null)
    assert.ok(model.copiedId.value)
    assert.equal((await f.request('/api/works', { cookie })).data.pagination.total, 2)
  } finally { scope.stop() }
})

for (const operation of ['create', 'update', 'copy'] as const) {
  test(`${operation} retains an unknown committed attempt through 401 and confirms it after same-account login`, async t => {
    const { useWorkCollection } = await import('../src/composables/useWorkCollection.js')
    const f = await workFixture(t)
    let cookie = await f.signup()
    const user = (await f.request('/api/auth/me', { cookie })).data.user
    const original = operation === 'create' ? null : (await f.request('/api/works', { method: 'POST', body: workInput, cookie })).data.work
    let lose = true
    const request = async (path: string, options?: ApiOptions) => {
      const response = await f.request(path, { method: options?.method, body: options?.body, cookie, key: options?.idempotencyKey })
      if (response.status >= 400) throw new ApiError(response.data.error.message, response.status, response.data.error.code)
      if (options && lose) { lose = false; throw new ApiError('Injected lost response') }
      return response.data
    }
    const storage = new DeviceStorage()
    let scope = effectScope()
    const editorOptions = { userId: user.id, storage, request, source: () => operation === 'update' ? { workId: original.id } : { templateId: 'linglong' }, replaceWorkId: async (_id: string) => {} }
    let editor = operation !== 'copy' ? scope.run(() => useAtelierDocument(editorOptions))! : null
    let collection = operation === 'copy' ? scope.run(() => useWorkCollection({ userId: user.id, storage, request }))! : null
    if (editor) { await editor.load(); editor.title.value = '需要跨登录确认'; await editor.save() }
    else await collection!.mutate(original, 'duplicate')
    const attemptKey = editor?.pendingSave.value?.key ?? collection!.pendingAction.value?.key
    assert.ok(attemptKey)
    await f.request('/api/auth/logout', { method: 'POST', cookie })
    if (editor) await editor.save()
    else await collection!.retryAction()
    assert.equal(editor?.expired.value ?? collection!.expired.value, true)
    assert.equal(editor?.pendingSave.value?.key ?? collection?.pendingAction.value?.key, attemptKey, '401 denies confirmation; it cannot disprove the earlier commit')
    scope.stop()
    const login = await f.request('/api/auth/login', { method: 'POST', body: { username: 'artisan', password: 'test-pass-123' } })
    cookie = login.headers.get('set-cookie')!.split(';')[0]!
    scope = effectScope()
    try {
      if (operation === 'copy') {
        collection = scope.run(() => useWorkCollection({ userId: user.id, storage, request }))!
        assert.equal(collection.pendingAction.value!.key, attemptKey)
        await collection.retryAction()
        assert.equal(collection.pendingAction.value, null)
      } else {
        editor = scope.run(() => useAtelierDocument(editorOptions))!
        await editor.load(); editor.restoreDraft()
        assert.equal(editor.pendingSave.value!.key, attemptKey)
        await editor.save()
        assert.equal(editor.pendingSave.value, null)
        assert.equal(editor.work.value!.version, operation === 'update' ? 2 : 1)
      }
      assert.equal((await f.request('/api/works', { cookie })).data.pagination.total, operation === 'copy' ? 2 : 1)
    } finally { scope.stop() }
  })
}
