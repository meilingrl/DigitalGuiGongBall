import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, nextTick, type Ref } from 'vue'
import { defaultConfigs, type DesignConfig, type Work } from '../shared/design.js'
import { ApiError } from '../src/lib/api.js'
import { cloneDesign } from '../src/lib/draft.js'
import { useAtelierDocument } from '../src/composables/useAtelierDocument.js'
import type { ApiOptions } from '../src/lib/api.js'

interface Editor {
  save(): Promise<void>
  load(): Promise<void>
  title: Ref<string>
  description: Ref<string>
  config: Ref<DesignConfig>
  work: Ref<Work | null>
  baseline: Ref<string>
  loading: Ref<boolean>
  loadError: Ref<string>
  saveError: Ref<string>
  saveState: Ref<string>
  conflict: Ref<boolean>
  expired: Ref<boolean>
  dirty: Ref<boolean>
}

const originalWork: Work = {
  id: 'existing-work', title: '已保存作品', description: '', config: cloneDesign(defaultConfigs.linglong),
  version: 1, deletedAt: null, createdAt: '2026-10-16T00:00:00.000Z', updatedAt: '2026-10-16T00:00:00.000Z',
}

class MemoryStorage {
  data = new Map<string, string>()
  get length() { return this.data.size }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, value) }
  removeItem(key: string) { this.data.delete(key) }
}

async function createEditor(existing: boolean, storage = new MemoryStorage()) {
  const scope = effectScope()
  const navigations: string[] = []
  const mutations: Array<{
    path: string; method: string; key?: string;
    body: { title: string; description: string; config: DesignConfig; version?: number }
    resolve(value: { work: Work }): void
    reject(reason: Error): void
  }> = []
  let reads = 0
  const request = (path: string, options?: ApiOptions) => {
    if (!options?.method) { reads++; return Promise.resolve({ work: structuredClone(originalWork) }) }
    return new Promise<{ work: Work }>((resolve, reject) => {
      mutations.push({ path, method: options.method!, key: options.idempotencyKey, body: options.body as typeof mutations[number]['body'], resolve, reject })
    })
  }
  const editor = scope.run(() => useAtelierDocument({
    userId: 'user-a', storage, request,
    source: () => existing ? { workId: originalWork.id } : { templateId: 'linglong' },
    replaceWorkId: async id => { navigations.push(`/atelier/${id}`) },
  }))!
  await editor.load()
  assert.equal(editor.loading.value, false)
  assert.equal(editor.dirty.value, false)
  return {
    editor, mutations, navigations, storage,
    reads: () => reads,
    unmount() { scope.stop() },
    settleSuccess(index = 0) {
      const mutation = mutations[index]!
      const { version: _version, ...body } = mutation.body
      mutation.resolve({ work: { ...originalWork, ...body, id: existing ? originalWork.id : 'created-work', version: existing ? 2 : 1 } })
    },
  }
}

function state(editor: Editor) {
  return JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(editor)
    .filter(([, value]) => typeof value !== 'function')
    .map(([key, value]) => [key, value.value]))))
}

for (const existing of [false, true]) {
  const method = existing ? 'PUT' : 'POST'

  test(`${method} retains edits made while saving and leaves them unsaved`, async () => {
    const harness = await createEditor(existing)
    try {
      const { editor } = harness
      editor.title.value = '提交时的名称'
      const saving = editor.save()
      assert.equal(harness.mutations[0]!.method, method)
      editor.title.value = '请求期间继续修改'
      editor.config.value.material = 'jade'
      await nextTick()
      harness.settleSuccess()
      await saving
      await nextTick()
      assert.equal(editor.title.value, '请求期间继续修改')
      assert.equal(editor.config.value.material, 'jade')
      assert.equal(editor.work.value!.title, '提交时的名称')
      assert.equal(editor.work.value!.config.material, 'ivory')
      assert.equal(editor.work.value!.version, existing ? 2 : 1)
      assert.equal(editor.dirty.value, true)
      assert.equal(harness.reads(), existing ? 1 : 0, 'the first-save URL replacement must not reload and discard newer edits')
      assert.deepEqual(harness.navigations, existing ? [] : ['/atelier/created-work'])
    } finally { harness.unmount() }
  })

  for (const status of existing ? [401, 409] : [401]) {
    test(`${method} ${status} keeps the draft dirty and never reports a successful save`, async () => {
      const harness = await createEditor(existing)
      try {
        const { editor } = harness
        editor.title.value = '需要保留的草稿'
        editor.config.value.material = 'bronze'
        const saving = editor.save()
        harness.mutations[0]!.reject(new ApiError('服务端拒绝保存', status))
        await saving
        await nextTick()
        assert.equal(editor.title.value, '需要保留的草稿')
        assert.equal(editor.config.value.material, 'bronze')
        assert.equal(editor.dirty.value, true)
        assert.equal(editor.saveState.value, 'idle')
        assert.equal(editor.saveError.value, '服务端拒绝保存')
        assert.equal(editor.expired.value, status === 401)
        assert.equal(editor.conflict.value, status === 409)
        assert.equal(editor.work.value?.version ?? null, existing ? 1 : null)
        assert.deepEqual(harness.navigations, [])
      } finally { harness.unmount() }
    })
  }

  for (const result of ['success', 'failure'] as const) {
    test(`late ${method} ${result} after unmount does not mutate the editor or navigate`, async () => {
      const harness = await createEditor(existing)
      const { editor } = harness
      editor.title.value = '请求中的作品'
      const saving = editor.save()
      await nextTick()
      harness.unmount()
      const abandoned = state(editor)
      if (result === 'success') harness.settleSuccess()
      else harness.mutations[0]!.reject(new ApiError('登录已过期', 401, 'UNAUTHENTICATED'))
      await saving
      assert.deepEqual(harness.navigations, [], 'a completed request must not undo the user leaving the view')
      assert.deepEqual(state(editor), abandoned, 'neither success nor errors belong to an unmounted editor')
    })
  }

  test(`late ${method} success cannot overwrite an explicitly reloaded editor`, async () => {
    const harness = await createEditor(existing)
    try {
      const { editor } = harness
      editor.title.value = '旧请求中的作品'
      const saving = editor.save()
      await nextTick()
      await editor.load()
      await nextTick()
      const reloaded = state(editor)
      harness.settleSuccess()
      await saving
      assert.deepEqual(state(editor), reloaded)
      assert.deepEqual(harness.navigations, [])
    } finally { harness.unmount() }
  })
}

