import { onScopeDispose, ref } from 'vue'
import type { Work } from '../../shared/design'
import { api, ApiError, errorMessage, isDefinitiveWriteRejection, type ApiOptions } from '../lib/api'
import type { StorageLike } from '../lib/drafts'
import { readPendingAction, writePendingAction, removePendingAction, type PendingAction } from '../lib/pending-action'

type Action = 'duplicate' | 'trash' | 'restore'
type State = 'active' | 'trash'
interface Pagination { page: number; pageSize: number; total: number; totalPages: number }
interface Options { userId: string; storage?: StorageLike; request?: (url: string, options?: ApiOptions) => Promise<unknown> }

export function useWorkCollection(options: Options) {
  const request = options.request ?? api
  const works = ref<Work[]>([])
  const search = ref('')
  const state = ref<State>('active')
  const pagination = ref<Pagination>({ page: 1, pageSize: 12, total: 0, totalPages: 0 })
  const loading = ref(true)
  const error = ref('')
  const expired = ref(false)
  const busy = ref(false)
  const recovered = readPendingAction(options.storage, options.userId)
  const pendingAction = ref<PendingAction | null>(recovered.attempt)
  const actionError = ref(recovered.attempt ? '发现此账号上次未确认的操作，请重试确认原请求。' : '')
  const recoveryNotice = ref(recovered.notice ?? '')
  const notice = ref('')
  const copiedId = ref('')
  let sequence = 0
  let disposed = false

  function clearAttempt() {
    const result = removePendingAction(options.storage, options.userId)
    recoveryNotice.value = result.notice ?? ''
    pendingAction.value = null
  }

  async function load() {
    if (disposed) return
    const current = ++sequence
    loading.value = true; error.value = ''; expired.value = false
    const query = new URLSearchParams({ search: search.value, state: state.value, page: String(pagination.value.page), pageSize: String(pagination.value.pageSize) })
    try {
      const data = await request(`/api/works?${query}`, { expectedUserId: options.userId }) as { works: Work[]; pagination: Pagination }
      if (current !== sequence || disposed) return
      // Removing the last item on a page should reveal the previous page rather
      // than claim the account is empty. The follow-up is bounded to one clamp.
      if (data.pagination.page > Math.max(1, data.pagination.totalPages)) {
        pagination.value.page = Math.max(1, data.pagination.totalPages)
        await load()
        return
      }
      works.value = data.works
      pagination.value = data.pagination
    } catch (cause) {
      if (current === sequence && !disposed) {
        error.value = errorMessage(cause)
        expired.value = cause instanceof ApiError && cause.status === 401
      }
    } finally { if (current === sequence && !disposed) loading.value = false }
  }
  async function submitSearch() { pagination.value.page = 1; await load() }
  async function setState(next: State) { state.value = next; pagination.value.page = 1; await load() }
  async function goTo(page: number) {
    if (loading.value || page < 1 || page > pagination.value.totalPages) return
    pagination.value.page = page
    await load()
  }
  async function retryAction() {
    const attempt = pendingAction.value
    if (!attempt || busy.value || disposed) return
    busy.value = true; actionError.value = ''; notice.value = ''; copiedId.value = ''
    const persisted = writePendingAction(options.storage, options.userId, attempt)
    recoveryNotice.value = persisted.notice ?? ''
    try {
      const result = await request(`/api/works/${encodeURIComponent(attempt.id)}/${attempt.action}`, {
        method: 'POST', body: { version: attempt.version }, idempotencyKey: attempt.key, expectedUserId: options.userId,
      }) as { work: Work }
      if (disposed) return
      clearAttempt()
      const actionText = { duplicate: '已复制为独立作品', trash: '已移入回收站，可随时恢复', restore: '已恢复到我的作品' }
      notice.value = `${attempt.title} · ${actionText[attempt.action]}`
      if (attempt.action === 'duplicate') copiedId.value = result.work.id
      await load()
    } catch (cause) {
      if (disposed) return
      actionError.value = errorMessage(cause)
      if (isDefinitiveWriteRejection(cause)) clearAttempt()
      expired.value = cause instanceof ApiError && cause.status === 401
    } finally { if (!disposed) busy.value = false }
  }
  async function mutate(work: Work, action: Action) {
    if (busy.value || pendingAction.value || disposed) return
    pendingAction.value = { id: work.id, title: work.title, version: work.version, action, key: crypto.randomUUID() }
    await retryAction()
  }
  onScopeDispose(() => { disposed = true; sequence++ })
  return { works, search, state, pagination, loading, error, expired, busy, pendingAction, actionError, recoveryNotice, notice, copiedId, load, submitSearch, setState, goTo, mutate, retryAction }
}
