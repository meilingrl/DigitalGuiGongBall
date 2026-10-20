import { onScopeDispose, ref } from 'vue'
import type { DesignConfig, Work } from '../../shared/design'
import { api, errorMessage, type ApiOptions } from '../lib/api'

interface Options {
  userId: string
  capture(config: DesignConfig): string | undefined
  request?: (path: string, options?: ApiOptions) => Promise<{ work: Work }>
}

/** Image upload is secondary: a missing preview never rolls back a saved design. */
export function useWorkPreview(options: Options) {
  const request: NonNullable<Options['request']> = options.request ?? api
  const notice = ref('')
  const busy = ref(false)
  const saved = ref<Work | null>(null)
  let lastWork: Work | null = null
  let epoch = 0
  let disposed = false

  function reset() {
    epoch++; lastWork = null
    notice.value = ''; busy.value = false; saved.value = null
  }

  async function store(work: Work) {
    if (disposed) return
    lastWork = work
    const current = ++epoch
    busy.value = true; notice.value = ''; saved.value = null
    try {
      const imageDataUrl = options.capture(work.config)
      if (!imageDataUrl) throw new Error('三维预览尚未就绪，请等待加载完成后重试预览。')
      const result = await request(`/api/works/${encodeURIComponent(work.id)}/preview`, {
        method: 'PUT', expectedUserId: options.userId, body: { version: work.version, imageDataUrl },
      })
      if (disposed || current !== epoch) return
      saved.value = result.work
    } catch (cause) {
      if (!disposed && current === epoch) notice.value = `作品已保存；预览暂未更新。${errorMessage(cause)}`
    } finally { if (!disposed && current === epoch) busy.value = false }
  }
  onScopeDispose(() => { disposed = true; epoch++ })
  return { notice, busy, saved, store, reset, retry: () => lastWork ? store(lastWork) : Promise.resolve() }
}
