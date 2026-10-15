import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } })
    return
  }
  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? '请检查提交内容' } })
    return
  }
  const type = error && typeof error === 'object' && 'type' in error ? error.type : undefined
  if (type === 'entity.parse.failed') {
    response.status(400).json({ error: { code: 'INVALID_JSON', message: '请求内容不是有效的 JSON' } })
    return
  }
  if (type === 'entity.too.large') {
    response.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: '提交内容过大，请缩短后重试' } })
    return
  }
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined
  if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status < 500) {
    response.status(status).json({
      error: status === 415
        ? { code: 'UNSUPPORTED_MEDIA_TYPE', message: '请求的字符编码或格式不受支持，请使用 UTF-8 JSON' }
        : { code: 'INVALID_REQUEST', message: '请求地址或内容无效，请检查后重试' },
    })
    return
  }
  console.error('[api] Unexpected request error:', error instanceof Error ? error.name : 'Unknown error')
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务暂时无法完成请求，请稍后重试' } })
}
