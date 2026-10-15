export class ApiError extends Error {
  status: number
  code: string
  constructor(message: string, status = 0, code = 'NETWORK_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type ApiOptions = { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; signal?: AbortSignal }

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  try {
    if (options.signal?.aborted) controller.abort()
    const response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: options.body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    })
    if (response.status === 204) return undefined as T
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new ApiError(data?.error?.message ?? `服务暂时不可用（${response.status}），请稍后重试`, response.status, data?.error?.code ?? 'SERVER_ERROR')
    }
    if (!data) throw new ApiError('服务返回了无法识别的数据，请重试', response.status, 'INVALID_RESPONSE')
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(controller.signal.aborted ? '请求已超时或取消，请重试' : '无法连接后端，请确认服务已启动后重试')
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请重试'
}
