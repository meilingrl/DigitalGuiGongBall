import { computed, onScopeDispose, ref, watch } from 'vue'
import { defaultConfigs, templates, type DesignConfig, type Work } from '../../shared/design'
import { api, ApiError, errorMessage, isDefinitiveWriteRejection, type ApiOptions } from '../lib/api'
import { cloneDesign } from '../lib/draft'
import { readDraft, removeDraft, writeDraft, type DraftRecord, type PendingSave, type StorageLike } from '../lib/drafts'

type Source = { workId?: string; templateId?: string }
type WorkRequest = (path: string, options?: ApiOptions) => Promise<{ work: Work }>
interface Options {
  userId: string
  source(): Source
  replaceWorkId(id: string): Promise<void>
  request?: WorkRequest
  storage?: StorageLike
  now?: () => number
}

// Owns the document lifecycle independently of the renderer and router. A recovery
// record is device-only; only an acknowledged HTTP response advances the baseline.
export function useAtelierDocument(options: Options) {
  const request: WorkRequest = options.request ?? api
  const now = options.now ?? Date.now
  const config = ref<DesignConfig>(cloneDesign(defaultConfigs.linglong))
  const title = ref('')
  const description = ref('')
  const work = ref<Work | null>(null)
  const baseVersion = ref<number | null>(null)
  const loading = ref(true)
  const loadError = ref('')
  const saveError = ref('')
  const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
  const baseline = ref('')
  const conflict = ref(false)
  const expired = ref(false)
  const redirecting = ref(false)
  const draftNotice = ref('')
  const localDraftAt = ref<number | null>(null)
  const recovery = ref<DraftRecord | null>(null)
  const pendingSave = ref<PendingSave | null>(null)
  const snapshot = computed(() => JSON.stringify({ title: title.value, description: description.value, config: config.value }))
  const dirty = computed(() => !loading.value && !loadError.value && (snapshot.value !== baseline.value || pendingSave.value !== null))
  const target = computed(() => work.value ? `work:${work.value.id}` : `new:${config.value.templateId}`)
  let generation = 0
  let applying = false
  let disposed = false
  let retentionNotice = ''

  function remove(targetKey: string) {
    const result = removeDraft(options.storage, options.userId, targetKey)
    if (!result.ok) draftNotice.value = result.notice ?? '未能移除此设备草稿'
    return result.ok
  }

  function persistDraft() {
    if (disposed || loading.value || loadError.value || recovery.value || applying) return false
    if (!dirty.value) {
      if (remove(target.value)) localDraftAt.value = null
      return true
    }
    const updatedAt = now()
    const result = writeDraft(options.storage, {
      schemaVersion: 1, userId: options.userId, target: target.value,
      title: title.value, description: description.value, config: config.value,
      baseVersion: baseVersion.value, updatedAt, pendingSave: pendingSave.value,
    }, updatedAt)
    if (result.ok) {
      localDraftAt.value = updatedAt
      // Successful storage can still prune older recovery records. Keep that
      // notice visible through subsequent keystrokes rather than swallowing it.
      if (result.notice) retentionNotice = result.notice
      draftNotice.value = retentionNotice
    }
    else draftNotice.value = result.notice ?? '无法保存此设备草稿，请尽快保存到服务端或下载配置'
    return result.ok
  }

  async function load(discard = false) {
    if (disposed) return
    if (discard) remove(target.value)
    else persistDraft()
    const current = ++generation
    loading.value = true; loadError.value = ''; saveError.value = ''; saveState.value = 'idle'
    conflict.value = false; expired.value = false; pendingSave.value = null; recovery.value = null
    localDraftAt.value = null; draftNotice.value = ''; retentionNotice = ''
    try {
      const source = options.source()
      if (source.workId) {
        const result = await request(`/api/works/${encodeURIComponent(source.workId)}`, { expectedUserId: options.userId })
        if (current !== generation) return
        work.value = result.work
        title.value = result.work.title; description.value = result.work.description
        config.value = cloneDesign(result.work.config)
        baseVersion.value = result.work.version
      } else {
        const chosen = templates.find(item => item.id === source.templateId) ?? templates[0]
        work.value = null; baseVersion.value = null
        title.value = `${chosen.name} · 我的创作`; description.value = ''
        config.value = cloneDesign(chosen.config)
      }
      baseline.value = snapshot.value
      const stored = readDraft(options.storage, options.userId, target.value, now())
      recovery.value = stored.draft
      draftNotice.value = stored.notice ?? ''
    } catch (cause) {
      if (current === generation) {
        loadError.value = errorMessage(cause)
        expired.value = cause instanceof ApiError && cause.status === 401
      }
    } finally { if (current === generation) loading.value = false }
  }

  function restoreDraft() {
    const record = recovery.value
    if (!record || disposed) return
    applying = true
    title.value = record.title; description.value = record.description
    config.value = cloneDesign(record.config)
    baseVersion.value = record.baseVersion
    pendingSave.value = record.pendingSave
    localDraftAt.value = record.updatedAt
    recovery.value = null
    if (work.value && baseVersion.value !== work.value.version && !pendingSave.value) {
      conflict.value = true
      saveError.value = `此设备草稿基于 v${baseVersion.value}，服务端已是 v${work.value.version}。可先下载配置，再读取最新版本；不会覆盖服务端更新。`
    }
    applying = false
    persistDraft()
  }

  function discardDraft() {
    if (disposed) return
    if (remove(target.value)) { recovery.value = null; localDraftAt.value = null }
  }

  async function save() {
    if (disposed || loading.value || loadError.value || recovery.value || saveState.value === 'saving' || !title.value.trim() || conflict.value) return
    const current = generation
    const oldTarget = target.value
    const creating = work.value === null
    saveError.value = ''; expired.value = false; saveState.value = 'saving'
    // Keep the exact payload and key until the response is certain, including
    // across a reload. Editing during a retry never changes the original attempt.
    if (!pendingSave.value) {
      pendingSave.value = {
        key: crypto.randomUUID(), method: work.value ? 'PUT' : 'POST',
        path: work.value ? `/api/works/${encodeURIComponent(work.value.id)}` : '/api/works',
        body: { title: title.value.trim(), description: description.value.trim(), config: cloneDesign(config.value), ...(work.value ? { version: baseVersion.value! } : {}) },
        snapshot: snapshot.value,
      }
    }
    const attempt = pendingSave.value
    persistDraft()
    try {
      const result = await request(attempt.path, { method: attempt.method, body: attempt.body, idempotencyKey: attempt.key, expectedUserId: options.userId })
      if (current !== generation || disposed) return
      applying = true
      work.value = result.work
      baseVersion.value = result.work.version
      baseline.value = attempt.snapshot
      if (snapshot.value === attempt.snapshot) {
        title.value = result.work.title; description.value = result.work.description
        config.value = cloneDesign(result.work.config)
        baseline.value = snapshot.value
      }
      pendingSave.value = null
      saveState.value = 'saved'
      applying = false
      // When a first save receives an id, migrate any newer local edits before
      // removing the old recovery key. A failed write leaves the old copy intact.
      const persisted = persistDraft()
      if (oldTarget !== target.value && (!dirty.value || persisted)) remove(oldTarget)
      if (creating) {
        redirecting.value = true
        try { await options.replaceWorkId(result.work.id) }
        finally { if (current === generation && !disposed) redirecting.value = false }
      }
    } catch (cause) {
      if (current !== generation || disposed) return
      applying = false
      saveState.value = 'idle'; saveError.value = errorMessage(cause)
      conflict.value = cause instanceof ApiError && cause.status === 409
      expired.value = cause instanceof ApiError && cause.status === 401
      // A rejected payload/state ends this attempt. Authentication and other
      // preflight gates leave an earlier unknown commit unresolved.
      if (isDefinitiveWriteRejection(cause)) pendingSave.value = null
      persistDraft()
    }
  }

  watch(() => config.value.layers, layers => { if (config.value.activeLayer > layers) config.value.activeLayer = 0 }, { flush: 'sync' })
  watch(snapshot, () => {
    if (applying || loading.value) return
    if (saveState.value === 'saved') saveState.value = 'idle'
    persistDraft()
  }, { flush: 'sync' })
  onScopeDispose(() => { persistDraft(); disposed = true; generation++ })
  return {
    config, title, description, work, loading, loadError, saveError, saveState, baseline,
    conflict, expired, redirecting, dirty, recovery, draftNotice, localDraftAt, pendingSave,
    load, save, restoreDraft, discardDraft, persistDraft,
  }
}
