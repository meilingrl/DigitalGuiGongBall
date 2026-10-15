import type { RequestHandler } from 'express'
import { ApiError } from './errors.js'

export function authRateLimiter(options: { now: () => number; windowMs: number; maxAttempts: number; maxEntries?: number }): RequestHandler {
  const buckets = new Map<string, { attempts: number; expiresAt: number }>()
  const maxEntries = options.maxEntries ?? 10_000
  return (request, response, next) => {
    const now = options.now()
    for (const [key, value] of buckets) if (value.expiresAt <= now) buckets.delete(key)
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown'
    let bucket = buckets.get(key)
    if (!bucket) {
      if (buckets.size >= maxEntries) {
        response.setHeader('Retry-After', Math.ceil(options.windowMs / 1000))
        next(new ApiError(429, 'RATE_LIMITED', '请求过于频繁，请稍后重试'))
        return
      }
      bucket = { attempts: 0, expiresAt: now + options.windowMs }
      buckets.set(key, bucket)
    }
    bucket.attempts++
    if (bucket.attempts > options.maxAttempts) {
      response.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)))
      next(new ApiError(429, 'RATE_LIMITED', '登录或注册尝试过多，请稍后再试'))
      return
    }
    next()
  }
}
