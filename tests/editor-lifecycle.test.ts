import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { computed, effectScope, nextTick, reactive, ref, watch, type Ref } from 'vue'
import { defaultConfigs, templates, type DesignConfig, type Work } from '../shared/design.js'
import { ApiError, errorMessage } from '../src/lib/api.js'
import { cloneDesign } from '../src/lib/draft.js'

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

// Execute the real SFC setup script, rather than a copied save implementation.
// Only external I/O, router/lifecycle integration, and unrelated app stores are injected.
const { descriptor, errors } = parse(readFileSync(new URL('../src/views/AtelierView.vue', import.meta.url), 'utf8'))
assert.deepEqual(errors, [])
assert.ok(descriptor.scriptSetup)
const source = ts.createSourceFile('AtelierView.ts', descriptor.scriptSetup.content, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)
const withoutImports = ts.factory.updateSourceFile(source, source.statements.filter(statement => !ts.isImportDeclaration(statement)))
const setupScript = ts.transpileModule(ts.createPrinter().printFile(withoutImports), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText

const originalWork: Work = {
  id: 'existing-work', title: '已保存作品', description: '', config: cloneDesign(defaultConfigs.linglong),
  version: 1, createdAt: '2026-10-16T00:00:00.000Z', updatedAt: '2026-10-16T00:00:00.000Z',
}

async function createEditor(existing: boolean) {
  const scope = effectScope()
  const unmountHooks: Array<() => void> = []
  const navigations: string[] = []
  const route = reactive({
    params: existing ? { id: originalWork.id } as Record<string, string> : {} as Record<string, string>,
    query: {} as Record<string, string>,
  })
  const mutations: Array<{
    path: string
    method: string
    body: { title: string; description: string; config: DesignConfig; version?: number }
    resolve(value: { work: Work }): void
    reject(reason: Error): void
  }> = []
  let reads = 0
  const api = (path: string, options?: { method: string; body: typeof mutations[number]['body'] }) => {
    if (!options) { reads++; return Promise.resolve({ work: structuredClone(originalWork) }) }
    return new Promise<{ work: Work }>((resolve, reject) => {
      mutations.push({ path, method: options.method, body: options.body, resolve, reject })
    })
  }
  const bindings = {
    computed, ref, watch,
    onBeforeUnmount: (callback: () => void) => unmountHooks.push(callback),
    onBeforeRouteLeave: (_callback: () => boolean) => {},
    useRoute: () => route,
    useRouter: () => ({ replace: async (path: string) => {
      navigations.push(path)
      route.params = { id: path.split('/').at(-1)! }
      route.query = {}
      await nextTick()
    } }),
    defaultConfigs, templates, api, ApiError, errorMessage, cloneDesign,
    useAppStore: () => ({ theme: 'light' }),
    window: { addEventListener() {}, removeEventListener() {}, confirm: () => true },
  }
  const runSetup = new Function(...Object.keys(bindings), `${setupScript}\nreturn { save, load, title, description, config, work, baseline, loading, loadError, saveError, saveState, conflict, expired, dirty };`)
  const editor = scope.run(() => runSetup(...Object.values(bindings))) as Editor
  await nextTick()
  assert.equal(editor.loading.value, false)
  assert.equal(editor.dirty.value, false)
  return {
    editor, mutations, navigations,
    reads: () => reads,
    unmount() {
      for (const hook of unmountHooks) hook()
      scope.stop()
      // Vue Router's reactive current route continues updating after this view leaves.
      route.params = {}
      route.query = {}
    },
    settleSuccess() {
      assert.equal(mutations.length, 1)
      const mutation = mutations[0]!
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