for (const existing of [false, true]) {
  test(`${existing ? 'PUT' : 'POST'} retries an ambiguous response using the same immutable key and body`, async () => {
    const h = await createEditor(existing)
    try {
      h.editor.title.value = '第一次提交'
      const first = h.editor.save()
      h.mutations[0]!.reject(new ApiError('连接中断'))
      await first
      h.editor.title.value = '断网之后的新修改'
      const retry = h.editor.save()
      assert.ok(h.mutations[0]!.key)
      assert.equal(h.mutations[1]!.key, h.mutations[0]!.key)
      assert.deepEqual(h.mutations[1]!.body, h.mutations[0]!.body)
      h.settleSuccess(1)
      await retry
      assert.equal(h.editor.title.value, '断网之后的新修改')
      assert.equal(h.editor.dirty.value, true)
      assert.equal(h.editor.work.value!.title, '第一次提交')
      const next = h.editor.save()
      assert.notEqual(h.mutations[2]!.key, h.mutations[1]!.key)
      assert.equal(h.mutations[2]!.body.title, '断网之后的新修改')
      assert.equal(h.mutations[2]!.body.version, existing ? 2 : 1)
      h.settleSuccess(2)
      await next
    } finally { h.unmount() }
  })

  test(`${existing ? 'PUT' : 'POST'} offers an owned recovery draft after reload and retries the original attempt`, async () => {
    const h = await createEditor(existing)
    h.editor.title.value = '需要恢复的修改'
    const pending = h.editor.save()
    h.editor.config.value.material = 'bronze'
    h.mutations[0]!.reject(new ApiError('连接中断'))
    await pending
    const key = h.mutations[0]!.key
    h.unmount()
    const recovered = await createEditor(existing, h.storage)
    try {
      assert.ok(recovered.editor.recovery.value)
      assert.notEqual(recovered.editor.title.value, '需要恢复的修改', 'restoring requires explicit user intent')
      recovered.editor.restoreDraft()
      assert.equal(recovered.editor.title.value, '需要恢复的修改')
      assert.equal(recovered.editor.config.value.material, 'bronze')
      assert.equal(recovered.editor.dirty.value, true)
      const retry = recovered.editor.save()
      assert.equal(recovered.mutations[0]!.key, key)
      assert.equal(recovered.mutations[0]!.body.config.material, 'ivory')
      recovered.settleSuccess()
      await retry
      assert.equal(recovered.editor.dirty.value, true)
      assert.equal(recovered.editor.config.value.material, 'bronze')
    } finally { recovered.unmount() }
  })
}

test('a clean acknowledged save removes its device draft and subsequent opening has no recovery offer', async () => {
  const h = await createEditor(true)
  h.editor.title.value = '正式保存'
  const pending = h.editor.save()
  h.settleSuccess()
  await pending
  assert.equal(h.editor.dirty.value, false)
  assert.equal(h.storage.length, 0)
  h.unmount()
  const reopened = await createEditor(true, h.storage)
  assert.equal(reopened.editor.recovery.value, null)
  reopened.unmount()
})

test('device storage failures stay visible while real server saves remain available', async () => {
  const storage = new MemoryStorage()
  storage.setItem = () => { throw new Error('QuotaExceededError') }
  const h = await createEditor(true, storage)
  try {
    h.editor.title.value = '存储空间不足时的作品'
    await nextTick()
    assert.ok(h.editor.draftNotice.value)
    const pending = h.editor.save()
    h.settleSuccess()
    await pending
    assert.equal(h.editor.work.value!.title, '存储空间不足时的作品')
    assert.equal(h.editor.dirty.value, false)
  } finally { h.unmount() }
})

test('the editor keeps retention cleanup visible after evicting a device draft, including later edits', async () => {
  const { writeDraft } = await import('../src/lib/drafts.js')
  const storage = new MemoryStorage()
  const now = Date.now()
  for (let index = 0; index < 20; index++) {
    const title = `旧稿${index}`
    const body = { title, description: '', config: cloneDesign(defaultConfigs.linglong), version: 1 }
    assert.equal(writeDraft(storage, {
      schemaVersion: 1, userId: 'user-a', target: `work:old-${index}`, title,
      description: '', config: cloneDesign(defaultConfigs.linglong), baseVersion: 1,
      updatedAt: now - 20000 + index,
      pendingSave: index === 0 ? { key: '438906ae-6796-4936-afc5-502744c91632', method: 'PUT', path: '/api/works/old-0', body, snapshot: JSON.stringify({ title, description: '', config: body.config }) } : null,
    }, now).ok, true)
  }
  const h = await createEditor(false, storage)
  try {
    h.editor.title.value = '第21份设备草稿'
    assert.match(h.editor.draftNotice.value, /清理|上限/)
    h.editor.description.value = '下一次自动保存不能悄悄抹掉清理通知'
    assert.match(h.editor.draftNotice.value, /清理|上限/)
    assert.equal(storage.length, 20)
  } finally { h.unmount() }
})
