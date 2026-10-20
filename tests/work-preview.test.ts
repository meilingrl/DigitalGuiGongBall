import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { defaultConfigs, type Work } from '../shared/design.js'
import { useWorkPreview } from '../src/composables/useWorkPreview.js'
import type { ApiOptions } from '../src/lib/api.js'

const work = { id: 'saved', version: 2, config: { ...defaultConfigs.ruyi }, title: '如意', description: '', deletedAt: null, createdAt: '', updatedAt: '', inspirationId: 'openwork-rhythm', previewVersion: null } as Work

test('preview uses the acknowledged config and binds upload to its user and version', async () => {
  const scope = effectScope()
  let captured: unknown
  let sent: { path: string; options?: ApiOptions } | undefined
  const previews = scope.run(() => useWorkPreview({
    userId: 'user-a', capture: config => { captured = config; return 'data:image/png;base64,png' },
    request: async (path, options) => { sent = { path, options }; return { work: { ...work, previewVersion: 2 } } },
  }))!
  await previews.store(work)
  assert.deepEqual(captured, work.config)
  assert.equal(sent?.options?.expectedUserId, 'user-a')
  assert.deepEqual(sent?.options?.body, { version: 2, imageDataUrl: 'data:image/png;base64,png' })
  assert.equal(previews.saved.value?.previewVersion, 2)
  scope.stop()
})

test('preview failure is a separate, retryable notice and never reports an image as saved', async () => {
  const scope = effectScope()
  let ready = false
  const previews = scope.run(() => useWorkPreview({
    userId: 'user-a', capture: () => ready ? 'data:image/png;base64,png' : undefined,
    request: async () => { throw new Error('版本已更新') },
  }))!
  await previews.store(work)
  assert.match(previews.notice.value, /作品已保存/)
  assert.equal(previews.saved.value, null)
  ready = true
  await previews.retry()
  assert.match(previews.notice.value, /版本已更新/)
  assert.equal(previews.saved.value, null)
  scope.stop()
})

test('late image acknowledgements cannot replace a newer work preview or an unmounted view', async () => {
  const scope = effectScope()
  const pending: ((value: { work: Work }) => void)[] = []
  const previews = scope.run(() => useWorkPreview({
    userId: 'user-a', capture: () => 'png', request: () => new Promise(resolve => pending.push(resolve)),
  }))!
  const first = previews.store(work)
  const nextWork = { ...work, version: 3 }
  const second = previews.store(nextWork)
  pending[0]!({ work: { ...work, previewVersion: 2 } })
  await first
  assert.equal(previews.saved.value, null)
  scope.stop()
  pending[1]!({ work: { ...nextWork, previewVersion: 3 } })
  await second
  assert.equal(previews.saved.value, null)
})

test('switching documents clears retry intent and ignores the previous image request', async () => {
  const scope = effectScope()
  let finish!: (value: { work: Work }) => void
  let requests = 0
  const previews = scope.run(() => useWorkPreview({ userId: 'user-a', capture: () => 'png', request: () => { requests++; return new Promise(resolve => { finish = resolve }) } }))!
  const pending = previews.store(work)
  previews.reset()
  finish({ work: { ...work, previewVersion: 2 } })
  await pending
  await previews.retry()
  assert.equal(previews.saved.value, null)
  assert.equal(previews.busy.value, false)
  assert.equal(previews.notice.value, '')
  assert.equal(requests, 1)
  scope.stop()
})
